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
import fs from "node:fs";
import { eventsRolesInfo } from "../..";
import { runWithParams } from "./sqlite_lib";
import { fileURLToPath } from "url";
import { dirname } from "path";
import logger from "../../lib/logging";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fileName = "saved.json";
const file = __dirname + "/" + fileName;

const readFile = () => {
    // Load Data
    if (!fs.existsSync(file)) {
        logger.warn("File doesnt exist");
        const content = JSON.stringify({});
        fs.writeFileSync(file, content, "utf8");
    }
    let eventRolesString = JSON.parse(fs.readFileSync(file, "utf8"));
    let eventsRoles = new Map<string, eventsRolesInfo>(Object.entries(eventRolesString));

    return eventsRoles;
};

const migrateSaved = async () => {
    const db = new sqlite3.Database("soapbot.db");
    const eventsRoles = readFile();

    for (const eventRole of eventsRoles) {
        const eventId = eventRole[0];
        const { role, guild, name, description, scheduledStartAt } = eventRole[1];
        try {
            await runWithParams(
                db,
                "INSERT INTO events (id, guild_id, role_id, name, description, scheduled_start_at, is_past) " +
                    `VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [eventId, guild, role, name, description, scheduledStartAt, false]
            );
        } catch (error) {
            logger.error(error);
        }
    }

    logger.info("Saved file imported to db.");
    db.close();
};

migrateSaved();
