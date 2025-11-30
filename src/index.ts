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

// Require the necessary discord.js classes
import {
    Collection,
    Events,
    GatewayIntentBits,
    GuildMember,
    GuildScheduledEvent,
    GuildScheduledEventStatus,
    GuildTextBasedChannel,
    OAuth2Guild,
    PartialGuildScheduledEvent,
    RepliableInteraction,
    User,
} from "discord.js";
import "dotenv/config";
import CustomClient from "./CustomClient";
import allCommands from "./commands";
import pubsub from "pubsub-js";
import { listPreviousEvents } from "./lib/pastEventsUtils";
import { RemindMeData } from "./commands/definitions";
import {
    addNewEvent,
    fetchCurrentEventsByGuild,
    fetchEvent,
    formatEvent,
    update,
    updateSubscriberNum,
    updateSubscriberNumTotal,
    updateToPastEvent,
} from "./lib/db/events";
import {
    addReminder,
    deleteReminder,
    fetchSoonestReminder,
    formatReminder,
} from "./lib/db/reminders";
import logger from "./lib/logging";

export interface eventsRolesInfo {
    // for lookup
    role: string;
    guild: string;

    // for future slash commands
    name: string;
    description: string;
    scheduledStartAt: Date;
}

export interface EventDetails {
    title: string;
    description: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    subscriberNum: number;
    location: string;
    imageURL: string;
}

const token = process.env.TOKEN;

let isReady = false; // flag to determine if initial routine is done
let reminderInterval: NodeJS.Timeout;

// Initial Routines

const updateEventsRoles = async () => {
    isReady = false;
    logger.info("start initial routine");
    // checks events in registered guilds and sees if they are in db
    // adds them to db if not
    // also checks subscribers and adds/removes roles from users
    addMissedEvents().then(() => {
        isReady = true; // we can set ready after this because deleted events wont effect incoming event changes
        console.log("ready");
    });
    // checks events in db and sees if they exist
    // deletes them from db if not
    deleteMissedEvents();
};

