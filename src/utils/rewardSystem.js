import { EmbedBuilder } from 'discord.js';

// --- Configuration ---
let messageCounter = 0;
// Déclenchement aléatoire entre 60 et 120 messages
let nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;

/**
 * Gère la détection des messages et l'attribution des récompenses
 */
export async function handleMessageReward(message) {
    // Uniquement dans le général, ignore les bots
    if (message.author.bot || message.channel.id !== '1369976259613954059') return;

    messageCounter++;

    if (messageCounter >= nextThreshold) {
        messageCounter = 0;
        nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        
        // 75% de chance que Ace intervienne réellement pour éviter une trop grande régularité
        if (Math.random() < 0.75) {
            await triggerAceRecognition(message);
        }
    }
}

/**
 * Logique RP de Coach Ace qui offre une récompense
 */
async function triggerAceRecognition(message) {
    const user = message.author;
    const adminId = '927495286681636884'; // Ton ID pour le tag
    
    // 50% chance entre Carte et XP Zealy
    const isCard = Math.random() < 0.5;
    
    const embed = new EmbedBuilder()
        .setTitle(`👨‍🏫 COACH ACE IS WATCHING...`)
        .setColor('#FACC15')
        .setThumbnail('https://media.peaxel.me/ace-coach.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel Loyalty Reward • Keep the chat alive!' });

    if (isCard) {
        // --- RÉCOMPENSE : FREE CARD ---
        const variations = [
            `Ton analyse tactique dans le chat est impressionnante ! 🏟️`,
            `J'aime l'énergie que tu apportes au stade aujourd'hui ! 🚀`,
            `Ta passion pour l'écosystème Peaxel mérite d'être saluée. 🏆`
        ];
        const randomText = variations[Math.floor(Math.random() * variations.length)];

        embed.setDescription(
            `Hey <@${user.id}>, ${randomText}\n\n` +
            `Pour te récompenser, je t'offre une **Free Athlete Card 🃏** !`
        );
        embed.addFields({ 
            name: '📩 COMMENT RÉCLAMER', 
            value: `Ouvre un ticket dans <#1369976260066803794> avec un screenshot de ce message !` 
        });

        await message.reply({ 
            content: `⚡ **Félicitations Manager !**`, 
            embeds: [embed] 
        });

    } else {
        // --- RÉCOMPENSE : XP ZEALY ---
        const xpAmounts = [50, 100, 150, 200];
        const selectedXP = xpAmounts[Math.floor(Math.random() * xpAmounts.length)];
        
        embed.setDescription(
            `Hey <@${user.id}>, ton implication ici aide la communauté à grandir ! 📈\n\n` +
            `Je t'accorde un bonus de **${selectedXP} XP sur Zealy** pour booster ton rang.`
        );
        embed.addFields({ 
            name: 'ℹ️ INFOS', 
            value: `Le gain sera ajouté manuellement sur ton compte Zealy par la direction.` 
        });

        await message.reply({ 
            content: `⚡ **Félicitations Manager !** (cc <@${adminId}> pour l'XP)`, 
            embeds: [embed] 
        });
    }
}

/**
 * Message de motivation proactif de Ace
 */
export async function sendAceMotivation(client) {
    const channelId = '1369976259613954059'; 
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const motivations = [
        "🏟️ **Le stade est un peu calme aujourd'hui !** Qui est prêt pour la prochaine Gameweek ? N'oubliez pas que je garde toujours un œil sur les managers les plus actifs... des récompenses (XP, Free Cards) tombent souvent ! 👀",
        "🔥 **Manager, ta stratégie est-elle prête ?** Discutez tactique ici, partagez vos pépites ! Les plus passionnés d'entre vous pourraient bien recevoir un cadeau surprise de ma part. 🎁",
        "📢 **Avis aux scouts !** L'activité ici est récompensée. XP Zealy et Cartes gratuites sont en jeu. Mais attention : celui qui spamme pour forcer la chance sera disqualifié par la direction ! Restez naturels. 🚫",
        "✨ **Coach Ace à l'écoute...** J'aime voir de l'entraide entre managers. Continuez à faire vivre ce salon, et les récompenses continueront de tomber ! 🃏"
    ];

    const randomText = motivations[Math.floor(Math.random() * motivations.length)];

    const embed = new EmbedBuilder()
        .setTitle("👨‍🏫 CONSEIL DE COACH ACE")
        .setDescription(randomText)
        .setColor("#FACC15")
        .setThumbnail('https://media.peaxel.me/ace-coach.png')
        .setFooter({ text: "Peaxel • Fair-play et Activité" });

    await channel.send({ embeds: [embed] });
}