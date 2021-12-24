import { EventManager } from "firebot-custom-scripts-types/types/modules/event-manager";
import { ID } from "../constants";

export const triggerUnfollow = (unfollowList: string[], em: EventManager) => {
    em.triggerEvent(ID.source, ID.event, {
        unfollowList
    });
};