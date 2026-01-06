import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

export function setupWelcomeListener(client) {
    const WELCOME_CHANNEL_ID = "1369976257047167059"; 
    const logPrefix = '[Peaxel Welcome]';

    client.on('guildMemberAdd', async (member) => {
        console.log(`${logPrefix} New member detected: ${member.user.tag}`);

        const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`${logPrefix} Welcome channel not found.`);

        // 1. Image Handling
        const imagePath = resolve(process.cwd(), 'assets', 'welcome-image.png');
        let attachment = null;
        if (existsSync(imagePath)) {
            attachment = new AttachmentBuilder(imagePath, { name: 'welcome.jpg' });
        }

        // 2. Message Construction
        const welcomeTitle = `🎙️ ACE NOTIFICATION | NEW MANAGER ON DECK`;
        
        const welcomeDescription = `Welcome to the arena, <@${member.id}>! I'm **Ace**, your Peaxel guide.\n\n` +
            `**Who are we?**\n` +
            `Peaxel is the ultimate Fantasy Sport ecosystem where you manage real-life athletes, compete in weekly Game Weeks, and earn rewards based on their real performances. 🏆\n\n` +
            `**🚀 YOUR NEXT STEPS:**\n\n` +
            `1️⃣ **Claim your Free Cards:** Register at [game.peaxel.me](https://game.peaxel.me) to get your first athlete. Check the **#faq** channel to see how you can unlock up to **5 FREE CARDS** to start your journey!\n\n` +
            `2️⃣ **Join the Zealy Quests:** Complete community missions to earn XP and exclusive bonuses. [Join here](https://zealy.io/cw/peaxel-quest/questboard).\n\n` +
            `3️⃣ **Build your Squad:** Head to the Marketplace to scout and buy your first Rare or Epic cards to dominate the leaderboard.\n\n` +
            `*Ready to own the game? Let us know if you have any questions!* 🚀`;

        // 3. Build Embed for a pro look
        const embed = new EmbedBuilder()
            .setTitle(welcomeTitle)
            .setDescription(welcomeDescription)
            .setColor('#00ff00') // Vert Peaxel ou couleur vive
            .setTimestamp()
            .setFooter({ text: 'Peaxel • Digital Sports Entertainment' });

        if (attachment) embed.setImage('attachment://welcome.jpg');

        // 4. Action Buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Register & Get Free Cards')
                .setStyle(ButtonStyle.Link)
                .setURL('https://game.peaxel.me'),
            new ButtonBuilder()
                .setLabel('Zealy Quests')
                .setStyle(ButtonStyle.Link)
                .setURL('https://zealy.io/cw/peaxel-quest/questboard'),
                new ButtonBuilder()
                .setLabel('How to get 5 free cards?')
                .setStyle(ButtonStyle.Link)
                .setURL('https://peaxel.me/win-5-freecards-of-athletes/'),
        );

        try {
            const options = { 
                content: `Welcome <@${member.id}>! Check your roadmap below. 👇`, 
                embeds: [embed],
                components: [buttons]
            };
            if (attachment) options.files = [attachment];
            
            await channel.send(options);
            console.log(`${logPrefix} Professional Welcome sent for ${member.user.username}`);
        } catch (error) {
            console.error(`${logPrefix} Failed to send welcome:`, error);
        }
    });
}