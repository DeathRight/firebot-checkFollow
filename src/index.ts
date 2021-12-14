import { Firebot } from "firebot-custom-scripts-types";
import { concatFollowers, Followers, pushPromise } from './firebot/constants';
import { CheckFollowVariable } from './firebot/variables/checkFollow-variable';
import interval from 'interval-promise';


interface Params {
  interval: number,
  username: string,
};

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: "Check Follow",
      description: "Concatenates followers list and adds $checkFollow[user] variable that returns true or false",
      author: "BigPimpinVoidkin",
      version: "1.0",
      firebotVersion: "5",
    };
  },
  getDefaultParameters: () => {
    return {
      interval: {
        type: "number",
        default: 60,
        description: "Interval to repopulate followers in seconds",
        secondaryDescription: "Enter a number here",
      },
      username: {
        type: "string",
        default: "",
        description: "Username to get/check follows of",
        secondaryDescription: "Leave blank for streamer",
      },
    };
  },
  run: (runRequest) => {
    const { logger, replaceVariableManager, twitchApi } = runRequest.modules;
    const param = runRequest.parameters;
    const god = (param.username) === "" ? runRequest.firebot.accounts.streamer.username : param.username;

    logger.info(runRequest.parameters.interval.toString());

    pushPromise(concatFollowers(twitchApi, god));
    if (runRequest.parameters.interval > 10) {
      interval(async () => { pushPromise(concatFollowers(twitchApi, god)) }, param.interval*1000).catch(e => logger.error('Bro...? interval-promise error:',e));
    };

    replaceVariableManager.registerReplaceVariable(CheckFollowVariable);
  },
};

export default script;
