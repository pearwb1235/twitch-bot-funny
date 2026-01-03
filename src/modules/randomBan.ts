import { ChatMessage, ChatUser } from "@twurple/chat";
import { twurpleClient } from "~/index";
import ChatMoudle from "~/modules/chat";

export default class RandomBanModule extends ChatMoudle {
  /**
   * 參加關鍵字
   */
  private keyword: string | null = null;
  /**
   * 參加清單
   */
  private list: ChatUser[] = [];
  /**
   * 最後通知時間
   */
  private lastNotify: number = 0;
  /**
   * 允許觀眾使用 !ban
   */
  private allowViewerBan: boolean = false;

  set(keyword: string) {
    keyword = keyword.trim();
    if (keyword.length < 1) {
      this.say(
        this.target.name,
        this.keyword === null
          ? "尚未設定關鍵字"
          : `當前關鍵字為「${this.keyword}」`,
      );
      return;
    }
    if (keyword.length > 100) return;
    if (keyword.startsWith("!")) {
      this.say(this.target.name, `關鍵字不能為 ! 開頭`);
      return;
    }
    this.keyword = keyword;
    this.list.length = 0;
    this.say(this.target.name, `成功設置關鍵字為「${keyword}」`);
  }
  join(user: ChatUser) {
    if (this.list.findIndex((item) => item.userId === user.userId) !== -1)
      return false;
    this.list.push(user);
    return true;
  }
  ban() {
    const selects = this.list.splice(
      Math.floor(Math.random() * this.list.length),
      1,
    );
    if (selects.length < 1) return;
    const user = selects[0];
    const duration = Math.floor(Math.random() * 50) + 10;
    this.say(
      this.target.name,
      `${user.displayName} 遭到隨機禁言 ${duration} 秒.`,
    );
    twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient.moderation.banUser(this.target.id, {
        duration: duration,
        reason: "隨機禁言",
        user: user.userId,
      }),
    );
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    const user = msg.userInfo;
    if (text !== null && text === this.keyword) {
      if (user.isMod || user.isBroadcaster) {
        this.say(this.target.name, `MOD 不能參與`, {
          replyTo: msg,
        });
      } else {
        if (
          this.join(msg.userInfo) &&
          Date.now() - 5 * 60 * 1000 > this.lastNotify
        ) {
          this.lastNotify = Date.now();
          this.say(
            this.target.name,
            `你參加了隨機禁言抽獎，若要離開請輸入「!離開」(防止洗頻，這則訊息300秒內只會出現一次)`,
            {
              replyTo: msg,
            },
          );
        }
      }
    } else if (text.toLowerCase() === "!ban") {
      if (
        user.isMod ||
        user.isBroadcaster ||
        this.list.findIndex((item) => item.userId === user.userId) !== -1
      )
        this.ban();
    } else if (text.toLowerCase() === "!rb switch") {
      this.allowViewerBan = !this.allowViewerBan;
      this.say(
        this.target.name,
        this.allowViewerBan
          ? "已允許觀眾使用 !ban 指令"
          : "已禁止觀眾使用 !ban 指令",
        {
          replyTo: msg,
        },
      );
    } else if (text.toLowerCase() === "!rb exit" || text === "!離開") {
      if (this.list.findIndex((item) => item.userId === user.userId) !== -1) {
        this.list = this.list.filter((item) => item.userId !== user.userId);
        this.say(this.target.name, `你已離開隨機禁言`, {
          replyTo: msg,
        });
      } else {
        this.say(this.target.name, `你又沒有加入`, {
          replyTo: msg,
        });
      }
    } else if (text.toLowerCase() === "!rb list" || text === "!參加人數") {
      this.say(this.target.name, `目前有 ${this.list.length} 人參與`);
    } else if (
      text.toLowerCase() === "!rb" ||
      text === "!設定關鍵字" ||
      user.isMod ||
      user.isBroadcaster
    ) {
      if (
        text.toLowerCase() === "!rb" ||
        text.toLowerCase().startsWith("!rb ")
      ) {
        this.set(text.substring(4));
      } else if (text === "!設定關鍵字" || text.startsWith("!設定關鍵字 ")) {
        this.set(text.substring(7));
      }
    }
  }
}
