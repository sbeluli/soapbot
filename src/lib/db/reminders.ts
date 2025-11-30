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
import { get, runWithParams } from "../../scripts/sqlite/sqlite_lib";
import { RemindMeData } from "../../commands/definitions";
import logger from "../../lib/logging";

export interface Reminder {
    id?: string;
    guild_id: string;
    user_id: string;
    channel_id: string;
    message: string;
    date: string;
}

export const formatReminder = (reminder: RemindMeData): Reminder => {
    const date = new Date(Date.now() + reminder.time * reminder.timeMult).toISOString();
    return {
        guild_id: reminder.guildId,
        user_id: reminder.userId,
        channel_id: reminder.channelId,
        message: reminder.message,
        date: date,
    };
};

export const addReminder = async (reminder: Reminder) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await runWithParams(
            db,
            "INSERT INTO reminders (guild_id, user_id, channel_id, message, date) " +
                `VALUES (?, ?, ?, ?, ?)`,
            [
                reminder.guild_id,
                reminder.user_id,
                reminder.channel_id,
                reminder.message,
                reminder.date,
            ]
        );
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully added new reminder.");
        db.close();
    }
};

export const fetchSoonestReminder = async () => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        const res: Reminder = await get(
            db,
            "SELECT * FROM reminders WHERE date=(SELECT min(date) FROM reminders) LIMIT 1"
        );
        return res;
    } catch (error) {
        logger.error(error);
    } finally {
        db.close();
    }
};

export const deleteReminder = async (reminder: Reminder) => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        return await runWithParams(db, "DELETE FROM reminders WHERE id=?", [reminder.id]);
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("successfully deleted reminder: " + reminder.id);
        db.close();
    }
};
