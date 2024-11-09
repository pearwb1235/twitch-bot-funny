import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import * as fs from "fs";
import * as path from "path";
import { MainLoader } from "~/main";

if (!process.env.TWITCH_ID)
  throw new Error("The env `TWITCH_ID` must to be set.");
if (!process.env.TWITCH_CLIENTID)
  throw new Error("The env `TTWITCH_CLIENTIDWITCH_ID` must to be set.");
if (!process.env.TWITCH_SECRET)
  throw new Error("The env `TTWITCH_CLIENTIDWITCH_ID` must to be set.");

const tokenData = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), ".data", `tokens.${process.env.TWITCH_ID}.json`),
    {
      encoding: "utf-8",
    },
  ),
);
export const authProvider = new RefreshingAuthProvider({
  clientId: process.env.TWITCH_CLIENTID,
  clientSecret: process.env.TWITCH_SECRET,
});
authProvider.onRefresh((userId, newTokenData) =>
  fs.writeFileSync(
    path.join(process.cwd(), ".data", `tokens.${userId}.json`),
    JSON.stringify(Object.assign(tokenData, newTokenData), null, 4),
    { encoding: "utf-8" },
  ),
);
authProvider.addUser(process.env.TWITCH_ID, tokenData, ["chat"]);
export const twurpleClient = new ApiClient({
  authProvider,
});
new MainLoader().start();
