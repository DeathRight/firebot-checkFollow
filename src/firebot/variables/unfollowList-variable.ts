import { ID } from "../constants";
import { ReplaceVariable } from "firebot-custom-scripts-types/types/modules/replace-variable-manager";

export const unfollowListVariable: ReplaceVariable = {
    definition: {
        handle: "unfollowList",
        triggers: { event: [`${ID.source}:${ID.event}`] },
        description: "Returns a string list of unfollows from unfollow event, formatted as: '[\"username1\",\"username2\"]'",
        examples: [
            {
                usage: "$arrayFind[$unfollowList, BigPimpinVoidkin]",
                description: "Uses arrayFind variable to find username \"BigPimpinVoidkin\" in unfollowList"
            }
        ],
        possibleDataOutput: ["text"]
    },
    evaluator: ({ metadata }) => JSON.stringify(metadata.eventData.unfollowList)
};