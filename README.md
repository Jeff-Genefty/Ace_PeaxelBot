🎮 Peaxel Discord BotThe official Discord assistant for the Peaxel project. This bot automates community engagement through scheduled announcements, athlete spotlights, and integrated feedback systems.✨ Core Features📅 Bi-Weekly Automated Announcements:Mondays (00:01 AM Paris): Lineup Opening with dynamic countdowns.Thursdays (07:00 PM Paris): Lineup Closing reminders with real-time countdown timestamps.🌟 Weekly Athlete Spotlight: Every Wednesday at 4:00 PM (Paris), featuring a unique athlete from the ecosystem.🎨 Rich Embeds: Visually attractive messages with custom branding, footers, and images.🔘 Interactive Buttons: "Play Now", "Leaderboard", and "Give Feedback" direct links.💬 Feedback System: Integrated Modal forms to collect player ratings and suggestions.📊 Activity Tracking: Persisted logs of sent posts, total feedback, and uptime.📝 Advanced Logging: Dedicated admin channel for real-time monitoring of bot events and errors.🛡️ Anti-Spam: Built-in logic to prevent duplicate posts for the same week.📋 PrerequisitesNode.js v18.0.0 or higher.A Discord Developer account.Developer Mode enabled on your Discord client.🚀 Installation1. Clone the repositoryBashgit clone <your-repo-url>
cd peaxel-discord-bot
2. Install dependenciesBashnpm install
3. Setup Discord ApplicationGo to the Discord Developer Portal.Create a New Application (e.g., "Peaxel Bot").In the Bot tab, click Reset Token and copy the value (Keep it secret!).Enable Server Members Intent and Message Content Intent if required.Note your Application ID (Client ID).4. ConfigurationCreate a .env file in the root directory:Extrait de codeDISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_test_server_id # Optional for instant command updates

ANNOUNCE_CHANNEL_ID=id_of_announcement_channel
FEEDBACK_CHANNEL_ID=id_of_feedback_logs_channel
LOG_CHANNEL_ID=id_of_admin_logs_channel
SPOTLIGHT_CHANNEL_ID=id_of_spotlight_channel

TZ=Europe/Paris
5. Register CommandsSync slash commands with Discord:Bashnode src/register-commands.js
6. Add AssetsPlace your announcement images in assets/ (e.g., weekly-opening.jpg, weekly-closing.jpg).Fill athletes.json in the root with your athletes database.🎮 CommandsCommandDescriptionPermission/pingCheck bot latency and statusEveryone/statusView bot uptime, activity stats, and next runAdmin/send-weekly-nowManually trigger the weekly announcementAdmin/set-weekly-messageDynamic configuration (Title, Color, URLs)Admin📁 Project StructurePlaintextpeaxel-discord-bot/
├── src/
│   ├── index.js             # Main entry point
│   ├── scheduler.js         # Cron-job management (Mon, Wed, Thu)
│   ├── register-commands.js # Discord API command registration
│   ├── commands/            # Slash command definitions
│   ├── config/              # JSON-based message & reaction configs
│   ├── handlers/            # Button & Modal interaction logic
│   └── utils/
│       ├── activityTracker.js # Persisted stats (data/activity.json)
│       ├── discordLogger.js   # Admin logging system
│       ├── spotlightManager.js# Athlete rotation logic
│       ├── sendWeeklyMessage.js# Embed builder engine
│       └── week.js            # ISO Week & Paris time helpers
├── assets/                  # Branding images
├── data/                    # Persisted JSON databases (ignored by git)
├── athletes.json            # Athletes database
└── .env                     # Private environment variables
🕐 Schedule (Europe/Paris)EventDayTimePurposeOpeningMonday00:01Start the game week & ping @betatesterSpotlightWednesday16:00Feature a new athlete profileClosingThursday18:59Deadline reminder with live countdown⚙️ DeploymentUsing PM2 (Recommended for VPS)Bashnpm install -g pm2
pm2 start src/index.js --name peaxel-bot
pm2 save
Using DockerBashdocker build -t peaxel-bot .
docker run -d --name peaxel-bot --env-file .env -v peaxel-data:/app/data peaxel-bot
🔧 TroubleshootingCommands not showing? Run node src/register-commands.js again and wait a few minutes.Wrong time? Check the TZ variable in .env (Should be Europe/Paris).Images missing? Ensure filenames in assets/ match the names in src/config/messageConfig.js.Developed with ❤️ for Peaxel