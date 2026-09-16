/**
 * Edit FAQ How-to-Play embed: remove Autoplay section.
 */
import { config } from 'dotenv';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { resolve } from 'path';

config();

const CHANNEL_ID = '1370054311949631648';
const MESSAGE_ID = '1549446859423219713';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1369976254647898152';
const TICKET_CHANNEL_ID = process.env.TICKET_CHANNEL_ID || '1369976260066803794';
const HUB_URL = process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';
const fileName = 'faq-need-help.png';

function howToPlayButtons() {
    const ticketUrl = `https://discord.com/channels/${GUILD_ID}/${TICKET_CHANNEL_ID}`;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Play Now').setStyle(ButtonStyle.Link).setURL('https://game.peaxel.me/?ref=discord_faq'),
            new ButtonBuilder().setLabel('Full Guide').setStyle(ButtonStyle.Link).setURL('https://docs.peaxel.me/'),
            new ButtonBuilder().setLabel('Community Hub').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app`),
            new ButtonBuilder().setLabel('Leaderboards').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app/leaderboard`),
            new ButtonBuilder().setLabel('Zealy Quests').setStyle(ButtonStyle.Link).setURL('https://zealy.io/c/peaxel'),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Ace AI Support').setStyle(ButtonStyle.Link).setURL('https://ace.peaxel.me'),
            new ButtonBuilder().setLabel('Open a Ticket').setStyle(ButtonStyle.Link).setURL(ticketUrl),
            new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://peaxel.me'),
            new ButtonBuilder().setLabel('Trustpilot').setStyle(ButtonStyle.Link).setURL('https://www.trustpilot.com/review/peaxel.me'),
        ),
    ];
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const msg = await channel.messages.fetch(MESSAGE_ID);
        const file = new AttachmentBuilder(resolve('./assets', fileName), { name: fileName });

        const embed = new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle('🎮 HOW TO PLAY PEAXEL | Official Guide')
            .setDescription(
                'Master the scouting game! Here is everything you need to dominate the Gameweek leaderboard.\n\u200b',
            )
            .addFields(
                {
                    name: '🏃 1. Build your Lineup',
                    value:
                        '• **Where:** Team → All My Cards (or Competition page)\n'
                        + '• **Size:** Min **1**, Max **5** cards\n'
                        + '• **How:** Tap a card → **Lineup** to add/remove\n'
                        + '• **Tip:** Cards in a lineup are **locked from sale** until the week ends',
                },
                {
                    name: '📈 2. Scoring System',
                    value:
                        '• **Base:** weekly score from real athlete performance\n'
                        + '• **Bonuses:** Force + Experience (XP) + Collection size\n'
                        + '• **Formula:** Base Score + Force + XP + Collection boost',
                },
                {
                    name: '⏱️ 3. Weekly Deadlines (Paris)',
                    value:
                        '• **Cycle:** Monday 00:01 → Sunday 23:59\n'
                        + '• **Editing:** Monday → **Thursday 23:59**\n'
                        + '• **Lock:** Friday → Sunday\n'
                        + '• **Results:** rankings & rewards every Monday',
                },
                {
                    name: '🏆 4. In-game Rewards',
                    value:
                        '• Tiered rewards by rank — every participant earns something\n'
                        + '• Payouts go to your **Peaxel wallet**\n'
                        + '• Consistent weekly play increases reward potential',
                },
                {
                    name: 'Need more help?',
                    value:
                        'Use the buttons below for Play, Docs, Community Hub, Zealy, Ace AI, and tickets.\n'
                        + 'On Discord you can also run `/help` (Hub Pass) or `/how-to-play` anytime.',
                },
            )
            .setImage(`attachment://${fileName}`)
            .setFooter({ text: 'Peaxel · The Next Generation of Scouting' });

        await msg.edit({
            embeds: [embed],
            files: [file],
            components: howToPlayButtons(),
        });
        console.log('Removed Autoplay section from How to Play embed.');
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

client.login(process.env.DISCORD_TOKEN);
