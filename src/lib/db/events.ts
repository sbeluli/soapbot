/*
 * Copyright (C) 2024  Sage Beluli
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact details for information regarding this program and its license
 * can be found on sophiabeluli.ca
 */

import sqlite3 from "sqlite3";
import {
    allWithParams,
    getWithParams,
    runWithParams,
} from "../../scripts/sqlite/sqlite_lib";
import {
    GuildScheduledEvent,
    GuildScheduledEventStatus,
    PartialGuildScheduledEvent,
} from "discord.js";
import logger from "../../lib/logging";

export interface DiscordEvent {
    id: string;
    guild_id: string;
    role_id: string;
    name?: string;
    description?: string;
    scheduled_start_at?: string;
    scheduled_end_at?: string;
    subscriber_num?: number;
    location?: string;
    image_url?: string;
    is_past: boolean;
}

export const formatEvent = (
    event: GuildScheduledEvent<GuildScheduledEventStatus> | PartialGuildScheduledEvent,
    roleID: string
) => {
    return {
        id: event.id,
        guild_id: event.guildId,
        role_id: roleID,
        name: event.name,
        description: event.description,
        scheduled_start_at: event.scheduledStartAt?.toISOString(),
        scheduled_end_at: event.scheduledEndAt?.toISOString(),
        subscriber_num: event.userCount,
        location: event.entityMetadata?.location,
        image_url: event.coverImageURL({ extension: "png", size: 4096 }),
        is_past: false,
    };
};

export const fetchEvent = async (eventId: string): Promise<DiscordEvent> => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        const res: DiscordEvent = await getWithParams(
            db,
            "SELECT * FROM events WHERE id=?",
            [eventId]
        );
        return res;
    } catch (error) {
        logger.error(error);
    } finally {
        db.close();
    }
};

export const fetchCurrentEventsByGuild = async (guildId: string) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        const res: DiscordEvent[] = await allWithParams(
            db,
            "SELECT * FROM events WHERE guild_id=? AND is_past=?",
            [guildId, false]
        );
        return res;
    } catch (error) {
        logger.error(error);
    } finally {
        db.close();
    }
};

export const fetchPastEventsByGuild = async (guildId: string) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        const res: DiscordEvent[] = await allWithParams(
            db,
            "SELECT * FROM events WHERE guild_id=? AND is_past=TRUE ORDER BY scheduled_end_at LIMIT 50",
            [guildId]
        );
        return res;
    } catch (error) {
        logger.error(error);
    } finally {
        db.close();
    }
};

export const addNewEvent = async (event: DiscordEvent) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await runWithParams(
            db,
            "INSERT INTO events (id, guild_id, role_id, name, description, scheduled_start_at, subscriber_num, location, image_url, is_past) " +
                `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [
                event.id,
                event.guild_id,
                event.role_id,
                event.name,
                event.description,
                event.scheduled_start_at,
                1,
                event.location,
                event.image_url,
            ]
        );
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully added new event: " + event.name);
        db.close();
    }
};

export const updateToPastEvent = async (event: DiscordEvent) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await runWithParams(
            db,
            "UPDATE events SET name=?, description=?, scheduled_start_at=?, location=?, image_url=?, scheduled_end_at=?, is_past=TRUE WHERE id=?",
            [
                event.name,
                event.description,
                event.scheduled_start_at,
                event.location,
                event.image_url,
                event.scheduled_end_at || new Date().toISOString(),
                event.id,
            ]
        );
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully updated to past event: " + event.name);
        db.close();
    }
};

export const update = async (event: DiscordEvent) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await runWithParams(
            db,
            "UPDATE events SET name=?, description=?, scheduled_start_at=?, location=?, image_url=? WHERE id=?",
            [
                event.name,
                event.description,
                event.scheduled_start_at,
                event.location,
                event.image_url,
                event.id,
            ]
        );
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully updated event: " + event.name);
        db.close();
    }
};

export const updateSubscriberNum = async (eventId: string, increment: boolean) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        const event = await fetchEvent(eventId);
        const newSubscriberNum = increment
            ? event.subscriber_num + 1
            : event.subscriber_num - 1;
        await runWithParams(db, "UPDATE events SET subscriber_num=? WHERE id=?", [
            newSubscriberNum,
            event.id,
        ]);
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully updated subscriber num");
        db.close();
    }
};

export const updateSubscriberNumTotal = async (
    eventId: string,
    subscriberNum: number
) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await runWithParams(db, "UPDATE events SET subscriber_num=? WHERE id=?", [
            subscriberNum,
            eventId,
        ]);
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully updated total subscriber num");
        db.close();
    }
};
