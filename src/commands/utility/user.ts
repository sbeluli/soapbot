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

import { GuildMember, RepliableInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../definitions.js";
import logger from "../../lib/logging.js";

const User: Command = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Provides information about the user."),
    async execute(interaction: RepliableInteraction) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        await interaction
            .reply(
                `This command was run by ${interaction.user.username}, who joined on ${
                    (interaction.member as GuildMember)?.joinedAt
                }.`
            )
            .catch((reason) =>
                logger.error(reason, {
                    file: "user.ts",
                    interactionId: interaction.id,
                    guildId: interaction.guildId,
                })
            );
    },
};
export default User;