const addMissedEvents = async (): Promise<Collection<string, OAuth2Guild>> => {
    try {
        const guilds = await client.guilds.fetch();
        for (const guildInfo of guilds) {
            try {
                const guild = await guildInfo[1].fetch();
                const allMembers = await guild.members.fetch();
                const events = await guild.scheduledEvents.fetch();
                for (const [id, event] of events) {
                    let role: string;
                    const eventDB = await fetchEvent(id);
                    if (!eventDB) {
                        // make role if it doesn't exist
                        logger.info("role doesnt exist for " + event.name + "; creating");
                        role = await onCreateEvent(event);
                    } else {
                        logger.info("role exists for " + event.name);
                        role = eventDB.role_id;
                    }

                    if (!role) {
                        // exit if role null
                        logger.info("role null; continue to next event");
                        continue;
                    }

                    try {
                        const subscribers = await event.fetchSubscribers();
                        let unsubscribedMembers = new Collection<string, GuildMember>(
                            allMembers
                        );
                        // add role to subscribers
                        for (const [id, user] of subscribers) {
                            unsubscribedMembers.delete(id);
                            // add roles only to those who have don't have them and should
                            const member = guild.members.cache.find(
                                (member) => member.user.id === id
                            );
                            if (!member.roles.resolve(role)) {
                                try {
                                    let res = await guild.members.addRole({
                                        role: role,
                                        user: id,
                                    });

                                    if (res) {
                                        logger.info(
                                            `added missing role (${event.name}) to ${user.user.username}`
                                        );
                                    }
                                } catch (err) {
                                    logger.error(err);
                                }
                            }
                        }
                        // remove role for unsubscribers
                        for (const [id, member] of unsubscribedMembers) {
                            // remove roles only from those who have them and shouldn't
                            if (member.roles.resolve(role)) {
                                try {
                                    let res = await guild.members.removeRole({
                                        role: role,
                                        user: id,
                                    });
                                    if (res) {
                                        logger.info(
                                            `removed incorrect role (${event.name}) from ${member.user.username}`
                                        );
                                    }
                                } catch (err) {
                                    logger.error(err);
                                }
                            }
                        }
                        updateSubscriberNumTotal(id, subscribers.size);
                    } catch (err) {
                        logger.error(err);
                    }
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return guilds;
    } catch (err) {
        logger.error(err);
    }
};

const deleteMissedEvents = async (): Promise<void> => {
    try {
        const guilds = await client.guilds.fetch();
        for (const [guildId, OAuth2Guild] of guilds) {
            try {
                const events = await fetchCurrentEventsByGuild(guildId);
                const guild = await OAuth2Guild.fetch();
                for (const event of events) {
                    // if doesnt exist
                    if (!guild.scheduledEvents.resolve(event.id)) {
                        try {
                            await guild.roles.delete(event.role_id);
                        } catch (err) {
                            logger.error(err);
                        }
                        logger.info("old role deleted: " + event.role_id);
                        updateToPastEvent(event);
                    } else {
                        guild.scheduledEvents
                            .fetch(event.id)
                            .then(async (discordEv) => {
                                // is cancelled or is finished
                                if (discordEv.status === 3 || discordEv.status === 4) {
                                    try {
                                        await guild.roles.delete(event.role_id);
                                    } catch (err) {
                                        logger.error(err);
                                    }
                                    logger.info("old role deleted: " + event.role_id);
                                    updateToPastEvent(event);
                                }
                            })
                            .catch(logger.error);
                    }
                }
            } catch (err) {
                logger.error(err);
            }
        }
    } catch (err) {
        logger.error(err);
    }
};

// Events

const onCreateEvent = async (
    guildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>
): Promise<string> => {
    return guildScheduledEvent.guild.roles
        .create({
            name: guildScheduledEvent.name,
            mentionable: true,
            reason: "for event",
        })
        .then((role) => {
            logger.info("role created: " + role.name);
            addNewEvent(formatEvent(guildScheduledEvent, role.id));
            // add role to creator
            guildScheduledEvent.guild.members
                .addRole({
                    role: role,
                    user: guildScheduledEvent.creatorId,
                })
                .then(() =>
                    logger.info(
                        `added role (${guildScheduledEvent.name}) to creator: ${guildScheduledEvent.creatorId}`
                    )
                )
                .catch(logger.error);
            return role.id;
        })
        .catch((err): Promise<string> => {
            logger.error(err);
            return null;
        });
};

// Reminders

const checkReminders = async () => {
    const reminder = await fetchSoonestReminder();
    // if the reminder date is now or has passed
    if (reminder && new Date().toISOString().localeCompare(reminder.date) >= 0) {
        const { guild_id, user_id, channel_id, message } = reminder;
        client.guilds
            .fetch(guild_id)
            .then((guild) => {
                guild.channels
                    .fetch(channel_id)
                    .then((channel) => {
                        (channel as GuildTextBasedChannel)
                            .send(`**Reminder** for <@${user_id}>:\n${message}`)
                            .then(() => {
                                clearInterval(reminderInterval);
                                deleteReminder(reminder)
                                    .then(() => {
                                        // we dont want to wait another 30 seconds
                                        // we want to see if the next soonest reminder is also now
                                        // so clear the interval and start it again
                                        startRemindersCheck();
                                    })
                                    .catch(logger.error);
                            })
                            .catch(logger.error);
                    })
                    .catch(logger.error);
            })
            .catch(logger.error);
    }
};

const startRemindersCheck = () => {
    checkReminders(); // run immediately
    reminderInterval = setInterval(async () => {
        checkReminders();
    }, 30000);
};

// Pubsub

const subscribe = () => {
    pubsub.subscribe("pastevents", (_msg, interaction: RepliableInteraction) => {
        listPreviousEvents(interaction);
    });
    pubsub.subscribe("remindme", (_msg, data: RemindMeData) => {
        addReminder(formatReminder(data));
    });
};

const printGuilds = () => {
    client.guilds.fetch().then((guilds) => {
        console.log("Guilds:");
        guilds.forEach((guild) => {
            console.log(guild.name + ": " + guild.id);
        });
    });
};

// Create a new client instance
const client = new CustomClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
    ],
});

for (const command of allCommands) {
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
    subscribe();
    printGuilds();
    startRemindersCheck();
    updateEventsRoles();
});

client.on(Events.InteractionCreate, async (interaction) => {
    const runInteraction = async () => {
        if (isReady) {
            if (!interaction.isChatInputCommand()) {
                return;
            }

            const command = (interaction.client as CustomClient).commands.get(
                interaction.commandName
            );
            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (err) {
                logger.error(err);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "There was an error while executing this command!",
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: "There was an error while executing this command!",
                        ephemeral: true,
                    });
                }
            }
        } else {
            setTimeout(runInteraction, 5000);
        }
    };
    runInteraction();
});

client.on(
    Events.GuildScheduledEventCreate,
    async (
        guildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>
    ): Promise<void> => {
        const createEvent = () => {
            if (isReady) {
                logger.info("event created: " + guildScheduledEvent.name);
                onCreateEvent(guildScheduledEvent);
            } else {
                setTimeout(createEvent, 5000);
            }
        };
        createEvent();
    }
);

