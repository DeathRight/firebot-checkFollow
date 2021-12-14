import { ReplaceVariable } from "firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { checkFollow } from "../constants";

/**
 * @async
 * @param {string} username - username to check
 * @returns {Promise<Boolean>} Promise<Boolean> if user follows
 */
export const CheckFollowVariable: ReplaceVariable = {
    definition: {
        handle: 'checkFollow',
        usage: 'checkFollow[username]',
        description: 'Returns true or false depending on if the user follows the streamer',
        possibleDataOutput: ["text"],
    },
    evaluator: async (_, username: string): Promise<boolean> => await checkFollow(username),
};