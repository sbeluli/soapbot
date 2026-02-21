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

import { APIEmbed, RepliableInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../definitions";
import logger from "../../lib/logging";

const Help: Command = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Lists bot usage information."),
    async execute(interaction: RepliableInteraction) {
        const page: APIEmbed = {
            color: 0x0099ff,
            title: "Help",
            url: "https://github.com/sbeluli/soapbot",
            description: `### Description\nA role manager bot for discord that deals with managing roles for events.\n
                - Creates role for event on event creation, and deletes the role when the event is canceled/finished.
- Assigns role to users who tick interested, and unassigns role when they untick.
- Roles have the same name as the event for easy searching/pinging.\n### Slash Commands`,
            fields: [
                {
                    name: "/pastevents",
                    value: "Lists details of the past events in the server, starting from the most recently finished event.",
                },
                {
                    name: "/remindme",
                    value: "Set up a one time ping as a reminder.",
                },
            ],
            footer: {
                text: "Read the wiki for more information: https://github.com/sbeluli/soapbot/wiki/Slash-Commands",
            },
        };

        await interaction
            .reply({
                embeds: [page],
            })
            .catch((reason) =>
                logger.error(reason, {
                    file: "user.ts",
                    interactionId: interaction.id,
                    guildId: interaction.guildId,
                })
            );
    },
};
export default Help;
