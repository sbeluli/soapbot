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
import pubsub from "pubsub-js";

const PastEvents: Command = {
    data: new SlashCommandBuilder()
        .setName("pastevents")
        .setDescription(
            "Lists details of the past events in the server, starting from the most recently finished event."
        ),
    async execute(interaction: RepliableInteraction) {
        await interaction.deferReply();
        pubsub.publish("pastevents", interaction);
    },
};
export default PastEvents;
