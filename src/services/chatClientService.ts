import { type RateLimiterRequestOptions } from "@d-fischer/rate-limiter";
import {
  ChatClient,
  ChatMessage,
  ChatSayMessageAttributes,
} from "@twurple/chat";
import { authProvider } from "~/index";
import { LoggerService } from "~/logger";

const logger = new LoggerService("ChatClient", { showConsole: false });

export default class ChatClientService {
  private static _instance: ChatClientService | null = null;
  public static get instance(): ChatClientService {
    if (!ChatClientService._instance)
      ChatClientService._instance = new ChatClientService();
    return ChatClientService._instance;
  }
  public static destroy(): void {
    if (!ChatClientService._instance) return;
    ChatClientService._instance.quit();
  }

  private _client: ChatClient;
  private _listeners: IChatClientListener[];
  private _reconnectId: NodeJS.Timeout | null = null;
  private _isRefreshing: boolean = false;
  private _dirty: boolean = false;

  public get currentChannels() {
    return this._client.currentChannels;
  }

  private constructor() {
    this._client = new ChatClient({
      authProvider,
      rejoinChannelsOnReconnect: true,
    });
    this._client.onMessage(this.onMessage.bind(this));
    this._client.onConnect(() => {
      logger.debug(1, "ChatClientService onConnect");
      this.refreshChannel();
    });
    this._client.onTokenFetchFailure((e) => {
      logger.error("ChatClientService token fetch failure");
      logger.error(e.message);
    });
    this._client.onDisconnect((manually) => {
      logger.debug(
        1,
        manually
          ? "ChatClientService onDisconnect with manually"
          : "ChatClientService onDisconnect",
      );
      if (manually) return;
      this._reconnectId = setTimeout(() => this.reconnect(), 5000);
    });
    this._listeners = [];
    this.reconnect();
  }

  private reconnect() {
    if (this._reconnectId) {
      clearTimeout(this._reconnectId);
      this._reconnectId = null;
    }
    logger.debug(1, "ChatClientService reconnect");
    try {
      if (!this._client.isConnected && !this._client.isConnecting)
        this._client.connect();
    } catch (e) {
      logger.error("連線失敗");
      logger.error(String(e));
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
    logger.debug(1, "ChatClientService refreshChannel.");
    const currentChannels: string[] = [...this._client.currentChannels];
    logger.debug(
      2,
      `ChatClientService current have ${currentChannels.length} channels.`,
    );
    logger.debug(3, currentChannels.join(","));
    const removeChannels: string[] = [...currentChannels];
    const targetChannels: string[] = [];
    for (const listener of this._listeners) {
      try {
        const _channels = listener.getChannel();
        const channels = Array.isArray(_channels) ? _channels : [_channels];
        for (const _channel of channels) {
          const channel = `#${_channel}`;
          if (targetChannels.includes(channel)) continue;

          if (!currentChannels.includes(channel)) targetChannels.push(channel);

          const index = removeChannels.indexOf(channel);
          if (index !== -1) removeChannels.splice(index, 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
    logger.debug(
      2,
      `ChatClientService refreshChannel wait for part ${removeChannels.length} channels.`,
    );
    logger.debug(3, removeChannels.join(","));
    if (removeChannels.length > 0) {
      for (const channel of removeChannels) this._client.part(channel);
    }
    logger.debug(
      2,
      `ChatClientService refreshChannel wait for join ${targetChannels.length} channels.`,
    );
    logger.debug(3, targetChannels.join(","));
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
    logger.debug(1, "ChatClientService refreshChannel done.");
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
    ChatClientService._instance = null;
    this._listeners = [];
  }

  private onMessage(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) {
    logger.debug(5, "ChatClientService onMessage");
    logger.debug(5, channel);
    logger.debug(5, user);
    logger.debug(5, text);
    logger.debug(6, JSON.stringify(msg));
    for (const listener of this._listeners) {
      try {
        if (!listener.getChannel().includes(channel)) continue;
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
  ): void | Promise<void>;
}
