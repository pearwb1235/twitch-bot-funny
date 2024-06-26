import { ChatMessage } from "@twurple/chat";
import { google } from "googleapis";
import { logger } from "~/logger";
import ChatMoudle from "~/modules/chat";

export default class RandomReplyModule extends ChatMoudle {
  private history: Record<string, number[]> = {};
  private list: Record<string, string[]> = {};
  private cronId: NodeJS.Timeout;

  constructor(target: string) {
    super(target);
  }
  init() {
    super.init();
    this.refresh();
  }
  abort() {
    super.abort();
    if (this.cronId) clearTimeout(this.cronId);
  }
  async refresh() {
    const sheets = google.sheets({
      version: "v4",
      auth: "AIzaSyChVqAUy_sZl3h9fURnJTbQb5_fHN820hA",
    });
    const regexp = /https:\/\/docs.google.com\/spreadsheets\/d\/([^\/]*)/;
    /**
     * A - 使用者ID
     * B - 指令
     * C - 連結
     * D - 分頁名稱
     */
    const resList = await sheets.spreadsheets.values.get({
      spreadsheetId: "1EkCcdxTX58vCEFWLQuU5OVOKeOfpyPpAeoDNfyCvgr8",
      range: "連結!A1:D",
    });

    const rows = resList.data.values.filter(
      (row) => !row[0] || row[0] === this.target.id,
    );
    if (rows.length < 1) return;
    const list = {};
    for (const row of rows) {
      try {
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
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: result[1],
          range: `${row[3]}!A1:A`,
        });
        const childRows = res.data.values;
        if (childRows)
          list[row[1]].push(
            ...childRows
              .filter((row) => row[0].length > 0)
              .map((row) => row[0]),
          );
      } catch {
        logger.debug(
          1,
          `在使用者 ${this.target.displayName}(${this.target.id}) 中讀取表單資料失敗`,
        );
        logger.debug(1, row.join(", "));
      }
    }
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
