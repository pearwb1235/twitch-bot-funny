import { ChatMessage, ChatUser } from "@twurple/chat";
import { twurpleClient } from "~/index";
import ChatMoudle from "~/modules/chat";

export default class DeleteSelfModule extends ChatMoudle {
  private record: Record<string, string> = {};

  delete(user: ChatUser) {
    if (!(user.userId in this.record)) return;
    const messageId = this.record[user.userId];
    delete this.record[user.userId];
    twurpleClient.asUser(process.env.TWITCH_ID!, (twurpleClient) =>
      twurpleClient.moderation.deleteChatMessages(this.target.id, messageId),
    );
  }
  onMessage(_1: string, _2: string, text: string, msg: ChatMessage) {
    const user = msg.userInfo;
    if (text.toLowerCase() === "!自刪") {
      if (user.isBroadcaster || user.isMod) {
        this.say(this.target.name, `MOD 訊息無法刪除`, {
          replyTo: msg,
        });
        return;
      }
      this.delete(user);
    } else if (!text.startsWith("!")) {
      this.record[user.userId] = msg.id;
    }
  }
}
