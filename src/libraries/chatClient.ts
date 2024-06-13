import { type RateLimiterRequestOptions } from "@d-fischer/rate-limiter";
import {
  ChatMessage,
  ChatSayMessageAttributes,
  ChatClient as _ChatClient,
} from "@twurple/chat";
import { authProvider } from "~/index";
import { logger } from "~/logger";

export default class ChatClient {
  private static _instance: ChatClient;
  public static get instance(): ChatClient {
    if (!ChatClient._instance) ChatClient._instance = new ChatClient();
    return ChatClient._instance;
  }
  public static destroy(): void {
    if (!ChatClient._instance) return;
    ChatClient._instance.quit();
  }

  private _client: _ChatClient;
  private _listeners: IChatClientListener[];
  private _reconnectId: NodeJS.Timeout;
  private _isRefreshing: boolean;
  private _dirty: boolean;

  public get currentChannels() {
    return this._client.currentChannels;
  }

  private constructor() {
    this._client = new _ChatClient({
      authProvider,
    });
    this._client.onMessage(this.onMessage.bind(this));
    this._client.onConnect(() => {
      logger.debug(1, "ChatClient onConnect");
      this.refreshChannel();
    });
    this._client.onDisconnect((manually) => {
      logger.debug(
        1,
        manually
          ? "ChatClient onDisconnect with manually"
          : "ChatClient onDisconnect",
      );
      if (manually) return;
      this.reconnect();
    });
    this._listeners = [];
    this.reconnect();
  }

  private reconnect() {
    if (this._reconnectId) {
      clearTimeout(this._reconnectId);
      this._reconnectId = null;
    }
    try {
      if (!this._client.isConnected && !this._client.isConnecting)
        this._client.connect();
    } catch (e) {
      logger.error("連線失敗");
      logger.error(e.toString());
    }
    if (!this._client.isConnected)
      this._reconnectId = setTimeout(() => this.reconnect(), 5000);
    else this.refreshChannel();
  }

  private async refreshChannel() {
    if (this._isRefreshing) {
      this._dirty = true;
      return;
    }
    this._isRefreshing = true;
    logger.debug(1, "ChatClient refreshChannel");
    const removeChannels = [...this._client.currentChannels];
    const targetChannels = [];
    for (const listener of this._listeners) {
      try {
        const _channels = listener.getChannel();
        const channels = Array.isArray(_channels) ? _channels : [_channels];
        for (const channel of channels) {
          if (targetChannels.includes(channel)) continue;
          targetChannels.push(`#${channel}`);
          const index = removeChannels.indexOf(channel);
          if (index === -1) continue;
          removeChannels.splice(index, 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (removeChannels.length > 0) {
      for (const channel of removeChannels) this._client.part(channel);
    }
    if (targetChannels.length > 0) {
      await Promise.all(
        targetChannels.map((channel) =>
          this._client
            .join(channel)
            .catch(() => {})
            .then(() => {
              if (this._client.currentChannels.includes(channel)) return;
              this._dirty = true;
            }),
        ),
      );
    }
    if (this._dirty) {
      setTimeout(() => {
        this._dirty = false;
        this._isRefreshing = false;
        this.refreshChannel();
      }, 500);
    } else {
      this._isRefreshing = false;
    }
  }

  private quit() {
    ChatClient._instance = null;
    this._listeners = [];
  }

  private onMessage(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) {
    logger.debug(2, "ChatClient onMessage");
    logger.debug(2, channel);
    logger.debug(2, user);
    logger.debug(2, text);
    logger.debug(3, JSON.stringify(msg));
    for (const listener of this._listeners) {
      try {
        listener.onMessage(channel, user, text, msg);
      } catch (e) {
        console.error(e);
      }
    }
  }

  public register(listener: IChatClientListener) {
    if (this._listeners.includes(listener)) return;
    this._listeners.push(listener);
    this.refreshChannel();
  }

  public unregister(listener: IChatClientListener) {
    const index = this._listeners.indexOf(listener);
    if (index === -1) return;
    this._listeners.splice(index, 1);
    this.refreshChannel();
  }

  public say(
    channel: string,
    text: string,
    attributes?: ChatSayMessageAttributes,
    rateLimiterOptions?: RateLimiterRequestOptions,
  ) {
    return this._client.say(channel, text, attributes, rateLimiterOptions);
  }
}

export interface IChatClientListener {
  getChannel(): string | string[];
  onMessage(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ): void;
}
