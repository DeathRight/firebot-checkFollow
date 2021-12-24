import { EventSource } from "firebot-custom-scripts-types/types/modules/event-manager";
import { ID } from "../constants";

export const unfollowSourceDef: EventSource = {
    id: ID.source,
    name: "Bpvk CheckFollow events",
    events: [
        {
            id: ID.event,
            name: "Unfollow",
            description: "When someone unfollows"
        }
    ]
};