# Soapbot

A role manager bot for discord that deals with managing roles for events.

-   Creates role for event on event creation, and deletes the role when the event is canceled/finished.
-   Assigns role to users who tick interested, and unassigns role when they untick.
-   Roles have the same name as the event for easy searching/pinging.

This bot also has slash commands with other useful features. Check out the [wiki](https://github.com/sophiabeluli/event-role-manager/wiki/Slash-Commands) for details.

## Installation

Use the link below to add soapbot to your server:
https://discord.com/oauth2/authorize?client_id=834955651796828190

## Development Setup

-   Set up your own tester bot. Instructions here: https://www.discordjs.guide/legacy/preparations/app-setup
-   Download the repository and switch to the dev branch (or make a new feature branch)
-   Make an .env file with your bot's TOKEN and CLIENT_ID, and the GUILD_ID for the server you will be testing in. Like this:

```.env
TOKEN="your-token-here"
CLIENT_ID="your-client-id-here"
GUILD_ID="your-server-id-here"
```

-   `npm install`
-   `npm run db:create` to create the events table
-   `npm run reminders:create` to create the reminders table
-   `npm run register:dev` to register the slash commands to your server
-   `npm run main` to start the application

You can add new slash commands by following the example in `src/commands/utility/user.ts` (the bot setup guide also shows you how). Make sure to export it in `src/commands/index.ts` and re-register with `npm run register:dev` before testing or it won't work!

## Contributing to this Repo

Feel free to contribute and help make this bot better with bug fixes, new features, etc!

-   You can report bugs or request new features for yourself or others to work on in the issues tab.
-   Make pull requests (PRs) to merge into dev or another feature branch.
-   **_Main is locked for editing._** This bot automatically manages roles, which means it can cause some havoc. I will be testing contributor code on dev before pushing to prod to ensure there are no issues.
