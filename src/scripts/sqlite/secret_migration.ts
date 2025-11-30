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
import "dotenv/config";
import { EventDetails } from "../..";
import { runWithParams } from "./sqlite_lib";
import { fileURLToPath } from "url";
import { dirname } from "path";
import logger from "../../lib/logging";

const fileNames = [
    process.env.SECRET_1 + ".json",
    process.env.SECRET_2 + ".json",
    process.env.SECRET_3 + ".json",
    process.env.SECRET_4 + ".json",
    process.env.SECRET_5 + ".json",
    process.env.SECRET_6 + ".json",
    process.env.SECRET_7 + ".json",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFile = (file: string) => {
    // Load Data
    if (!fs.existsSync(file)) {
        logger.warn("Event secret file doesnt exist: " + file);
        const content = JSON.stringify([]);
        try {
            fs.writeFileSync(file, content, "utf8");
        } catch (err) {
            logger.error(err);
        }
    }
    try {
        let previousEvents: Array<EventDetails> = JSON.parse(
            fs.readFileSync(file, "utf8")
        );

        return previousEvents;
    } catch (err) {
        logger.error(err);
        return [];
    }
};

const migrateSecrets = async () => {
    const db = new sqlite3.Database("soapbot.db");
    let counter = 0;
    logger.info(fileNames);

    for (const guild in fileNames) {
        const file = __dirname + "/" + fileNames[guild];
        const previousEvents = readFile(file);

        for (const event of previousEvents) {
            const {
                title,
                description,
                scheduledStartAt,
                scheduledEndAt,
                subscriberNum,
                location,
                imageURL,
            } = event;
            try {
                await runWithParams(
                    db,
                    "INSERT INTO events (id, guild_id, name, description, scheduled_start_at, scheduled_end_at, subscriber_num, location, image_url, is_past) " +
                        `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        "OLD_" + counter,
                        fileNames[guild],
                        title,
                        description,
                        scheduledStartAt,
                        scheduledEndAt,
                        subscriberNum,
                        location,
                        imageURL,
                        true,
                    ]
                );
                counter++;
            } catch (error) {
                logger.error(error);
            }
        }
    }

    logger.info("Secret files imported to db.");
    db.close();
};

migrateSecrets();
