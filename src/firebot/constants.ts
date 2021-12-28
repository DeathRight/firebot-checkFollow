import { TwitchApi } from "firebot-custom-scripts-types/types/modules/twitch-api";
import { triggerUnfollow } from "./events/unfollow-event";
import { EventManager } from "firebot-custom-scripts-types/types/modules/event-manager";
import Differify from "@netilon/differify";
import { Logger } from "firebot-custom-scripts-types/types/modules/logger";
import { ApiClient, HelixFollow, HelixFollowData, HelixPaginatedRequestWithTotal } from "firebot-custom-scripts-types/node_modules/@twurple/api/lib";
import { HelixPaginatedFollowFilter } from "@twurple/api/lib/api/helix/user/HelixUserApi";

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
let latestFollows: number = -1;

export const setLogger = (log: Logger): void => {
    logger = log;
};
export const pushPromise = async (prom: Promise<Followers>): Promise<void> => {
    try {
        const latest = gFollows.push(prom);
        prom.then(() => latestFollows = latest-1);
        prom.catch(e => logger.error('Bro...? checkFollow error: ' + e));
    } catch (e) {
        logger.error(`pushPromise error: ${e}`);
    }
};

export const pushFreshFollow = (freshFollow: Followers): void => {
    freshFollows.push(freshFollow);
    logger.debug("pushFreshFollow ran: Date(" + freshFollow.date.toString() + "), Followers(" + freshFollow.followers.toString() + ")");
};

export const getFollowers = async (i?: number): Promise<Followers> => {
    i = i ? i : (latestFollows >= 0 ? latestFollows : (gFollows.length - 1));
    try {
        return await gFollows[i];
    } catch (e) {
        logger.error(`getFollowers encountered an error @ gFollows[${i}] and is attempting rollback. Cause: ${e}`);
        try { //try rollback
            if (i - 1 >= 0) { //keep trying previous
                return await getFollowers(i - 1);
            } else if (i != latestFollows) { //then try latest if not already
                return await gFollows[latestFollows]
            } else if (gFollows.length >= 1 && i != (gFollows.length-1)) {
                //then try latest gFollows if not already
                return await gFollows[gFollows.length-1];
            } else { //give up
                throw new Error(`getFollowers rollback failed! D: Better luck next time... | Cause: ${e}`);
            }
        } catch (ee) { //give up
            throw new Error(`getFollowers couldn't retrieve gFollows[${i}]. Cause: ${ee}`);
        }
    }
};

const checkDiff = (arr: any): string[] => {
    //logger.debug("checkDiff: " + JSON.stringify(arr));
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
            const prev = await getFollowers(latestFollows-1);
            const cur = await getFollowers();
            if (cur === prev) { //no need to compare
                return [];
            }
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

/*
* CONCAT FOLLOWERS STUFF
*/
const roundTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
const timer = (ms: number) => new Promise(res => setTimeout(res, ms));

let retries: number = 0;
const tryConcat = async (client: ApiClient,
    userFollows: HelixPaginatedRequestWithTotal<HelixFollowData, HelixFollow>,
    follows?: string[]): Promise<string[]> => {
    let start = Date.now();
    let flwrs: string[] = follows ? follows : [];
    try {
        let lastStep = Date.now();
        do {
            //check if we're about to reach rate limit
            //leave (hopefully) plenty of room for other async reqs
            if (client.lastKnownRemainingRequests <= 50) {
                const resetTime = client.lastKnownResetDate;
                logger.debug(`concatFollowers is waiting to not reach rate limit. Will resume in [${resetTime.getSeconds()}s]`);
                await timer(resetTime.getTime());
            }

            const data = await userFollows.getNext();
            if (!data.length) {
                break;
            }
            flwrs = flwrs.concat(data.map((v) => v.userName));
            
            //if taking a while, update end-user via console
            if (Date.now() - lastStep >= 5000) {
                const fLen = flwrs.length;
                const fTot = await userFollows.getTotalCount();
                const prcnt = roundTwo((fLen / fTot) * 100) + "%"
                const tSecs = roundTwo((Date.now() - start) / 1000) + "s";
                logger.debug(`concatFollowers fetching. ${prcnt} done. Total time: [${tSecs}]. Total fetched: [${fLen}] of [${fTot}]`);
                lastStep = Date.now();
            };
        } while (userFollows.currentCursor);
        retries = 0;
        return flwrs;
    } catch(e) {
        if (retries < 3 && userFollows.currentCursor !== undefined) {
            logger.debug(`concatFollowers encountered an error while fetching. Attempting to continue... | Cause: ${e}`);
            await timer(1000); //give the server some breathing room
            retries++;
            return await tryConcat(client,userFollows,flwrs);
        } else {
            throw new Error(`tryConcat failed with 3 retries. Cause: ${e}`);
        }
    }
}

/**
 * Hooks to twitch `api` and paginates across all followers of `flwFrom`, adding them to one big string array for searching
 * @param {TwitchApi} api
 * @param {string} flwdUser - the user to get follows of
 * @return {Promise<Followers>} A promise of Followers type, containing properties for time (`date`) created and the string[] list of `followers`
 */
export const concatFollowers = async (api: TwitchApi, flwdUser: string, em: EventManager): Promise<Followers> => {
    const start = Date.now();
    const client: ApiClient = api.getClient();
    const users = client.users;
    const Filter: HelixPaginatedFollowFilter = {
        followedUser: (await users.getUserByName(flwdUser)).id,
        limit: 100,
    };
    
    logger.debug(`Running concatFollowers @ [${start}]`);

    let flwrs: string[] = [];
    let userFollows: HelixPaginatedRequestWithTotal<HelixFollowData,HelixFollow> = users.getFollowsPaginated(Filter);
    let lastStep = Date.now();
    try {
        userFollows.reset();
        flwrs = await tryConcat(client,userFollows);
        const arr: Followers = { date: Date.now(), followers: flwrs };
        logger.info(`[${arr.date - start}ms] concatFollowers just fetched new followers list @ time [${arr.date}] with follower count [${arr.followers.length}]`);
        freshFollows = []; //clear freshFollows since we got all now
        return arr
    } catch (e) {
        throw new Error(`concatFollowers encountered an error while fetching. `);
    };
};
/*
*END CONCAT FOLLOWERS STUFF
*/
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
    //logger.debug(`[${Date.now() - start}ms] checkFollow[${username}] returned: ${ret}`);
    return ret;
};