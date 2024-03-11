import { ChatMessage, ChatUser } from "@twurple/chat";
import { twurpleClient } from "~/index";
import ChatMoudle from "~/modules/chat";

export default class RandomBanModule extends ChatMoudle {
  /**
   * 參加關鍵字
   */
  private keyword: string = null;
  /**
   * 參加清單
   */
  private list: ChatUser[] = [];

  constructor(target: string) {
    super(target);
  }
  set(keyword: string) {
    keyword = keyword.trim();
    if (keyword.length < 1) {
      this.chatClient.say(
        this.target.name,
        this.keyword === null
          ? "尚未設定關鍵字"
          : `當前關鍵字為「${this.keyword}」`,
      );
      return;
    }
    if (keyword.length > 100) return;
    if (keyword.startsWith("!")) {
      this.chatClient.say(this.target.name, `關鍵字不能為 ! 開頭`);
      return;
    }
    this.keyword = keyword;
    this.list.length = 0;
    this.chatClient.say(this.target.name, `成功設置關鍵字為「${keyword}」`);
  }
  join(user: ChatUser) {
    if (this.list.findIndex((item) => item.userId === user.userId) !== -1)
      return;
    this.list.push(user);
  }
  ban() {
    const selects = this.list.splice(
      Math.floor(Math.random() * this.list.length),
      1,
    );
    if (selects.length < 1) return;
    const user = selects[0];
    const duration = Math.floor(Math.random() * 50) + 10;
    this.chatClient.say(
      this.target.name,
      `${user.displayName} 遭到隨機禁言 ${duration} 秒.`,
    );
    twurpleClient.asUser(process.env.TWITCH_ID, (twurpleClient) =>
      twurpleClient.moderation.banUser(this.target.id, {
        duration: duration,
        reason: "隨機禁言",
        user: user.userId,
      }),
    );
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (text !== null && text === this.keyword) {
      const user = msg.userInfo;
      if (user.isMod || user.isBroadcaster) {
        this.chatClient.say(this.target.name, `MOD 不能參與`, { replyTo: msg });
      } else {
        this.join(msg.userInfo);
      }
    } else if (text === "!ban") {
      const user = msg.userInfo;
      if (
        user.isMod ||
        user.isBroadcaster ||
        this.list.findIndex((item) => item.userId === user.userId) !== -1
      )
        this.ban();
    } else if (text === "!rb list" || text === "!參加人數") {
      this.chatClient.say(
        this.target.name,
        `目前有 ${this.list.length} 人參與`,
      );
    } else if (text === "!rb" || text.startsWith("!rb ")) {
      this.set(text.substring(4));
    } else if (text === "!設定關鍵字" || text.startsWith("!設定關鍵字 ")) {
      this.set(text.substring(7));
    }
  }
}
