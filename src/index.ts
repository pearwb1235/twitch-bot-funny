import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import * as fs from "fs";
import * as path from "path";
import { logger } from "~/logger";
import RandomBanModule from "~/modules/randomBan";

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
logger.info("正在啟動中...");
twurpleClient
  .asUser(process.env.TWITCH_ID, (twurpleClient) =>
    twurpleClient
      .callApi({
        url: `/moderation/channels?user_id=${process.env.TWITCH_ID}`,
        type: "helix",
      })
      .then(
        (res: {
          data: {
            broadcaster_id: string;
            broadcaster_login: string;
            broadcaster_name: string;
          }[];
        }) => res.data,
      ),
  )
  .then((users) => {
    for (const user of users) {
      logger.info(
        `加入了 ${user.broadcaster_name}(${user.broadcaster_id}) 頻道.`,
      );
      new RandomBanModule(user.broadcaster_id);
    }
  });
