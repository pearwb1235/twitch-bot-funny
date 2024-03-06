import { ChatClient, ChatMessage } from "@twurple/chat";
import { authProvider } from "~/index";
import BaseModule from "~/modules/base";

export default class JokeModule extends BaseModule {
  private chatClient: ChatClient;

  constructor(target: string) {
    super(target);
  }
  init() {
    this.chatClient = new ChatClient({
      authProvider,
      channels: [this.target.name],
    });
    this.chatClient.onMessage(this.onMessage.bind(this));
    this.chatClient.onDisconnect((manually) => {
      if (manually) return;
      this.chatClient.reconnect();
      this.chatClient.join(this.target.name);
    });
    this.chatClient.connect();
  }
  abort() {
    this.chatClient.quit();
    this.chatClient = null;
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (text === "!爛笑話") {
      const list = [
        "耶穌游泳 穌打水",
        "東京念Tokyo 那京都念什麼 京都念慈庵",
        "為何猩猩在動物園裡都沒人敢惹牠？因為牠敲胸的",
        "(🔪) 刮鬍刀",
        "老闆要我燒開水 但我只敢燒到99度 因為我怕公司出現 兩個沸物",
        "如果柯南跳樓了 誰會最難過 灰原哀 因為新一跳，哀就開始煎熬",
        '「先生你好，這是我們店贈送的小菜」"不用了我不需要"「真的嗎?這可是你的筍絲喔」',
        "熬夜傷肝 所以你應該要叫我 小心肝",
        "有一位AV女優要拍A片 本來是講好要露三點 但當天說只能露兩點 導演就問為什麼原本說好要露三點 為什麼只剩兩點？然後他說：因為今天有一點不舒服。 ",
        "便利商店 顧客:我要取貨 店員:請問貴姓以及後三碼 顧客:姓包 763 店員:騙人的吧",
        "楊過最愛吃什麼？小籠包",
        "壽司郎是哪裡人 壽司郎西螺人 因為屬西螺",
        "為什麼鐵達尼號沈沒了？因為傑克把螺絲弄鬆了",
        "霍爾的移動城堡如果拍第二集要叫什麼？霍爾的兩棟城堡",
        "講日文的青蛙 摳尼吉蛙",
      ];
      this.chatClient.say(
        this.target.name,
        list[Math.floor(list.length * Math.random())],
        { replyTo: msg },
      );
    }
  }
}
