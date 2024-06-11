import { ChatMessage } from "@twurple/chat";
import { google, sheets_v4 } from "googleapis";
import ChatMoudle from "~/modules/chat";

export default class JokeModule extends ChatMoudle {
  private historyMax = 10;
  private history: number[] = [];
  private list: string[] = [];
  private cronId: NodeJS.Timeout;

  constructor(target: string) {
    super(target);
  }
  init() {
    super.init();
    this.refreshJokes();
  }
  abort() {
    super.abort();
    if (this.cronId) clearTimeout(this.cronId);
  }
  async refreshJokes() {
    const sheets = google.sheets({
      version: "v4",
      auth: "AIzaSyChVqAUy_sZl3h9fURnJTbQb5_fHN820hA",
    });
    const list = [];
    await this.refreshGlobalJokes(sheets, list);
    await this.refreshPersonJokes(sheets, list);
    this.historyMax = Math.floor(list.length * 0.8);
    this.list = list;
    this.cronId = setTimeout(() => this.refreshJokes().catch(() => {}), 60000);
  }
  async refreshGlobalJokes(sheets: sheets_v4.Sheets, list: string[]) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1EkCcdxTX58vCEFWLQuU5OVOKeOfpyPpAeoDNfyCvgr8",
      range: "共用!A1:A",
    });
    const rows = res.data.values;
    if (rows) list.push(...rows.map((row) => row[0]));
  }
  async refreshPersonJokes(sheets: sheets_v4.Sheets, list: string[]) {
    const regexp = /https:\/\/docs.google.com\/spreadsheets\/d\/([^\/]*)/;
    const resList = await sheets.spreadsheets.values.get({
      spreadsheetId: "1EkCcdxTX58vCEFWLQuU5OVOKeOfpyPpAeoDNfyCvgr8",
      range: "連結!A1:B",
    });
    const row = resList.data.values.find((row) => row[0] === this.target.id);
    if (!row) return;
    const result = regexp.exec(row[1]);
    if (!result) return;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: result[1],
      range: "爛笑話!A1:A",
    });
    const rows = res.data.values;
    if (rows) list.push(...rows.map((row) => row[0]));
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (text === "!爛笑話") {
      if (this.list.length < 1) return;
      let index = -1;
      while (
        this.history.includes(
          (index = Math.floor(this.list.length * Math.random())),
        )
      );
      this.history.push(index);
      if (this.history.length > Math.min(this.list.length - 1, this.historyMax))
        this.history.shift();
      this.say(this.target.name, this.list[index], { replyTo: msg });
    }
  }
}
