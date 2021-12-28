import { Firebot } from "firebot-custom-scripts-types";
import { concatFollowers, Followers, pushPromise, pushFreshFollow, setLogger, getUnfollows } from './firebot/constants';
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
    param.interval = param.interval > 30 ? param.interval : 30;
    
    const god = (param.username) === "" ? runRequest.firebot.accounts.streamer.username : param.username;
    setLogger(logger);
    logger.info(`CheckFollow interval: ${param.interval}, username: ${god}`);

    const first = concatFollowers(twitchApi, god, eventManager);
    pushPromise(first);
    let listening: boolean = false;
    if (runRequest.parameters.interval >= 30) {
      interval(async () => {
        try {
          if (listening == false) {
            listening = true;
            await first;
            const prom = concatFollowers(twitchApi, god, eventManager);
            pushPromise(prom);
            await prom;
            await getUnfollows(eventManager);
            listening = false;
          }
        } catch (e) {
          logger.error(`CheckFollows interval-promise caught error: ${e}`);
          listening = false;
          return;
        };
      }, param.interval*1000).catch(e => logger.error('Bro...? interval-promise error:',e));
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
        const fresh: Followers = {date: Date.now(), followers: [meta.username.toLowerCase()]};
        pushFreshFollow(fresh);
      };
    });
  },
};

export default script;
