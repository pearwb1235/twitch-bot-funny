import { HelixUser } from "@twurple/api";
import { twurpleClient } from "~/index";

export default abstract class BaseModule {
  protected target: HelixUser;
  constructor(target: string) {
    if (/^[0-9]/.test(target)) {
      twurpleClient.users.getUserById(target).then((user) => {
        this.target = user;
        this.init();
      });
    } else {
      twurpleClient.users.getUserByName(target).then((user) => {
        this.target = user;
        this.init();
      });
    }
  }
  abstract init(): void | Promise<void>;
  abstract abort(): void | Promise<void>;
}
