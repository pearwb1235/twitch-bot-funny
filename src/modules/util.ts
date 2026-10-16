import { ChatMessage } from "@twurple/chat";
import { twurpleClient } from "~/index";
import ChatMoudle from "~/modules/chat";

export default class UtilModule extends ChatMoudle {
  getTimeString(time: Date, currentTime = Date.now()): string {
    const diff = currentTime - time.getTime();
    if (diff < 60 * 60 * 1000) return "不到一小時";
    if (diff < 24 * 60 * 60 * 1000) return "不到一天";
    const day = Math.floor(diff / 86400000);
    if (day < 365) return `${day} 天`;
    const year = Math.floor(day / 365);
    return `${year} 年 ${day % 365} 天`;
  }

  async getCreatedTime(userId: string) {
    const result = await twurpleClient.asUser(
      process.env.TWITCH_ID!,
      async (twurpleClient) => await twurpleClient.users.getUserById(userId),
    );
    return result ? result.creationDate : null;
  }

  async getFollowTime(userId: string) {
    const result = await twurpleClient.asUser(
      process.env.TWITCH_ID!,
      async (twurpleClient) =>
        await twurpleClient.channels.getChannelFollowers(
          this.target.id,
          userId,
        ),
    );
    return result.data.length > 0 ? result.data[0].followDate : null;
  }

  async getRandomUser() {
    const knownBots = [
      "1019903902", // this bot
      "100135110", // streamelements
      "797558968", // chiwabots
      "541450924", // creatisbot
      "795887898", // nekolivebot
      "19264788", // nightbot
    ];
    const result = await twurpleClient.asUser(
      process.env.TWITCH_ID!,
      async (twurpleClient) =>
        await twurpleClient.chat.getChatters(this.target.id),
    );
    const chatters = result.data.filter(
      (user) => !knownBots.includes(user.userId),
    );
    return chatters.length > 0
      ? chatters[Math.floor(Math.random() * chatters.length)]
      : null;
  }

  async onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    const currentTime = Date.now();
    if (text === "!follow") {
      const followTime = msg.userInfo.isBroadcaster
        ? await this.getCreatedTime(msg.userInfo.userId)
        : await this.getFollowTime(msg.userInfo.userId);
      return this.say(
        this.target.name,
        followTime
          ? `您已追隨 ${this.getTimeString(followTime, currentTime)}`
          : "笑死根本沒追隨",
        {
          replyTo: msg.id,
        },
      );
    } else if (text === "!user") {
      const user = await this.getRandomUser();
      if (user) {
        return this.say(this.target.name, `抽到了 ${user.userDisplayName}`, {
          replyTo: msg.id,
        });
      } else {
        return this.say(this.target.name, "沒有找到", { replyTo: msg.id });
      }
    }
  }
}
