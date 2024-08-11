import { google, sheets_v4 } from "googleapis";
import { logger } from "~/logger";

export default class SheetCacheService {
  private static _instance: SheetCacheService;
  public static get instance(): SheetCacheService {
    if (!SheetCacheService._instance)
      SheetCacheService._instance = new SheetCacheService();
    return SheetCacheService._instance;
  }
  public static destroy(): void {
    if (!SheetCacheService._instance) return;
    SheetCacheService._instance.quit();
  }

  private sheets: sheets_v4.Sheets;
  private _taskId: NodeJS.Timeout;
  private isTaskRunning: boolean = false;
  private queue: {
    spreadsheetId: string;
    sheetName: string;
    listeners: ((data: sheets_v4.Schema$ValueRange) => void)[];
    failedCount: number;
  }[];

  private constructor() {
    this.sheets = google.sheets({
      version: "v4",
      auth: "AIzaSyChVqAUy_sZl3h9fURnJTbQb5_fHN820hA",
    });
    this.queue = [];
  }
  private async tryRun() {
    if (this._taskId) return;
    // 延遲等待其他同時需要讀取的加入
    this._taskId = setTimeout(this.refresh.bind(this), 100);
  }
  private async refresh() {
    if (this.isTaskRunning) return;
    this.isTaskRunning = true;
    logger.debug(2, `開始加載試算表資料`);
    try {
      while (this.queue.length > 0) {
        const nextItem = this.queue[0];
        const resList = await this.sheets.spreadsheets.values.get({
          spreadsheetId: nextItem.spreadsheetId,
          range: nextItem.sheetName,
        });
        const data = resList.data;
        for (const listener of nextItem.listeners) {
          try {
            listener(data);
          } catch (e) {
            console.error(e);
          }
        }
        this.queue.shift();
      }
      logger.debug(2, `結束加載試算表資料`);
    } catch (e) {
      logger.debug(3, `加載試算表資料失敗`);
      logger.debug(3, e.toString());
      this.queue[0].failedCount++;
      if (this.queue[0].failedCount >= 3) {
        const failItem = this.queue.shift();
        logger.error(
          `讀取表單資料失敗 https://docs.google.com/spreadsheets/d/${failItem.spreadsheetId} (${failItem.sheetName})`,
        );
      }
    } finally {
      if (this._taskId) {
        clearTimeout(this._taskId);
        this._taskId = null;
      }
      if (this.queue.length > 0)
        this._taskId = setTimeout(this.refresh.bind(this), 60000);
      this.isTaskRunning = false;
    }
  }
  public async get(
    spreadsheetId: string,
    sheetName: string,
  ): Promise<sheets_v4.Schema$ValueRange> {
    return new Promise((resolve) => {
      let item = this.queue.find(
        (item) =>
          item.spreadsheetId === spreadsheetId && item.sheetName === sheetName,
      );
      if (!item) {
        item = {
          spreadsheetId: spreadsheetId,
          sheetName: sheetName,
          listeners: [],
          failedCount: 0,
        };
        this.queue.push(item);
      }
      item.listeners.push(resolve);
      this.tryRun();
    });
  }
  private quit() {
    SheetCacheService._instance = null;
    clearTimeout(this._taskId);
  }
}
