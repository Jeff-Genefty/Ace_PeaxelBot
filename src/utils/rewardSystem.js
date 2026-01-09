import { EmbedBuilder } from 'discord.js';

let messageCounter = 0;
let nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;

const MY_ADMIN_ID = '927495286681636884';
const BANNED_ROLES = [
    '1370009354442379344', 
    '1369976254757081176', 
    '1369985998913667123', 
    '1369976254757081174'
];

export async function handleMessageReward(message) {
    if (message.author.bot || message.channel.id !== '1369976259613954059') return;

    if (Math.random() < 0.05) {
        const emojis = ['⚽', '🏟️', '🔥', '🧠', '⭐', '📈', '🤝'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await message.react(randomEmoji).catch(() => null);
    }

    messageCounter++;

    if (messageCounter >= nextThreshold) {
        const isExcluded = message.member.roles.cache.some(role => BANNED_ROLES.includes(role.id));
        
        if (isExcluded) {
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

async function triggerAceRecognition(message) {
    const user = message.author;
    const isCard = Math.random() < 0.5;
    
    const embed = new EmbedBuilder()
        .setTitle(`👨‍🏫 COACH ACE IS WATCHING...`)
        .setColor('#FACC15')
        .setThumbnail('assets/unnamed.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel Loyalty Reward • Play Fair, Win Big!' });

    if (isCard) {
        const variations = [
            `Your tactical analysis is spot on! 🏟️`,
            `I love the energy you're bringing to the stadium today! 🚀`,
            `Your passion for the Peaxel ecosystem deserves a reward. 🏆`
        ];
        const randomText = variations[Math.floor(Math.random() * variations.length)];

        embed.setDescription(
            `Hey <@${user.id}>, ${randomText}\n\n` +
            `I'm granting you a **Free Athlete Card 🃏**!`
        );
        embed.addFields({ 
            name: '📩 HOW TO CLAIM', 
            value: `Open a ticket in <#1369976260066803794> and provide a screenshot of this message!` 
        });

        await message.reply({ 
            content: `⚡ **Congratulations Manager!**`, 
            embeds: [embed] 
        });

    } else {
        const xpAmounts = [50, 100, 150, 200];
        const selectedXP = xpAmounts[Math.floor(Math.random() * xpAmounts.length)];
        
        embed.setDescription(
            `Hey <@${user.id}>, your involvement is helping this community grow! 📈\n\n` +
            `I've awarded you **${selectedXP} XP on Zealy** to boost your rank.`
        );
        embed.addFields({ 
            name: 'ℹ️ STATUS', 
            value: `The management will manually add this to your Zealy profile shortly.` 
        });

        await message.reply({ 
            content: `⚡ **Congratulations Manager!** (Attention <@${MY_ADMIN_ID}>: Manual XP update required)`, 
            embeds: [embed] 
        });
    }
}

export async function sendAceMotivation(client) {
    const channelId = '1369976259613954059'; 
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    if (Math.random() > 0.40) return;

    const motivations = [
        "🏟️ **The stadium feels a bit quiet!** Who's ready for the next Gameweek? I'm scouting for the most active managers... rewards (XP, Free Cards) drop when you least expect them! 👀",
        "🔥 **Managers, is your strategy locked in?** Share your gems and tactical tips! The most passionate among you might just get a surprise gift from me. 🎁",
        "📢 **Scout Alert!** Activity here pays off. Zealy XP and Free Cards are in play. But remember: spamming to force your luck will lead to disqualification. Stay natural, stay sharp. 🚫",
        "✨ **Coach Ace in the building...** I love seeing managers helping each other out. Keep the chat alive, and the rewards will keep dropping! 🃏",
        "🧠 **Knowledge is power.** Who's tracking the latest athlete performances? Active discussion is the key to victory, and victory leads to prizes! 🏆"
    ];

    const randomText = motivations[Math.floor(Math.random() * motivations.length)];

    const embed = new EmbedBuilder()
        .setTitle("👨‍🏫 COACH ACE'S BRIEFING")
        .setDescription(randomText)
        .setColor("#FACC15")
        .setThumbnail('assets/unnamed.png')
        .setFooter({ text: "Peaxel • Fair Play & Activity" });

    await channel.send({ embeds: [embed] });
}