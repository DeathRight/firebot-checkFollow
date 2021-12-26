import { TwitchApi } from "firebot-custom-scripts-types/types/modules/twitch-api";
import { HelixPaginatedFollowFilter } from "@twurple/api/lib/api/helix/user/HelixUserApi";
import { triggerUnfollow } from "./events/unfollow-event";
import { EventManager } from "firebot-custom-scripts-types/types/modules/event-manager";
import Differify from "@netilon/differify";
import { Logger } from "firebot-custom-scripts-types/types/modules/logger";

const differify = new Differify({ compareArraysInOrder: false });
let logger: Logger;

export const ID = {
    source: "bpvk-checkfollow",
    event: "unfollow"
};

export type Followers = {
    date: number,
    followers: string[]
};

const gFollows: Promise<Followers>[] = new Array();
let freshFollows: Followers[] = [];

export const setLogger = (log: Logger): void => {
    logger = log;
};
export const pushPromise = async (prom: Promise<Followers>): Promise<void> => {
    try {
        gFollows.push(prom);
        prom.catch(e => logger.error('Bro...? checkFollow error: ' + e));
    } catch (e) {
        logger.error(`pushPromise error: ${e}`);
    }
};

export const pushFreshFollow = (freshFollow: Followers): void => {
    freshFollows.push(freshFollow);
    logger.debug("pushFreshFollows ran: Date(" + freshFollow.date.toString() + "), Followers(" + freshFollow.followers.toString() + ")");
};

export const getFollowers = async (i?: number): Promise<Followers> => {
    i = i ? i : (gFollows.length - 1);
    try {
        return await gFollows[i];
    } catch (e) {
        throw new Error(`getFollowers couldn't retrieve gFollows[${i}]. Cause: ${e}`);
    }
};

const checkDiff = (arr: any): string[] => {
    logger.debug("checkDiff: " + JSON.stringify(arr));
    let ret: string[] = [];
    for (let i = 0; i <= arr.length; i++) {
        if (arr[i] && !(typeof arr[i] == "boolean")) {
            ret.push(arr[i].original);
        }
    }
    return ret;
};
export const getUnfollows = async (em: EventManager): Promise<string[]> => {
    let unfollows: string[];
    const start = Date.now();
    try {
        if (gFollows.length > 1) {
            const prev = await getFollowers(gFollows.length - 2);
            const cur = await getFollowers();
            const diff = differify.compare(prev.followers, cur.followers);
            let diffres = differify.filterDiffByStatus(diff, "DELETED", true);
            //get only the original usernames that were modified in cur
            unfollows = checkDiff(diffres);
        };
        if (gFollows.length > 2) {
            //cleanup
            gFollows.splice(0, gFollows.length - 2);
        };
        if (unfollows.length > 0) {
            triggerUnfollow(unfollows, em); //trigger unfollow event
        };
        logger.info(`[${Date.now() - start}ms] getUnfollows ran, results: ${unfollows}`);
        return unfollows;
    } catch (e) {
        throw new Error(`getUnfollows encountered an error: ${e}`);
    };
};

/**
 * Hooks to twitch `api` and paginates across all followers of `flwFrom`, adding them to one big string array for searching
 * @param {TwitchApi} api
 * @param {string} flwdUser - the user to get follows of
 * @return {Promise<Followers>} A promise of Followers type, containing properties for time (`date`) created and the string[] list of `followers`
 */
export const concatFollowers = async (api: TwitchApi, flwdUser: string, em: EventManager): Promise<Followers> => {
    const start = Date.now();
    const client = api.getClient();
    const users = client.helix.users;
    const Filter: HelixPaginatedFollowFilter = {
        followedUser: (await users.getUserByName(flwdUser)).id,
        limit: 100,
    };
    let flwrs: string[] = [];
    logger.debug(`Running concatFollowers @ [${start}]`);
    //keep getting next page until we've got 'em all
    try {
        let userFollows = users.getFollowsPaginated(Filter);
        for await (const f of userFollows) {
            if (f !== undefined) { //idk how this would happen
                flwrs.push(f.userName);
            };
        };
        const arr: Followers = { date: Date.now(), followers: flwrs };
        logger.debug(`[${arr.date - start}ms] concatFollowers just fetched new followers list @ time [${arr.date}] with follower count [${arr.followers.length}]`);
        freshFollows = []; //clear freshFollows since we got all now
        return arr
    } catch (error) {
        throw new Error(`concatFollowers error: ${error}`);
    };
};
/**
 * Checks whether `username` is in the most recent follow list
 * @param  {string} username - username to check
 * @returns {Promise<boolean>} Whether user follows Streamer
 */
export const checkFollow = async (username: string): Promise<boolean> => {
    const start = Date.now();
    const flwrs = await getFollowers();
    let ret: boolean = flwrs.followers.includes(username);
    //if couldn't find in last concatFollowers list
    if (!ret) {
        let fInd: number = -1;
        const fFlws: Followers = freshFollows.find((e, i): boolean => {
            fInd = i;
            return e.followers.includes(username);
        });

        //if found in freshFollows
        if (fFlws != undefined) {
            //if fresh follow occured after last concatFollowers, then assume still following
            if ((fFlws.date - flwrs.date) >= 0) {
                ret = true;
            } else {
                //if fresh follow occured BEFORE last concatFollowers,
                //and last concatFollowers happened AFTER, they must have unfollowed; remove from list
                freshFollows.splice(fInd, 1);
            };
        };
    };
    logger.debug(`[${Date.now() - start}ms] checkFollow[${username}] returned: ${ret}`);
    return ret;
};