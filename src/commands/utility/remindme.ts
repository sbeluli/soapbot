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
import { Command, RemindMeDateData, RemindMeTimeData } from "../definitions";
import pubsub from "pubsub-js";
import logger from "../../lib/logging";

const numToString = new Map<number, string>([
    [60000, "minute(s)"],
    [3600000, "hour(s)"],
    [86400000, "day(s)"],
]);

const sendErrorMessage = async (
    interaction: ChatInputCommandInteraction,
    msg: string
) => {
    await interaction
        .reply({
            content: msg,
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
};

const RemindMe: Command = {
    data: new SlashCommandBuilder()
        .setName("remindme")
        .setDescription("Set up a one time ping as a reminder. (May induce dementia)")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("time")
                .setDescription("Make a reminder for a specific amount of time from now.")
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
                        .setDescription(
                            "The units of the time you want to input. Default: hours"
                        )
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
                        .setDescription(
                            "The channel to remind you in. Default: Current Channel"
                        )
                        // Ensure the user can only select a TextChannel for output
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("ephemeral")
                        .setDescription(
                            "Whether the confirmation message can only be seen by you (true) or everyone (false). Default: true"
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("date")
                .setDescription("Make a reminder for a certain date.")
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
                        .setName("year")
                        .setDescription("The year number. Default: current")
                        .setMinValue(new Date().getFullYear())
                        .setMaxValue(250000)
                )
                .addNumberOption((option) =>
                    option
                        .setName("month")
                        .setDescription("The month. Default: current")
                        .setChoices(
                            { name: "January", value: 0 },
                            { name: "February", value: 1 },
                            { name: "March", value: 2 },
                            { name: "April", value: 3 },
                            { name: "May", value: 4 },
                            { name: "June", value: 5 },
                            { name: "July", value: 6 },
                            { name: "August", value: 7 },
                            { name: "September", value: 8 },
                            { name: "October", value: 9 },
                            { name: "November", value: 10 },
                            { name: "December", value: 11 }
                        )
                )
                .addNumberOption((option) =>
                    option
                        .setName("day")
                        .setDescription("The numbered day of the month. Default: current")
                        .setMinValue(1)
                        .setMaxValue(31)
                )
                .addNumberOption((option) =>
                    option
                        .setName("hour")
                        .setDescription(
                            "The hour, in military time (0-23). Default current + 1"
                        )
                        .setMinValue(0)
                        .setMaxValue(23)
                )
                .addNumberOption((option) =>
                    option
                        .setName("minute")
                        .setDescription("The minute. Default 0.")
                        .setMinValue(0)
                        .setMaxValue(59)
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel to remind you in. Default: Current Channel"
                        )
                        // Ensure the user can only select a TextChannel for output
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("ephemeral")
                        .setDescription(
                            "Whether the confirmation message can only be seen by you (true) or everyone (false). Default: true"
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const message = interaction.options.getString("message");
        const timeMult = interaction.options.getNumber("time_units") ?? 3600000;
        const time = interaction.options.getNumber("time") ?? 1;
        const year = interaction.options.getNumber("year") ?? new Date().getFullYear();
        const month = interaction.options.getNumber("month") ?? new Date().getMonth();
        const day = interaction.options.getNumber("day") ?? new Date().getDate();
        const hour = interaction.options.getNumber("hour") ?? new Date().getHours() + 1;
        const minute = interaction.options.getNumber("minute") ?? 0;
        let channelInput = interaction.options.getChannel(
            "channel"
        ) as GuildTextBasedChannel;
        const channel = channelInput ?? interaction.channel;
        const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
        let data: RemindMeTimeData | RemindMeDateData;
        let page: APIEmbed;

        // if the channel inputted is not accessible to the bot, send error to the user
        if (channelInput) {
            const me = await interaction.guild.members.fetchMe();
            if (
                !channelInput
                    .permissionsFor(me)
                    .has(["0x0000000000000800", "0x0000000000000400"]) // send messages, view channel
            ) {
                sendErrorMessage(
                    interaction,
                    "I don't have access to that channel. Sorry :("
                );
                return;
            }
        }

        switch (interaction.options.getSubcommand()) {
            case "time":
                data = {
                    guildId,
                    userId,
                    channelId: channel.id,
                    message,
                    time: time * timeMult,
                    commandName: interaction.options.getSubcommand(),
                };

                page = {
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
                pubsub.publish("remindmetime", data);
                break;
            case "date":
                // check if date is valid
                let now = new Date();
                let date = new Date();
                const yearIsNow = now.getFullYear() === year;
                const monthIsNow = yearIsNow && now.getMonth() === month;
                const dayIsNow = monthIsNow && now.getDate() === day;
                const hourIsNow = dayIsNow && now.getHours() === hour;

                try {
                    try {
                        date.setFullYear(year);
                    } catch {
                        // for some reason
                        sendErrorMessage(
                            interaction,
                            "Error: The set year is not valid."
                        );
                        return;
                    }
                    if (yearIsNow && now.getMonth() > month) {
                        sendErrorMessage(
                            interaction,
                            "Error: The set month is in the past."
                        );
                        return;
                    }
                    date.setMonth(month);
                    if (monthIsNow && now.getDate() > day) {
                        sendErrorMessage(
                            interaction,
                            "Error: The set day is in the past."
                        );
                        return;
                    }
                    date.setDate(day);
                    if (dayIsNow && now.getHours() > hour) {
                        sendErrorMessage(
                            interaction,
                            "Error: The set hour is in the past."
                        );
                        return;
                    }
                    date.setHours(hour);
                    if (hourIsNow && now.getMinutes() > minute) {
                        sendErrorMessage(
                            interaction,
                            "Error: The set minute is in the past."
                        );
                        return;
                    }
                    date.setMinutes(minute);
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                } catch (err) {
                    sendErrorMessage(
                        interaction,
                        "There was a problem setting the date. Please contact the developer."
                    );
                    logger.error(err as string, {
                        event: "remindMe date",
                        userId: userId,
                        guildId: guildId,
                    });
                    return;
                }

                // create data and send
                data = {
                    guildId,
                    userId,
                    channelId: channel.id,
                    message,
                    date,
                    commandName: interaction.options.getSubcommand(),
                };
                page = {
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
                            name: "Date",
                            value: `${date.toLocaleString()}`,
                        },
                        {
                            name: "Channel",
                            value: `<#${channel.id}>`,
                        },
                    ],
                };
                pubsub.publish("remindmedate", data);
                break;
            default:
                sendErrorMessage(interaction, "idk what happened :( try again");
                logger.error("subcommand name doesn't exist", {
                    event: "remindMe",
                    userId: userId,
                    guildId: guildId,
                });
                return;
        }

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
    },
};
export default RemindMe;
