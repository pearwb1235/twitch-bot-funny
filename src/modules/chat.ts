import { type RateLimiterRequestOptions } from "@d-fischer/rate-limiter";
import { ChatMessage, ChatSayMessageAttributes } from "@twurple/chat";
import BaseModule from "~/modules/base";
import ChatClientService, {
  IChatClientListener,
} from "~/services/chatClientService";

export default abstract class ChatMoudle
  extends BaseModule
  implements IChatClientListener
{
  init() {
    ChatClientService.instance.register(this);
  }

  abort() {
    ChatClientService.instance.unregister(this);
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
    return ChatClientService.instance.say(
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
