import { TwitchApi } from "firebot-custom-scripts-types/types/modules/twitch-api";
import { HelixPaginatedFollowFilter, HelixUserApi } from "@twurple/api/lib/api/helix/user/HelixUserApi";

export type Followers = {
    date: number,
    followers: string[]
};

/**
 * @type {Promise<Followers>[]}
 */
const gFollows: Promise<Followers>[] = new Array();
//const gFollows: Promise<Followers[]> = Promise.resolve<Followers[]>([]);

export const pushPromise = async (prom: Promise<Followers>): Promise<void> => {
    gFollows.push(prom);
    prom.catch(e => console.error('Bro...? checkFollow error:',e));
};

export const getFollowers = async (): Promise<string[]> => {
    const flws = await gFollows[gFollows.length];
    return flws.followers;
};

/**
 * @description Hooks to twitch and paginates across all followers, concatenating them to one big string array for searching
 * @async
 * @param {TwitchApi} api
 * @returns {Promise<Followers[]>} Promise<Followers[]>
 */
export const concatFollowers = async (api: TwitchApi): Promise<Followers> => {
    const start = Date.now();
    const client = api.getClient();
    const users = client.helix.users;
    const Filter: HelixPaginatedFollowFilter = {
        followedUser: await users.getUserByName("BigPimpinVoidkin"),
        limit: 100,
    };
    let flwrs: string[] = [];
    let userFollows = await users.getFollows(Filter);
    for (let f = 0; f < userFollows.total; f += userFollows.data.length) { //keep getting next page until we've got 'em all
        for (let i = 0; i < userFollows.data.length; i++) {
            const e = userFollows.data[i];
            if (!flwrs.includes(e.userName)) { //idk how this would happen
                flwrs.push(e.userName);
            }
        };
        Filter.after = userFollows.cursor;
        userFollows = await users.getFollows(Filter);
    };
    const arr: Followers = {date: Date.now(), followers: flwrs};
    console.debug('[' + (arr.date - start).toString() + 'ms] concatFollowers just created a new Followers object @ time (' + arr.date.toString() + '), with followers: [' + arr.followers.toString() + ']');
    return arr;
};
/**
 * @description checks whether username is in the follow list
 * @async
 * @param  {string} username - username to check
 * @param {Promise<Followers>} list - list of followers
 * @returns {Promise<boolean>} boolean - Whether user follows Streamer
 */
export const checkFollow = async (username: string): Promise<boolean> => {
    const start = Date.now();
    const flwrs = await getFollowers();
    console.debug('[' + (Date.now() - start).toString() + 'ms] checkFollows returned: ' + flwrs.includes(username))
    return flwrs.includes(username);
};