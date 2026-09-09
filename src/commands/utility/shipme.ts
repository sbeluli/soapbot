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

import { RepliableInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../definitions.js";
import logger from "../../lib/logging.js";

const ShipMe: Command = {
    data: new SlashCommandBuilder().setName("shipme").setDescription("owo"),
    async execute(interaction: RepliableInteraction) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        let members = await interaction.guild.members.fetch();
        members.delete(interaction.client.user.id); // delete the bot
        members.delete(interaction.user.id); // delete the user using the command
        const bottom = members.at(Math.floor(Math.random() * members.size));
        await interaction
            .reply(`I ship ${interaction.user.username} with ${bottom.user.username}!`)
            .catch((reason) =>
                logger.error(reason, {
                    file: "ShipMe.ts",
                    interactionId: interaction.id,
                    guildId: interaction.guildId,
                })
            );
    },
};
export default ShipMe;
