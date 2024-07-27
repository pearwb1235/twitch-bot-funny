import { twurpleClient } from "~/index";
import { logger } from "~/logger";
import BaseModule from "~/modules/base";
import LuckModule from "~/modules/luck";
import RandomBanModule from "~/modules/randomBan";
import RandomReplyModule from "~/modules/randomReply";
import ChatClientService from "~/services/chatClientService";

type Broadcaster = {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
};

export class MainLoader {
  private modules: Record<string, BaseModule[] & { name?: string }> = {};
  private timeoutId: NodeJS.Timeout;
  private isStart = false;
  private isAbort = false;
  private getUsers(): Promise<Broadcaster[]> {
    return twurpleClient.asUser(process.env.TWITCH_ID, (twurpleClient) =>
      twurpleClient
        .callApi({
          url: `/moderation/channels?user_id=${process.env.TWITCH_ID}`,
          type: "helix",
        })
        .then(
          (res: {
            data: {
              broadcaster_id: string;
              broadcaster_login: string;
              broadcaster_name: string;
            }[];
          }) => res.data,
        ),
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
        logger.error(e.toString());
      }
    }
    ChatClientService.destroy();
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
    logger.info(`加入了 ${userDisplayName}(${userId}) 頻道.`);
    this.modules[userId] = [];
    this.modules[userId].name = userDisplayName;
    this.initModule(userId, RandomBanModule);
    this.initModule(userId, RandomReplyModule);
    this.initModule(userId, LuckModule);
  }
  private initModule<T extends BaseModule>(
    userId: string,
    moduleClass: new (target: string) => T,
  ) {
    if (!(userId in this.modules)) return;
    this.modules[userId].push(new moduleClass(userId));
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
