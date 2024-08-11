import { ChatMessage } from "@twurple/chat";
import { logger } from "~/logger";
import ChatMoudle from "~/modules/chat";
import SheetCacheService from "~/services/sheetCacheService";

export default class RandomReplyModule extends ChatMoudle {
  private history: Record<string, number[]> = {};
  private list: Record<string, string[]> = {};
  private cronId: NodeJS.Timeout;

  constructor(target: string) {
    super(target);
  }
  init() {
    super.init();
    logger.debug(
      1,
      `隨機回覆加載中 ─ ${this.target.displayName}(${this.target.id})`,
    );
    this.refresh().then(() => {
      logger.debug(
        1,
        `隨機回覆加載完成 ─ ${this.target.displayName}(${this.target.id})`,
      );
      for (const key in this.list) {
        logger.debug(
          2,
          `隨機回覆加載完成 ─ ${this.target.displayName}(${this.target.id}) : ${key}`,
        );
      }
    });
  }
  abort() {
    super.abort();
    if (this.cronId) clearTimeout(this.cronId);
  }
  async refresh() {
    const regexp = /https:\/\/docs.google.com\/spreadsheets\/d\/([^\/]*)/;
    /**
     * A - 使用者ID
     * B - 指令
     * C - 連結
     * D - 分頁名稱
     */
    const listRows = (
      await SheetCacheService.instance.get(
        "1EkCcdxTX58vCEFWLQuU5OVOKeOfpyPpAeoDNfyCvgr8",
        "連結",
      )
    ).values.filter((row) => !row[0] || row[0] === this.target.id);
    if (listRows.length < 1) return;
    const list = {};
    const promises = [];
    for (const row of listRows) {
      if (row[1].length < 1) {
        // B
        logger.debug(
          1,
          `在使用者 ${this.target.displayName}(${this.target.id}) 中發現表單有空白指令`,
        );
        continue;
      }
      if (!(row[1] in list)) list[row[1]] = [];
      const result = regexp.exec(row[2]); // C
      if (!result) {
        logger.debug(
          1,
          `在使用者 ${this.target.displayName}(${this.target.id}) 中發現表單連結錯誤`,
        );
        continue;
      }
      if (row[3].length < 1) {
        // D
        logger.debug(
          1,
          `在使用者 ${this.target.displayName}(${this.target.id}) 中發現表單有空白分頁名稱`,
        );
        continue;
      }
      promises.push(
        SheetCacheService.instance
          .get(result[1], row[3])
          .then(({ values: childRows }) => {
            if (childRows)
              list[row[1]].push(
                ...childRows
                  .filter((row) => row[0].length > 0)
                  .map((row) => row[0]),
              );
          }),
      );
    }
    await Promise.all(promises).catch((e) => console.error(e));
    for (const command in list) {
      if (
        command in this.list &&
        this.list[command].length === list[command].length
      )
        continue;
      this.history[command] = [];
    }
    this.list = list;
    this.cronId = setTimeout(() => this.refresh().catch(() => {}), 60000);
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (!text.startsWith("!") || !(text.substring(1) in this.list)) return;
    const command = text.substring(1);
    if (this.list[command].length < 1) return;
    const historyMax = Math.min(
      100,
      this.list[command].length - 1,
      Math.floor(this.list[command].length * 0.8),
    );
    let index = -1;
    while (
      this.history[command].includes(
        (index = Math.floor(this.list[command].length * Math.random())),
      )
    );
    this.history[command].push(index);
    if (
      this.history[command].length >
      Math.min(this.list[command].length - 1, historyMax)
    )
      this.history[command].shift();
    this.say(this.target.name, this.list[command][index], { replyTo: msg });
  }
}
