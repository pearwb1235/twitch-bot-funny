import { ChatClient, ChatMessage } from "@twurple/chat";
import { authProvider } from "~/index";
import BaseModule from "~/modules/base";

export default abstract class ChatMoudle extends BaseModule {
  protected chatClient: ChatClient;
  private isJoining: boolean = false;
  private joinChannel() {
    if (this.isJoining) return;
    if (this.chatClient.currentChannels.includes(this.target.name)) return;
    this.isJoining = true;
    if (!this.chatClient.isConnected && !this.chatClient.isConnecting)
      this.chatClient.connect();
    this.chatClient
      .join(this.target.name)
      .catch(() => {})
      .finally(() => {
        this.isJoining = false;
        this.joinChannel();
      });
  }
  init() {
    this.chatClient = new ChatClient({
      authProvider,
    });
    this.chatClient.onMessage(this.onMessage.bind(this));
    this.chatClient.onDisconnect((manually) => {
      if (manually) return;
      this.joinChannel();
    });
    this.joinChannel();
  }
  abort() {
    this.chatClient.quit();
    this.chatClient = null;
  }
  abstract onMessage(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  );
}
