import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getChannel } from '../utils/configManager.js'; // Pour l'ID du salon
import { loadMessageConfig } from '../config/messageConfig.js'; // Pour l'URL et les textes

export function setupWelcomeListener(client) {
    const logPrefix = '[Peaxel Welcome]';

    client.on('guildMemberAdd', async (member) => {
        // 1. Récupérer le salon configuré via /setup
        const welcomeChannelId = getChannel('welcome');

        if (!welcomeChannelId) {
            return console.log(`${logPrefix} ⚠️ Aucun salon 'welcome' configuré via /setup.`);
        }

        const channel = await client.channels.fetch(welcomeChannelId).catch(() => null);
        if (!channel) return;

        // 2. Récupérer les infos (URL, etc.) depuis messageConfig
        const msgConfig = loadMessageConfig();
        const playUrl = msgConfig.opening.playUrl || "https://game.peaxel.me/";

        // 3. Préparation de l'image
        const imagePath = resolve(process.cwd(), 'assets', 'welcome-image.jpg');
        
        // 4. Construction de l'Embed
        const embed = new EmbedBuilder()
            .setTitle(`🎙️ ACE NOTIFICATION | NEW MANAGER ON DECK`)
            .setDescription(
                `Welcome to the arena, <@${member.id}>! I'm **Ace**, your Peaxel guide.\n\n` +
                `**Who are we?**\n` +
                `Peaxel is the ultimate Fantasy Sport ecosystem where you manage real-life athletes and earn rewards. 🏆\n\n` +
                `**🚀 YOUR NEXT STEPS:**\n\n` +
                `1️⃣ **Claim your Free Cards:** Register at [game.peaxel.me](${playUrl}) to get your first athlete.\n\n` +
                `2️⃣ **Get up to 5 FREE Cards:** Check our guide to see how to expand your roster! 🎁\n\n` +
                `3️⃣ **Join the Zealy Quests:** Complete missions for XP. [Join here](https://zealy.io/c/peaxel).\n\n` +
                `*Ready to own the game? Let us know if you need help!* 🚀`
            )
            .setColor('#00ff00')
            .setTimestamp()
            .setFooter({ text: 'Peaxel • Digital Sports Entertainment' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Register & Get 1st Card')
                .setStyle(ButtonStyle.Link)
                .setURL(playUrl),
            new ButtonBuilder()
                .setLabel('How to get 5 Free Cards')
                .setStyle(ButtonStyle.Link)
                .setURL(playUrl),
            new ButtonBuilder()
                .setLabel('Zealy Quests')
                .setStyle(ButtonStyle.Link)
                .setURL('https://zealy.io/c/peaxel')
        );

        const options = { 
            content: `Welcome <@${member.id}>! Check your roadmap below. 👇`, 
            embeds: [embed], 
            components: [buttons] 
        };

        if (existsSync(imagePath)) {
            const attachment = new AttachmentBuilder(imagePath, { name: 'welcome.jpg' });
            embed.setImage('attachment://welcome.jpg');
            options.files = [attachment];
        }

        try {
            await channel.send(options);
            console.log(`${logPrefix} ✅ Message de bienvenue envoyé pour ${member.user.username}`);
        } catch (error) {
            console.error(`${logPrefix} ❌ Erreur envoi welcome:`, error);
        }
    });
}