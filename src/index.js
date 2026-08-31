import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from 'dotenv';
import fs, { readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import analyticsRoutes from './routes/analytics.js';
import feedbackRoutes from './routes/feedbacks.js';
import publicRouter from './web/routes/public.js';
import adminRouter from './web/routes/admin.js';
import legacyRouter from './routes/legacy.js';
import langRouter from './web/routes/lang.js';
import themeRouter from './web/routes/theme.js';
import { ensureAdminUsers } from './web/services/adminUsers.js';
import { getAdminPath } from './web/services/adminPath.js';
import { attachI18n } from './web/i18n/index.js';
import { addLiveLog } from './web/services/liveLogService.js';
import { joinGiveaway } from './web/services/giveawayService.js';
import { invalidateStatsCache } from './web/services/statsService.js';
import { updateJsonSync } from './utils/jsonStore.js';
import { getRole } from './utils/configManager.js';

// Utility Imports
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { registerMemberJoinHandler } from './handlers/memberJoinHandler.js';
import { handleMessageReward } from './utils/rewardSystem.js';

config();

const logPrefix = '[Peaxel Bot]';
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.SESSION_SECRET) {
    console.error(`${logPrefix} ❌ FATAL: SESSION_SECRET est obligatoire en production. Arrêt du bot.`);
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 8080;

const ACTIVITY_TRACK_ROLE_ID = getRole('activityTrack');

// --- DATA PATHS & INIT ---
const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');

const DEFAULT_STATS = {
    messagesSent: 0,
    commandsExecuted: 0,
    feedbacksReceived: 0,
    arrivalsToday: 0,
    dailyActiveRoleUsers: [],
    dailyHistory: {},
    history: {},
    totalBans: 0,
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize / sync super admin from .env
await ensureAdminUsers();

// --- ANALYTICS ENGINE ---
function updateStats(updater) {
    return updateJsonSync(STATS_FILE, DEFAULT_STATS, updater);
}

const trackEvent = (type) => {
    updateStats((stats) => {
        if (stats[type] !== undefined) {
            stats[type]++;
            const today = new Date().toISOString().split('T')[0];
            if (!stats.dailyHistory) stats.dailyHistory = {};
            stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
        }
        return stats;
    });
};

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});
client.commands = new Collection();

// --- WEB SERVER CONFIG ---
const app = express();
app.set('trust proxy', 1);
app.set('discordClient', client); 
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!isProd && !process.env.SESSION_SECRET) {
    console.warn(`${logPrefix} ⚠️ SESSION_SECRET absent — utilisation d'une clé de dev (non production).`);
}
app.use(session({
    secret: process.env.SESSION_SECRET || 'cyber-secret-key-dev-only',
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
    cookie: { maxAge: 3600000, secure: isProd, httpOnly: true, sameSite: 'lax' }
}));

// Web v2 — static assets + routes
app.use(express.static(join(__dirname, 'web/public')));
app.use(attachI18n);
app.use('/lang', langRouter);
app.use('/theme', themeRouter);
app.use('/', publicRouter);
app.use(`/${getAdminPath()}`, adminRouter);
app.use('/analytics', analyticsRoutes);
app.use('/feedbacks', feedbackRoutes);
app.use('/', legacyRouter);

// Health check (monitoring / uptime)
app.get('/health', (req, res) => {
    const discordClient = app.get('discordClient');
    const ready = discordClient?.isReady() ?? false;
    res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'starting',
        discord: ready,
        ping: ready ? discordClient.ws.ping : null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});


// --- COMMAND LOADER (local only — register via npm run register-commands) ---
async function loadCommands() {
    const commandsPath = join(__dirname, 'commands');
    try {
        if (!fs.existsSync(commandsPath)) return;
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default || commandModule;
            if (command?.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
        console.log(`${logPrefix} ${client.commands.size} command(s) loaded locally`);
    } catch (err) { console.error(`${logPrefix} Command load error:`, err.message); }
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

// Track arrivals + welcome message (handler centralisé)
registerMemberJoinHandler(client, () => {
    updateStats((stats) => {
        stats.arrivalsToday = (stats.arrivalsToday || 0) + 1;
        return stats;
    });
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.author.bot) {
        trackEvent('messagesSent');
        
        // Role penetration tracking
        if (message.member?.roles.cache.has(ACTIVITY_TRACK_ROLE_ID)) {
            updateStats((stats) => {
                if (!stats.dailyActiveRoleUsers) stats.dailyActiveRoleUsers = [];
                if (!stats.dailyActiveRoleUsers.includes(message.author.id)) {
                    stats.dailyActiveRoleUsers.push(message.author.id);
                }
                return stats;
            });
        }
    }
    await handleMessageReward(message);
});

// Midnight Analytics Snapshot
cron.schedule('0 0 * * *', async () => {
    if (!ACTIVITY_TRACK_ROLE_ID) return;
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID).catch(() => null);
    if (!guild) return;

    const roleMembers = guild.roles.cache.get(ACTIVITY_TRACK_ROLE_ID)?.members.size || 1;
    const today = new Date().toISOString().split('T')[0];

    updateStats((stats) => {
        const activeToday = stats.dailyActiveRoleUsers?.length || 0;
        if (!stats.history) stats.history = {};
        stats.history[today] = {
            roleActivity: ((activeToday / roleMembers) * 100).toFixed(1),
            arrivals: stats.arrivalsToday || 0,
            totalMembers: guild.memberCount
        };
        stats.arrivalsToday = 0;
        stats.dailyActiveRoleUsers = [];
        return stats;
    });

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
                joinGiveaway(interaction.user.id, interaction.user.tag);
                invalidateStatsCache('public');
                addLiveLog('GIVEAWAY', `${interaction.user.tag} joined the draw 🎟️`);
                await interaction.reply({ content: '✅ Entry recorded!', ephemeral: true });
            } catch (err) {
                if (err.message === 'ALREADY_JOINED') {
                    return await interaction.reply({ content: '❌ Already registered!', ephemeral: true });
                }
                console.error('Giveaway Join Error:', err);
            }
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
        app.listen(PORT, () => console.log(`${logPrefix} Web v2 active on port ${PORT} (admin: /${getAdminPath()})`));

        await loadCommands();
        
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) { 
        console.error(`${logPrefix} Critical Startup Error:`, error.message); 
    }
})();