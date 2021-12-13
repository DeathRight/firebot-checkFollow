import { Firebot } from "firebot-custom-scripts-types";
import { concatFollowers, Followers, pushPromise } from './firebot/constants';
import { CheckFollowVariable } from './firebot/variables/checkFollow-variable';
import interval from 'interval-promise';


interface Params {
  interval: number;
}

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
        description: "Interval to repopulate in seconds",
        secondaryDescription: "Enter a number here",
      },
    };
  },
  run: (runRequest) => {
    const { logger, replaceVariableManager, twitchApi } = runRequest.modules;
    logger.info(runRequest.parameters.interval.toString());
    pushPromise(concatFollowers(twitchApi));
    if (runRequest.parameters.interval > 10) {
      interval(async () => { pushPromise(concatFollowers(twitchApi)) }, runRequest.parameters.interval*1000).catch(e => console.error('Bro...? checkFollow error:',e));
    };

    replaceVariableManager.registerReplaceVariable(CheckFollowVariable);
  },
};

export default script;
