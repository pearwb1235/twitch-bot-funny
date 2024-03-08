import { ChatClient, ChatMessage } from "@twurple/chat";
import { authProvider } from "~/index";
import BaseModule from "~/modules/base";

export default class JokeModule extends BaseModule {
  private chatClient: ChatClient;

  private history: number[] = [];

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
        "媽的 是表達情緒的用詞 父的 是食物",
        "什麼飲料最好玩 喝剩的飲料",
        "水手的相反 火腿",
        "李白是怎麼死的呢？？？ 他 詩寫過多",
        "警衛在笑什麼？校門口",
        "一百隻蝌蚪一起比賽 哪一隻贏了？都沒贏，因為百蝌全輸",
        "小屁孩吃了罌粟花會變成罌粟小子",
        "你知道蜘蛛人第幾集的時候結婚嗎？第七集，因為蜘蛛人七",
        "去加油站最怕遇到什麼人？油槍滑掉的人",
        "什麼筆會唱歌？ Yoasobi",
        "在鹽山不能做什麼？尿尿，因為會尿到鹽",
        "阿笠博士之前是什麼？阿笠碩士",
        "人的交通工具是車跟飛機，那神的交通工具是什麼？寶貝 因為神騎寶貝",
        "過年時節快到了，為什麼貨物都被黏在一起了呢？因為年(黏)貨大街",
        "哪兩個姓氏在一起最長壽？吳和黃，因為 吳黃萬歲萬歲萬萬歲",
        "什麼衣服最難乾？ 潮T",
        "為什麼五子棋黑棋要先下？因為白子先行會 白走一步 白費力氣",
        "秘密不可以跟喜歡吃什麼東西的人講？螃蟹 因為他很喜歡蟹肉（洩漏）",
        "有一天烏龜跟蝸牛互撞出了車禍,雙方都被送到醫院,警察到場問了雙方車禍怎麼發生的? 烏龜答:就牠闖了紅燈然後就車禍了 蝸牛答:一切都發生得太快了",
        "蜈蚣媽媽在醫院生產 醫生說：加油，蜈蚣寶寶快出來了！ 腳出來了，腳出來了，腳出來了，腳出來了，腳出來了，腳出來了...",
        "愛生氣的人要簽什麼契約 賣身契",
        "在呂布背叛丁原後過了不久，某次呂布在城牆的走道上看見丁原的冤魂 嚇得呂布大喊:我操，原",
        "玻璃掉下來之前會說什麼？晚安 因為他要碎ㄌ",
        "有一位老先生 名叫阿鐵 他養了一隻狗叫六六 有一天他去公園遛狗 認識他的人看到他說 哇老鐵遛六六阿",
        "什麼動物最安靜 猩猩 因為天上的星星不說話⋯⋯",
        "亞絲娜同學一直哭 桐人便摸了亞絲娜的頭說不要哭了 可是亞絲娜還是一直哭 桐人便生氣大喊「還要哭！摸頭還要哭！」",
        "知道北投為什麼要叫北投嗎 因為南勢角",
        "剛剛去超商取貨 店員找不到就跑來問我：你是不是小件貨？",
        "台北的哪一個夜市會騙人？臨江街通化夜市 因為 你哭著對我說，通化（童話）裡都是騙人的",
        "路上看到一隻假死的蜜蜂，可能飛走了吧？回過神來那隻蜜蜂不見了 假死 bee 咧？",
        "你知道我為什麼輸液的時候在笑嘛？因為我笑點低",
        "你知道什麼動物好笑的嗎 海鰻，海鰻好笑的",
      ];
      let index;
      while (
        this.history.includes((index = Math.floor(list.length * Math.random())))
      );
      this.history.push(index);
      if (this.history.length > 10) this.history.shift();
      this.chatClient.say(this.target.name, list[index], { replyTo: msg });
    }
  }
}
