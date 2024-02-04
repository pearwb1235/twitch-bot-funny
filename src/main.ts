import { twurpleClient } from "~/index";
import { logger } from "~/logger";
import BaseModule from "~/modules/base";
import RandomBanModule from "~/modules/randomBan";

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
  }
  private async refresh() {
    const users = await this.getUsers();
    for (const user of users) {
      this.initModules(user.broadcaster_id, user.broadcaster_name);
    }
    if (!this.isAbort)
      this.timeoutId = setTimeout(this.refresh.bind(this), 60 * 1000);
  }
  private initModules(userId: string, userDisplayName = "UNKNOWN") {
    if (userId in this.modules) return;
    logger.info(`加入了 ${userDisplayName}(${userId}) 頻道.`);
    this.modules[userId] = [];
    this.modules[userId].name = userDisplayName;
    this.modules[userId].push(new RandomBanModule(userId));
  }
  private async abortModules(userId: string) {
    if (userId in this.modules) return;
    await Promise.all(this.modules[userId].map((module) => module.abort()));
    delete this.modules[userId];
  }
}
