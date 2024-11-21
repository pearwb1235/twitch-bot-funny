import { ChatMessage } from "@twurple/chat";
import { twurpleClient } from "~/index";
import { logger } from "~/logger";
import ChatMoudle from "~/modules/chat";

export default class AutoBanModule extends ChatMoudle {
  // 暫無永久儲存系統，先預設關閉
  private enable = false;

  getTimeString(time: Date, currentTime = Date.now()): string {
    const diff = currentTime - time.getTime();
    if (diff < 60 * 60 * 1000) return "不到一小時";
    if (diff < 24 * 60 * 60 * 1000) return "不到一天";
    const day = Math.floor(diff / 86400000);
    if (day < 365) return `${day} 天`;
    const year = Math.floor(day / 365);
    return `${year} 年 ${day % 365} 天`;
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

  hasKeyword(message: string): string | false {
    if (/cutt ?\. ?ly/.test(message)) return "cutt.ly";
    if (/streamboo ?\. ?com/.test(message)) return "streamboo.com";
    return false;
  }

  async onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    const currentTime = Date.now();
    if (text === "!ab-test") {
      const followTime = await this.getFollowTime(msg.userInfo.userId);
      return this.say(
        this.target.name,
        followTime
          ? `您已追隨 ${this.getTimeString(followTime, currentTime)}`
          : "笑死根本沒追隨",
        {
          replyTo: msg.id,
        },
      );
    }
    if (msg.userInfo.isBroadcaster || msg.userInfo.isMod) {
      switch (text) {
        case "!ab-on":
          this.enable = true;
          return this.say(this.target.name, "開啟防衛模式", {
            replyTo: msg.id,
          });
        case "!ab-off":
          this.enable = true;
          return this.say(this.target.name, "關閉防衛模式", {
            replyTo: msg.id,
          });
      }
      return;
    }
    if (!this.enable) return;
    const keyword = this.hasKeyword(text);
    if (!keyword) return;

    const uuid = crypto.randomUUID();
    logger.info(`[AutoBan] 識別碼: ${uuid}`);
    logger.info(
      `[AutoBan] ${msg.userInfo.displayName}(${msg.userInfo.userId}) 輸入了關鍵字「${keyword}」`,
    );
    await twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient.moderation.deleteChatMessages(this.target.id, msg.id),
    );
    if (
      msg.userInfo.isSubscriber ||
      msg.userInfo.isVip ||
      msg.userInfo.isFounder ||
      msg.userInfo.isArtist
    )
      return;
    const followTime = await this.getFollowTime(msg.userInfo.userId);
    logger.info(
      `[AutoBan] ${msg.userInfo.displayName}(${msg.userInfo.userId}) ${followTime ? `追隨時間 ${followTime.toISOString()}(${currentTime - followTime.getTime()})` : "無追隨"}`,
    );
    if (followTime && currentTime - followTime.getTime() >= 604800000) return; // 超過 7 天追隨 饒他一命
    const user = await twurpleClient.asUser(
      process.env.TWITCH_ID!,
      async (twurpleClient) =>
        await twurpleClient.users.getUserById(msg.userInfo.userId),
    );
    if (!user) return; // 不太可能
    logger.info(
      `[AutoBan] ${msg.userInfo.displayName}(${msg.userInfo.userId}) 創建時間 ${user.creationDate.toISOString()}(${currentTime - user.creationDate.getTime()})`,
    );
    if (currentTime - user.creationDate.getTime() >= 5184000000) return; // 創立帳號時間超過 60 天 饒他一命
    await twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient.moderation.banUser(this.target.id, {
        reason: `自動禁止 識別碼ID: ${uuid}`,
        user: msg.userInfo.userId,
      }),
    );
  }
}
