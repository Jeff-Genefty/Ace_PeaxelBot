import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';
import fs from 'fs';

// --- Configuration ---
const REWARDS_PATH = './data/userRewards.json';
const MY_ADMIN_ID = '927495286681636884';
const BANNED_ROLES = [
    '1370009354442379344', 
    '1369976254757081176', 
    '1369985998913667123', 
    '1369976254757081174'
];

let messageCounter = 0;
let nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;

/**
 * Helper: Check if user is on 24h cooldown
 */
function isOnCooldown(userId) {
    if (!fs.existsSync(REWARDS_PATH)) return false;
    try {
        const data = JSON.parse(fs.readFileSync(REWARDS_PATH, 'utf-8'));
        const lastReward = data[userId];
        if (!lastReward) return false;

        const hoursSince = (Date.now() - lastReward) / (1000 * 60 * 60);
        return hoursSince < 24;
    } catch (e) {
        return false;
    }
}

/**
 * Helper: Save reward date to JSON
 */
function saveRewardDate(userId) {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    const data = fs.existsSync(REWARDS_PATH) ? JSON.parse(fs.readFileSync(REWARDS_PATH, 'utf-8')) : {};
    data[userId] = Date.now();
    fs.writeFileSync(REWARDS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Main Logic: Handles message counting and rewards
 */
export async function handleMessageReward(message) {
    if (message.author.bot || message.channel.id !== '1369976259613954059') return;

    // --- Random Reaction (25% chance) ---
    if (Math.random() < 0.25) {
        const emojis = ['⚽', '🏟️', '🔥', '🧠', '⭐', '📈', '🤝'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await message.react(randomEmoji).catch(() => null);
    }

    messageCounter++;

    if (messageCounter >= nextThreshold) {
        const isExcluded = message.member.roles.cache.some(role => BANNED_ROLES.includes(role.id));
        
        // If user is Staff or on Cooldown, we skip this cycle but keep the counter high to try soon
        if (isExcluded || isOnCooldown(message.author.id)) {
            messageCounter = Math.floor(nextThreshold * 0.9); 
            return;
        }

        messageCounter = 0;
        nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        
        if (Math.random() < 0.75) {
            await triggerAceRecognition(message);
        }
    }
}

/**
 * Trigger Reward (Card or XP)
 */
async function triggerAceRecognition(message) {
    const user = message.author;
    const isCard = Math.random() < 0.5;
    
    // Setup local image
    const imagePath = resolve(process.cwd(), './assets/unnamed.png');
    const file = new AttachmentBuilder(imagePath);
    
    saveRewardDate(user.id);

    const embed = new EmbedBuilder()
        .setTitle(`👨‍🏫 COACH ACE IS WATCHING...`)
        .setColor('#FACC15')
        .setThumbnail('attachment://unnamed.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel Loyalty Reward • Play Fair, Win Big!' });

    if (isCard) {
        const variations = [
            `Your tactical analysis is spot on! 🏟️`,
            `I love the energy you're bringing to the stadium today! 🚀`,
            `Your passion for the Peaxel ecosystem deserves a reward. 🏆`
        ];
        
        embed.setDescription(
            `Hey <@${user.id}>, ${variations[Math.floor(Math.random() * variations.length)]}\n\n` +
            `I'm granting you a **Free Athlete Card 🃏**!`
        )
        .addFields({ 
            name: '📩 HOW TO CLAIM', 
            value: `Open a ticket in <#1369976260066803794> and provide a screenshot of this message!` 
        });

        await message.reply({ 
            content: `⚡ **Congratulations Manager!**`, 
            embeds: [embed],
            files: [file]
        });

    } else {
        const xpAmounts = [50, 100, 150, 200];
        const selectedXP = xpAmounts[Math.floor(Math.random() * xpAmounts.length)];
        
        embed.setDescription(
            `Hey <@${user.id}>, your involvement is helping this community grow! 📈\n\n` +
            `I've awarded you **${selectedXP} XP on Zealy** to boost your rank.`
        )
        .addFields({ 
            name: 'ℹ️ STATUS', 
            value: `The management will manually add this to your Zealy profile shortly.` 
        });

        await message.reply({ 
            content: `⚡ **Congratulations Manager!** (Attention <@${MY_ADMIN_ID}>: Manual XP update required)`, 
            embeds: [embed],
            files: [file]
        });
    }
}

/**
 * Proactive Motivation (Randomly called by Scheduler)
 */
export async function sendAceMotivation(client) {
    const channelId = '1369976259613954059'; 
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    // ACE DECIDES: 25% chance to actually speak when the scheduler runs
    if (Math.random() > 0.10) return;

    const imagePath = resolve(process.cwd(), './assets/unnamed.png');
    const file = new AttachmentBuilder(imagePath);

    const motivations = [
        "🏟️ **The stadium feels a bit quiet!** Who's ready for the next Gameweek? I'm scouting for the most active managers... rewards drop when you least expect them! 👀",
        "🔥 **Managers, is your strategy locked in?** Share your gems and tactical tips! The most passionate among you might just get a surprise gift from me. 🎁",
        "📢 **Scout Alert!** Activity here pays off. Zealy XP and Free Cards are in play. But remember: spamming to force your luck will lead to disqualification. Stay natural, stay sharp. 🚫",
        "✨ **Coach Ace in the building...** I love seeing managers helping each other out. Keep the chat alive, and the rewards will keep dropping! 🃏",
        "🧠 **Knowledge is power.** Who's tracking the latest athlete performances? Active discussion is the key to victory, and victory leads to prizes! 🏆"
    ];

    const embed = new EmbedBuilder()
        .setTitle("👨‍🏫 COACH ACE'S BRIEFING")
        .setDescription(motivations[Math.floor(Math.random() * motivations.length)])
        .setColor("#FACC15")
        .setThumbnail('attachment://unnamed.png')
        .setFooter({ text: "Peaxel • Fair Play & Activity" });

    await channel.send({ embeds: [embed], files: [file] });
}