client.on(
    Events.GuildScheduledEventDelete,
    async (
        guildScheduledEvent:
            | GuildScheduledEvent<GuildScheduledEventStatus>
            | PartialGuildScheduledEvent
    ): Promise<void> => {
        const deleteEvent = () => {
            if (isReady) {
                logger.info("event deleted: " + guildScheduledEvent.name);
                fetchEvent(guildScheduledEvent.id).then((event) => {
                    if (event) {
                        guildScheduledEvent.guild.roles
                            .delete(event.role_id)
                            .then(() => {
                                logger.info("role deleted for " + event.name);
                                updateToPastEvent(
                                    formatEvent(guildScheduledEvent, event.role_id)
                                );
                            })
                            .catch(logger.error);
                    } else {
                        logger.warn(
                            "couldnt find event! weirdge... id: " + guildScheduledEvent.id
                        );
                    }
                });
            } else {
                setTimeout(deleteEvent, 5000);
            }
        };
        deleteEvent();
    }
);

client.on(
    Events.GuildScheduledEventUpdate,
    async (
        oldGuildScheduledEvent:
            | GuildScheduledEvent<GuildScheduledEventStatus>
            | PartialGuildScheduledEvent,
        newGuildScheduledEvent: GuildScheduledEvent
    ): Promise<void> => {
        const updateEvent = () => {
            if (isReady) {
                fetchEvent(newGuildScheduledEvent.id).then((event) => {
                    if (event) {
                        if (
                            newGuildScheduledEvent.status === 3 ||
                            newGuildScheduledEvent.status === 4
                        ) {
                            logger.info("event canceled: " + newGuildScheduledEvent.name);
                            // complete or canceled
                            newGuildScheduledEvent.guild.roles
                                .delete(event.role_id)
                                .then(() => {
                                    logger.info(
                                        "role deleted for " + newGuildScheduledEvent.name
                                    );
                                    updateToPastEvent(
                                        formatEvent(newGuildScheduledEvent, event.role_id)
                                    );
                                })
                                .catch(logger.error);
                        } else if (
                            oldGuildScheduledEvent.name !== newGuildScheduledEvent.name
                        ) {
                            newGuildScheduledEvent.guild.roles
                                .edit(event.role_id, {
                                    name: newGuildScheduledEvent.name,
                                })
                                .then(() => {
                                    logger.info(
                                        "role edited for " + newGuildScheduledEvent.name
                                    );
                                    update(
                                        formatEvent(newGuildScheduledEvent, event.role_id)
                                    );
                                })
                                .catch(logger.error);
                        }
                    } else {
                        logger.warn(
                            "couldnt find event! weirdge... id: " +
                                newGuildScheduledEvent.id
                        );
                    }
                });
            } else {
                setTimeout(updateEvent, 5000);
            }
        };
        updateEvent();
    }
);

client.on(
    Events.GuildScheduledEventUserAdd,
    (
        guildScheduledEvent:
            | GuildScheduledEvent<GuildScheduledEventStatus>
            | PartialGuildScheduledEvent,
        user: User
    ): void => {
        const userAdd = () => {
            if (isReady) {
                fetchEvent(guildScheduledEvent.id).then((event) => {
                    if (event) {
                        guildScheduledEvent.guild.members
                            .addRole({
                                role: event.role_id,
                                user: user,
                            })
                            .then(() => {
                                logger.info(
                                    "user subscribed: " +
                                        user.username +
                                        " - " +
                                        guildScheduledEvent.name
                                );
                                updateSubscriberNum(guildScheduledEvent.id, true);
                            })
                            .catch(logger.error);
                    }
                });
            } else {
                setTimeout(userAdd, 5000);
            }
        };
        userAdd();
    }
);

client.on(
    Events.GuildScheduledEventUserRemove,
    (
        guildScheduledEvent:
            | GuildScheduledEvent<GuildScheduledEventStatus>
            | PartialGuildScheduledEvent,
        user: User
    ): void => {
        const userRemove = () => {
            if (isReady) {
                fetchEvent(guildScheduledEvent.id).then((event) => {
                    if (event) {
                        guildScheduledEvent.guild.members
                            .removeRole({
                                role: event.role_id,
                                user: user,
                            })
                            .then(() => {
                                logger.info(
                                    "user unsubscribed: " +
                                        user.username +
                                        " - " +
                                        guildScheduledEvent.name
                                );
                                updateSubscriberNum(guildScheduledEvent.id, false);
                            })
                            .catch(logger.error);
                    }
                });
            } else {
                setTimeout(userRemove, 5000);
            }
        };
        userRemove();
    }
);

// Log in to Discord with your client's token
client.login(token);
