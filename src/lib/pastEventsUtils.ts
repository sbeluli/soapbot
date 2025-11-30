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

import {
    ActionRowBuilder,
    APIEmbed,
    ButtonBuilder,
    ComponentType,
    RepliableInteraction,
} from "discord.js";
import { fetchPastEventsByGuild } from "./db/events";
import logger from "../lib/logging";

const backId = "back";
const forwardId = "forward";
const firstId = "first";
const lastId = "last";
const backButton = new ButtonBuilder({
    style: 2,
    label: "◀",
    customId: backId,
    disabled: true,
});
const forwardButton = new ButtonBuilder({
    style: 2,
    label: "▶",
    customId: forwardId,
});
const firstButton = new ButtonBuilder({
    style: 2,
    label: "◀◀",
    customId: firstId,
    disabled: true,
});
const lastButton = new ButtonBuilder({
    style: 2,
    label: "▶",
    customId: lastId,
});

// Time

export const convertDateStringToDateTime = (date: string) => {
    const dateDate = new Date(date);
    const day = dateDate.toLocaleString("default", { day: "numeric" });
    const month = dateDate.toLocaleString("default", { month: "long" });
    const year = dateDate.toLocaleString("default", { year: "numeric" });
    const time = dateDate.toLocaleTimeString();

    return month + " " + day + ", " + year + " at " + time;
};

// Previous Events

export const listPreviousEvents = async (interaction: RepliableInteraction) => {
    let pageArray: APIEmbed[] = [];
    const events = await fetchPastEventsByGuild(interaction.guildId);

    if (!events) {
        try {
            interaction.editReply({
                content:
                    "Oops! Something went wrong fetching your events :( Please contact the developer.",
                components: [],
            });
            return;
        } catch (err) {
            logger.error(err);
        }
    }
    if (events.length === 0) {
        try {
            interaction.editReply({
                content: "There are no logged previous events.",
                components: [],
            });
            return;
        } catch (err) {
            logger.error(err);
        }
    }
    events.forEach((event, _index) => {
        let page: APIEmbed = {
            title: event.name,
            // description: event.description,
            // .setThumbnail(event.imageURL)
            fields: [
                {
                    name: "Description",
                    value: event.description,
                },
                {
                    name: "Location",
                    value: event.location?.toString() || "N/A",
                },
                {
                    name: "Number of Subscribers",
                    value: event.subscriber_num?.toString() || "N/A",
                },
                {
                    name: "Scheduled Start Date",
                    value:
                        event.scheduled_start_at || "N/A"
                            ? convertDateStringToDateTime(event.scheduled_start_at)
                            : "N/A",
                    inline: true,
                },
                {
                    name: "Scheduled End Date",
                    value: event.scheduled_end_at
                        ? convertDateStringToDateTime(event.scheduled_end_at)
                        : "N/A",
                    inline: true,
                },
            ],
            image: { url: event.image_url },
        };

        pageArray.push(page);
    });

    try {
        const response = await interaction.editReply({
            embeds: [pageArray[pageArray.length - 1]],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([firstButton])
                    .addComponents([backButton])
                    .addComponents([forwardButton])
                    .addComponents([lastButton]),
            ],
        });

        try {
            // the array is sorted from oldest to most recent
            // (for ease of being able to use shift/push functions),
            // but we want to display most recent to oldest.
            // we must iterate through the array BACKWARDS
            // back button -> index++
            // forward button -> index--
            let currentIndex = pageArray.length - 1;
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 3_600_000,
            });

            collector.on("collect", async (i) => {
                // update page index
                if (i.customId === backId) {
                    currentIndex++;
                } else if (i.customId === forwardId) {
                    currentIndex--;
                } else if (i.customId === firstId) {
                    currentIndex = pageArray.length - 1;
                } else {
                    currentIndex = 0;
                }

                // set button disabled state
                if (currentIndex < pageArray.length - 1) {
                    backButton.setDisabled(false);
                    firstButton.setDisabled(false);
                } else {
                    backButton.setDisabled(true);
                    firstButton.setDisabled(true);
                }
                if (currentIndex) {
                    forwardButton.setDisabled(false);
                    lastButton.setDisabled(false);
                } else {
                    forwardButton.setDisabled(true);
                    lastButton.setDisabled(true);
                }

                await i
                    .update({
                        embeds: [pageArray[currentIndex]],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents([firstButton])
                                .addComponents([backButton])
                                .addComponents([forwardButton])
                                .addComponents([lastButton]),
                        ],
                    })
                    .catch((err) => {
                        logger.error(err);
                    });
            });
        } catch (err) {
            logger.error(err);
        }
    } catch (err) {
        logger.error(err);
    }
};
