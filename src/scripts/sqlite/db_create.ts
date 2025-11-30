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
import { execute } from "./sqlite_lib";
import logger from "../../lib/logging";

const createDB = async () => {
    const db = new sqlite3.Database("soapbot.db");
    try {
        await execute(
            db,
            "CREATE TABLE IF NOT EXISTS events (" +
                "id TEXT PRIMARY KEY, " +
                "guild_id TEXT NOT NULL, " +
                "role_id TEXT, " +
                "name TEXT, " +
                "description TEXT, " +
                "scheduled_start_at TEXT, " +
                "scheduled_end_at TEXT, " +
                "subscriber_num INTEGER, " +
                "location TEXT, " +
                "image_url TEXT, " +
                "is_past BOOLEAN NOT NULL" +
                ")"
        );
    } catch (error) {
        logger.error(error);
    } finally {
        logger.info("Table 'events' created successfully!");
        db.close();
    }
};

createDB();
