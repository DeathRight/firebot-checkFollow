import { Firebot } from "firebot-custom-scripts-types";
import { concatFollowers, Followers, pushPromise, pushFreshFollow } from './firebot/constants';
import { CheckFollowVariable } from './firebot/variables/checkFollow-variable';
import { unfollowListVariable } from "./firebot/variables/unfollowList-variable";
import { unfollowSourceDef } from "./firebot/events/unfollow-eventsource";
import interval from 'interval-promise';


interface Params {
  interval: number,
  username: string,
};

type EventArgs = {
  event: any,
  source: any,
  meta: any,
  isManual: boolean,
  isRetrigger: boolean
};

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: "Check Follow",
      description: "Concatenates followers list, adds $checkFollow[user] variable, adds unfollow event.",
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
    const { logger, replaceVariableManager, twitchApi, eventManager } = runRequest.modules;
    const em: any = eventManager;
    const param = runRequest.parameters;
    const god = (param.username) === "" ? runRequest.firebot.accounts.streamer.username : param.username;

    logger.info("CheckFollow Interval: " + runRequest.parameters.interval.toString());

    pushPromise(concatFollowers(twitchApi, god, eventManager));
    if (runRequest.parameters.interval > 10) {
      interval(async () => await pushPromise(concatFollowers(twitchApi, god, eventManager)), param.interval*1000).catch(e => logger.error('Bro...? interval-promise error:',e));
    };

    eventManager.registerEventSource(unfollowSourceDef);
    replaceVariableManager.registerReplaceVariable(CheckFollowVariable);
    replaceVariableManager.registerReplaceVariable(unfollowListVariable);

    //listen to follow events and push new follows to be checked against
    em.on("event-triggered", ({
        event,
        source,
        meta,
        isManual,
        isRetrigger
    }: EventArgs) => {
      /*if (isManual || isRetrigger) {
          return;
      }*/
      if (event.id == "follow") {
        const fresh: Followers = {date: Date.now(), followers: [meta.username]};
        pushFreshFollow(fresh);
      };
    });
  },
};

export default script;
