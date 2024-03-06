import { ChatClient, ChatMessage } from "@twurple/chat";
import { authProvider } from "~/index";
import BaseModule from "~/modules/base";

export default class LuckModule extends BaseModule {
  private chatClient: ChatClient;

  constructor(target: string) {
    super(target);
  }
  init() {
    this.chatClient = new ChatClient({
      authProvider,
      channels: [this.target.name],
    });
    this.chatClient.onMessage(this.onMessage.bind(this));
    this.chatClient.onDisconnect((manually) => {
      if (manually) return;
      this.chatClient.reconnect();
      this.chatClient.join(this.target.name);
    });
    this.chatClient.connect();
  }
  abort() {
    this.chatClient.quit();
    this.chatClient = null;
  }
  choose() {
    const weight = {
      超吉: 1,
      超級上吉: 1,
      大吉: 1,
      中吉: 7,
      吉: 8,
      小吉: 8,
      末吉: 3,
      沒凶: 1,
      小凶: 1,
      凶: 1,
      很凶: 1,
      大凶: 1,
      你不要知道比較好呢: 1,
      "命運在手中,何必問我": 1,
    };
    const list = Object.keys(weight)
      .map((item) => Array(weight[item]).fill(item))
      .flat(1);
    return list[Math.floor(Math.random() * list.length)];
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (text.startsWith("!運勢 ") || text === "!運勢") {
      const touser = text.substring(4).trim();
      this.chatClient.say(
        this.target.name,
        `關於${
          touser.length > 0 ? `「${touser}」` : "你自己"
        }的運勢: ${this.choose()}`,
        { replyTo: msg },
      );
    }
  }
}
