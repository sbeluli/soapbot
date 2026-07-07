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
    APIEmbed,
    ChannelType,
    ChatInputCommandInteraction,
    GuildTextBasedChannel,
    SlashCommandBuilder,
} from "discord.js";
import { Command, RemindMeData } from "../definitions";
import pubsub from "pubsub-js";
import logger from "../../lib/logging";

const numToString = new Map<number, string>([
    [60000, "minute(s)"],
    [3600000, "hour(s)"],
    [86400000, "day(s)"],
]);

const RemindMe: Command = {
    data: new SlashCommandBuilder()
        .setName("remindme")
        .setDescription("Set up a one time ping as a reminder. (May induce dementia)")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("The message to send")
                .setRequired(true)
                .setMaxLength(950)
                .setMinLength(1)
        )
        .addNumberOption((option) =>
            option
                .setName("time_units")
                .setDescription("The units of the time you want to input. Default: hours")
                .setChoices(
                    { name: "minutes", value: 60000 },
                    { name: "hours", value: 3600000 },
                    { name: "days", value: 86400000 }
                )
        )
        .addNumberOption((option) =>
            option
                .setName("time")
                .setDescription(
                    "How far in the future you want to be reminded, in time_units. Default: 1"
                )
                .setMinValue(0)
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to remind you in. Default: Current Channel")
                // Ensure the user can only select a TextChannel for output
                .addChannelTypes(ChannelType.GuildText)
        )
        .addBooleanOption((option) =>
            option
                .setName("ephemeral")
                .setDescription(
                    "Whether the confirmation message can only be seen by you (true) or everyone (false). Default: true"
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const message = interaction.options.getString("message");
        const timeMult = interaction.options.getNumber("time_units") ?? 3600000;
        const time = interaction.options.getNumber("time") ?? 1;
        let channelInput = interaction.options.getChannel(
            "channel"
        ) as GuildTextBasedChannel;
        const channel = channelInput ?? interaction.channel;
        const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;

        const data: RemindMeData = {
            guildId,
            userId,
            channelId: channel.id,
            message,
            time,
            timeMult,
        };
        const page: APIEmbed = {
            title: "Reminder Set",
            fields: [
                {
                    name: "User",
                    value: `<@${userId}>`,
                },
                {
                    name: "Message",
                    value: message,
                },
                {
                    name: "Time",
                    value: `${time} ${numToString.get(timeMult)}`,
                },
                {
                    name: "Channel",
                    value: `<#${channel.id}>`,
                },
            ],
        };

        // if the channel inputted is not accessible to the bot, send error to the user
        if (channelInput) {
            const me = await interaction.guild.members.fetchMe();
            if (
                channelInput
                    .permissionsFor(me)
                    .has(["0x0000000000000800", "0x0000000000000400"]) // send messages, view channel
            ) {
                pubsub.publish("remindme", data);
                await interaction
                    .reply({
                        embeds: [page],
                        ephemeral: ephemeral,
                    })
                    .catch((reason) =>
                        logger.error(reason, {
                            file: "RemindMe.ts",
                            interactionId: interaction.id,
                            command: interaction.commandName,
                            guildId: interaction.guildId,
                        })
                    );
            } else {
                await interaction
                    .reply({
                        content: "I don't have access to that channel. Sorry :(",
                        ephemeral: true,
                    })
                    .catch((reason) =>
                        logger.error(reason, {
                            file: "RemindMe.ts",
                            interactionId: interaction.id,
                            command: interaction.commandName,
                            guildId: interaction.guildId,
                        })
                    );
                return;
            }
        } else {
            pubsub.publish("remindme", data);
            await interaction
                .reply({
                    embeds: [page],
                    ephemeral: ephemeral,
                })
                .catch((reason) =>
                    logger.error(reason, {
                        file: "RemindMe.ts",
                        interactionId: interaction.id,
                        command: interaction.commandName,
                        guildId: interaction.guildId,
                    })
                );
        }
    },
};
export default RemindMe;
