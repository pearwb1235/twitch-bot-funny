import { ChatMessage, ChatUser } from "@twurple/chat";
import { twurpleClient } from "~/index";
import ChatMoudle from "~/modules/chat";

export default class BoomModule extends ChatMoudle {
  private boom: number | null = null;
  ban(user: ChatUser) {
    this.say(
      this.target.name,
      `BOOM! 水球爆炸了! ${user.displayName} 被淋濕了!`,
    );
    twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient.moderation.banUser(this.target.id, {
        duration: 60,
        reason: "被淋濕了",
        user: user.userId,
      }),
    );
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (
      text.toLowerCase() !== "!boom" &&
      !text.toLowerCase().startsWith("!boom ")
    )
      return;
    const user = msg.userInfo;

    if (this.boom === null) {
      if (
        user.isBroadcaster ||
        user.badges.has("lead_moderator") ||
        user.isMod
      ) {
        this.boom = Math.floor(Math.random() * 20) + 1;
        this.say(
          this.target.name,
          `新的水球遊戲開始了，輸入「!boom」來參加遊戲(該遊戲內容含有BAN人風險)`,
          {
            replyTo: msg,
          },
        );
      } else {
        this.say(this.target.name, `遊戲尚未開始，請等待主持人開始`, {
          replyTo: msg,
        });
      }
    } else if (user.isBroadcaster) {
      this.say(this.target.name, `主播不能參與`, {
        replyTo: msg,
      });
    } else if (user.badges.has("lead_moderator")) {
      // NOTE: 此功能 twurple 尚未支援檢測
      this.say(this.target.name, `槌子不能參與`, {
        replyTo: msg,
      });
    } else if (user.isMod) {
      this.say(this.target.name, `MOD 不能參與 (槌子模式等待完善)`, {
        replyTo: msg,
      });
    } else {
      this.boom -= 1;
      if (this.boom === 0) {
        this.ban(user);
        this.boom = null;
      } else {
        this.say(
          this.target.name,
          `${user.displayName} 安然無恙，但水球還在增長。`,
          {
            replyTo: msg,
          },
        );
      }
    }
  }
}
