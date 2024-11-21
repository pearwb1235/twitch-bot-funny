import { HelixUser } from "@twurple/api";
import { twurpleClient } from "~/index";
import { logger } from "~/logger";
import AutoBanModule from "~/modules/autoban";
import BaseModule from "~/modules/base";
import DeleteSelfModule from "~/modules/deleteSelf";
import LuckModule from "~/modules/luck";
import RandomBanModule from "~/modules/randomBan";
import RandomReplyModule from "~/modules/randomReply";
import ChatClientService from "~/services/chatClientService";
import SheetCacheService from "~/services/sheetCacheService";

type Broadcaster = {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
};

export class MainLoader {
  private modules: Record<string, BaseModule[] & { name?: string }> = {};
  private timeoutId: NodeJS.Timeout | undefined;
  private isStart = false;
  private isAbort = false;
  private getUsers(): Promise<Broadcaster[]> {
    return twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient
        .callApi<{
          data: {
            broadcaster_id: string;
            broadcaster_login: string;
            broadcaster_name: string;
          }[];
        }>({
          url: `/moderation/channels?user_id=${process.env.TWITCH_ID}`,
          type: "helix",
        })
        .then((res) => res.data),
    );
  }
  async start() {
    if (this.isStart) {
      logger.error("已經啟動過了");
      return;
    }
    if (this.isAbort) {
      logger.info("這個實例不能再使用了");
      return;
    }
    this.isStart = true;
    logger.info("正在啟動中...");
    await this.refresh();
  }
  async abort() {
    this.isAbort = true;
    logger.info("正在停止中...");
    if (!this.isStart) return;
    clearTimeout(this.timeoutId);
    for (const userId in this.modules) {
      const name = this.modules[userId].name;
      try {
        await this.abortModules(userId);
        logger.info(`移除了 ${name}(${userId}) 頻道.`);
      } catch (e) {
        logger.error(`無法中止 ${name}(${userId}) 的模組`);
        logger.error(String(e));
      }
    }
    ChatClientService.destroy();
    SheetCacheService.destroy();
  }
  private async refresh() {
    try {
      const users = await this.getUsers();
      for (const userId of Object.keys(this.modules).filter(
        (userId) =>
          users.findIndex((user) => user.broadcaster_id === userId) === -1,
      )) {
        this.abortModules(userId);
      }
      for (const user of users) {
        this.initModules(user.broadcaster_id, user.broadcaster_name);
      }
    } catch {
      logger.warn("取得使用者列表失敗");
    }
    if (!this.isAbort)
      this.timeoutId = setTimeout(this.refresh.bind(this), 60 * 1000);
  }
  private initModules(userId: string, userDisplayName = "UNKNOWN") {
    if (userId in this.modules) return;
    twurpleClient.users.getUserById(userId).then((user) => {
      if (!user) return;
      logger.info(`加入了 ${userDisplayName}(${user.id}) 頻道.`);
      this.modules[user.id] = [];
      this.modules[user.id].name = userDisplayName;
      this.initModule(user, RandomBanModule);
      this.initModule(user, RandomReplyModule);
      this.initModule(user, LuckModule);
      this.initModule(user, DeleteSelfModule);
      this.initModule(user, AutoBanModule);
    });
  }
  private initModule<T extends BaseModule>(
    user: HelixUser,
    moduleClass: new (target: HelixUser) => T,
  ) {
    if (!(user.id in this.modules)) return;
    this.modules[user.id].push(new moduleClass(user));
  }
  private async abortModule(userId: string, moduleClass: typeof BaseModule) {
    if (!(userId in this.modules)) return;
    for (let index = 0; index < this.modules[userId].length; index++) {
      if (!(this.modules[userId][index] instanceof moduleClass)) return;
      await this.modules[userId][index].abort();
      this.modules[userId].splice(index--, 1);
      index--;
    }
  }
  private async abortModules(userId: string) {
    if (!(userId in this.modules)) return;
    logger.info(`離開了 ${this.modules[userId].name}(${userId}) 頻道.`);
    await Promise.all(this.modules[userId].map((module) => module.abort()));
    delete this.modules[userId];
  }
}
