import { TwitchApi } from "firebot-custom-scripts-types/types/modules/twitch-api";
import { HelixPaginatedFollowFilter } from "@twurple/api/lib/api/helix/user/HelixUserApi";
import { triggerUnfollow } from "./events/unfollow-event";
import { EventManager } from "firebot-custom-scripts-types/types/modules/event-manager";
import { Differify } from "@netilon/differify";

const differify = new Differify();

export const ID = {
    source: "bpvk-checkfollow",
    event: "unfollow"
};

export type Followers = {
    date: number,
    followers: string[]
};

const gFollows: Promise<Followers>[] = new Array();
const freshFollows: Followers[] = [];

export const pushPromise = async (prom: Promise<Followers>): Promise<void> => {
    gFollows.push(prom);
    prom.catch(e => console.error('Bro...? checkFollow error:',e));
};

export const pushFreshFollow = (freshFollow: Followers): void => {
    freshFollows.push(freshFollow);
    console.info("pushFreshFollows ran: Date(" + freshFollow.date.toString() + "), Followers(" + freshFollow.followers.toString() + ")");
};

export const getFollowers = async (): Promise<Followers> => {
    return (await gFollows[gFollows.length-1]);
};

export const getUnfollows = async (em: EventManager): Promise<string[]> => {
    let unfollows: string[];
    if (gFollows.length > 1) {
        const prev = await gFollows[gFollows.length-2];
        const cur = await gFollows[gFollows.length-1];
        unfollows = differify.applyLeftChanges(differify.compare(prev.followers,cur.followers), true);
    };
    if (gFollows.length > 2) {
        //cleanup
        gFollows.splice(0,gFollows.length-2);
    };
    if (unfollows.length > 0) {
        triggerUnfollow(unfollows,em); //trigger unfollow event
    };
    return unfollows;
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
        followedUser: await users.getUserByName(flwdUser),
        limit: 100,
    };
    let flwrs: string[];
    let userFollows = await users.getFollows(Filter);
    
    //keep getting next page until we've got 'em all
    for (let f = 0; f < userFollows.total; f += (userFollows.data.length-1)) {
        for (let i = 0; i < userFollows.data.length; i++) {
            const e = userFollows.data[i];
            if (e === undefined) { //idk how this would happen
                break;
            };
            if (!flwrs.includes(e.userName)) { //idk how this would happen either
                flwrs.push(e.userName);
            };
        };
        Filter.after = userFollows.cursor;
        userFollows = await users.getFollows(Filter);
    };
    const arr: Followers = {date: Date.now(), followers: flwrs};
    console.debug('[' + (arr.date - start).toString() + 'ms] concatFollowers just created a new Followers object @ time (' + arr.date.toString() + '), with followers: [' + arr.followers.toString() + ']');
    getUnfollows(em); //attempt async trigger unfollow event
    return arr;
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
        const fFlws: Followers = freshFollows.find((e,i): boolean => {
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
                freshFollows.splice(fInd,1);
                //... and add to unfollows list if not already there
                /*if (!unfollows.includes(username)) {
                    unfollows.push(username);
                }*/
            };
        };
    };
    console.debug('[' + (Date.now() - start).toString() + 'ms] checkFollows returned: ' + ret);
    return ret;
};