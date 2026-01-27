import { Client, GatewayIntentBits, Collection, Events, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import cron from 'node-cron'; 
import analyticsRoutes from './routes/analytics.js';
import feedbackRoutes from './routes/feedbacks.js';

// Router Import
import dashboardRouter from './routes/dashboard.js';

// Utility Imports
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';
import { getConfig } from './utils/configManager.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';
const PORT = process.env.PORT || 8080;

// --- DATA PATHS & INIT ---
const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');
const USERS_FILE = join(DATA_DIR, 'users.json');
const GIVEAWAYS_FILE = join(DATA_DIR, 'giveaways.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize Admin User
if (!fs.existsSync(USERS_FILE)) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        writeFileSync(USERS_FILE, JSON.stringify([{ email: adminEmail, password: hashedPassword }], null, 2));
    }
}

// --- ANALYTICS ENGINE ---
// Added arrivalsToday, dailyActiveRoleUsers and history to the initial object
let stats = { messagesSent: 0, commandsExecuted: 0, feedbacksReceived: 0, arrivalsToday: 0, dailyActiveRoleUsers: [], dailyHistory: {}, history: {} };
if (fs.existsSync(STATS_FILE)) {
    try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { }
}

const trackEvent = (type) => {
    if (stats[type] !== undefined) {
        stats[type]++;
        const today = new Date().toISOString().split('T')[0];
        if (!stats.dailyHistory) stats.dailyHistory = {};
        stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
        writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    }
};

const addLiveLog = (action, detail) => {
    let logs = [];
    if (fs.existsSync(LIVE_LOGS_FILE)) {
        try { logs = JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')); } catch(e) {}
    }
    logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 50), null, 2));
};

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});
client.commands = new Collection();

// --- WEB SERVER CONFIG ---
const app = express();
app.set('discordClient', client); 
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'cyber-secret-key',
    resave: true, 
    saveUninitialized: true,
    cookie: { maxAge: 3600000, secure: false }
}));

// USE THE EXTERNAL ROUTER
app.use('/analytics', analyticsRoutes);
app.use('/', dashboardRouter);
app.use('/feedbacks', feedbackRoutes);


// --- COMMAND LOADER ---
async function loadAndRegisterCommands() {
    const commandsPath = join(__dirname, 'commands');
    const commandsToRegister = [];
    try {
        if (!fs.existsSync(commandsPath)) return;
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default || commandModule;
            if (command?.data && command.execute) {
                client.commands.set(command.data.name, command);
                commandsToRegister.push(command.data.toJSON());
            }
        }
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const route = process.env.DISCORD_GUILD_ID 
            ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
            : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
        await rest.put(route, { body: commandsToRegister });
    } catch (err) { console.error(`${logPrefix} Sync error:`, err.message); }
}

// --- EVENTS ---
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`${logPrefix} 🚀 Online | ${readyClient.user.tag}`);
    addLiveLog("SYSTEM", "Bot online");
    recordBotStart();
    await initDiscordLogger(readyClient);
    initScheduler(readyClient);
    await updateFeedbackStatsChannel(readyClient);
});

// Track arrivals
client.on(Events.GuildMemberAdd, (member) => {
    stats.arrivalsToday = (stats.arrivalsToday || 0) + 1;
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.author.bot) {
        trackEvent('messagesSent');
        
        // Role penetration tracking
        const targetRoleId = "1371904297498841148";
        if (message.member?.roles.cache.has(targetRoleId)) {
            if (!stats.dailyActiveRoleUsers) stats.dailyActiveRoleUsers = [];
            if (!stats.dailyActiveRoleUsers.includes(message.author.id)) {
                stats.dailyActiveRoleUsers.push(message.author.id);
                writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
            }
        }
    }
    await handleMessageReward(message);
});

// Midnight Analytics Snapshot
cron.schedule('0 0 * * *', async () => {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID).catch(() => null);
    if (!guild) return;

    const targetRoleId = "1371904297498841148";
    const roleMembers = guild.roles.cache.get(targetRoleId)?.members.size || 1;
    const activeToday = stats.dailyActiveRoleUsers?.length || 0;
    const today = new Date().toISOString().split('T')[0];

    if (!stats.history) stats.history = {};
    stats.history[today] = {
        roleActivity: ((activeToday / roleMembers) * 100).toFixed(1),
        arrivals: stats.arrivalsToday || 0,
        totalMembers: guild.memberCount
    };

    stats.arrivalsToday = 0;
    stats.dailyActiveRoleUsers = [];
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    console.log(`${logPrefix} Daily analytics snapshot saved.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) {
            trackEvent('commandsExecuted');
            await command.execute(interaction);
            addLiveLog("COMMAND", `${interaction.user.tag} : /${interaction.commandName}`);
        }
    } 
    else if (interaction.isButton()) {
        if (interaction.customId === 'feedback_button') {
            await handleFeedbackButton(interaction);
        } 
        else if (interaction.customId === 'join_giveaway') {
            try {
                let data = { participants: [], participantTags: [] };
                if (fs.existsSync(GIVEAWAYS_FILE)) {
                    const fileContent = fs.readFileSync(GIVEAWAYS_FILE, 'utf-8');
                    if (fileContent) data = JSON.parse(fileContent);
                }
                if (!data.participants) data.participants = [];
                if (!data.participantTags) data.participantTags = [];

                if (data.participants.includes(interaction.user.id)) {
                    return await interaction.reply({ content: "❌ Already registered!", ephemeral: true });
                }

                data.participants.push(interaction.user.id);
                data.participantTags.push(interaction.user.tag); 
                fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(data, null, 2));

                addLiveLog("GIVEAWAY", `${interaction.user.tag} joined the draw 🎟️`);
                await interaction.reply({ content: "✅ Entry recorded!", ephemeral: true });
            } catch (err) { console.error(`Giveaway Join Error:`, err); }
        }
    }
    // Handle Modal Submissions
    else if (interaction.isModalSubmit() && interaction.customId === 'feedback_modal') {
        try {
            // 1. Process the logic inside the handler
            await handleFeedbackSubmit(interaction);
            
            // 2. Track event for analytics
            trackEvent('feedbacksReceived');
            
            // 3. Extract rating using the CORRECT ID: 'feedback_rating'
            const rating = interaction.fields.getTextInputValue('feedback_rating');
            
            // 4. Update the live logs for the dashboard
            addLiveLog("FEEDBACK", `New review from ${interaction.user.tag} (${rating}⭐)`);
        } catch (error) {
            console.error(`${logPrefix} Error during feedback submission:`, error);
            // Non-blocking log to avoid crashing the whole process
            addLiveLog("ERROR", "Feedback submission failed");
        }
    }
});

// --- STARTUP ---
(async () => {
    try {
        // Dashboard listening first
        app.listen(PORT, () => console.log(`${logPrefix} Dashboard active on port ${PORT}`));
        
        setupWelcomeListener(client);
        
        // Fixed the function call (no arguments needed based on your definition)
        await loadAndRegisterCommands(); 
        
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) { 
        console.error(`${logPrefix} Critical Startup Error:`, error.message); 
    }
})();