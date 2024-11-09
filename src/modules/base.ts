import { HelixUser } from "@twurple/api";

export default abstract class BaseModule {
  protected target: HelixUser;
  constructor(target: HelixUser) {
    this.target = target;
    this.init();
  }
  abstract init(): void | Promise<void>;
  abstract abort(): void | Promise<void>;
}
