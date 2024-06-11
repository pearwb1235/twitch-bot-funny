import { type RateLimiterRequestOptions } from "@d-fischer/rate-limiter";
import { ChatMessage, ChatSayMessageAttributes } from "@twurple/chat";
import ChatClient, { IChatClientListener } from "~/libraries/chatClient";
import BaseModule from "~/modules/base";

export default abstract class ChatMoudle
  extends BaseModule
  implements IChatClientListener
{
  init() {
    ChatClient.instance.register(this);
  }

  abort() {
    ChatClient.instance.unregister(this);
  }

  getChannel(): string | string[] {
    return this.target.name;
  }

  protected say(
    channel: string,
    text: string,
    attributes?: ChatSayMessageAttributes,
    rateLimiterOptions?: RateLimiterRequestOptions,
  ) {
    return ChatClient.instance.say(
      channel,
      text,
      attributes,
      rateLimiterOptions,
    );
  }

  abstract onMessage(
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  );
}
