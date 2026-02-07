import { ChatMessage } from "@twurple/chat";
import ChatMoudle from "~/modules/chat";

export default class RollModule extends ChatMoudle {
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    if (text.startsWith("!roll ") || text === "!roll") {
      const args = text.split(" ");
      if (args.length > 1 && Number.isNaN(Number(args[1])))
        return this.say(this.target.name, "指令錯誤", { replyTo: msg });
      if (args.length > 2 && Number.isNaN(Number(args[2])))
        return this.say(this.target.name, "指令錯誤", { replyTo: msg });

      const min =
        args.length > 2 ? Math.min(Number(args[1]), Number(args[2])) : 1;
      const max =
        args.length > 2
          ? Math.max(Number(args[1]), Number(args[2]))
          : args.length > 1
            ? Number(args[1])
            : 100;

      this.say(
        this.target.name,
        `骰出了 ${Math.floor(Math.random() * (max - min + 1)) + min} 點！(${min}-${max})`,
        { replyTo: msg },
      );
    }
  }
}
