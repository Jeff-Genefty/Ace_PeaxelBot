import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Need help? Select a topic or chat with our AI.');

export async function execute(interaction) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🏟️ Peaxel Help Center')
        .setDescription('Select a topic below to open the official documentation.\n\n' + 
                        '🤖 **Need more help?**\n' +
                        'Talk to our specialized AI at [ace.peaxel.me](https://ace.peaxel.me). ' +
                        'It can answer complex questions and help you open a support ticket if needed.')
        .setColor('#FACC15');
    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('What are you looking for?')
            .addOptions([
                { label: 'How to Play', description: 'Basic rules and getting started.', value: 'link_play', emoji: '🎮' },
                { label: 'Game Week & Rewards', description: 'Schedule and prizes.', value: 'link_gw', emoji: '🏆' },
                { label: 'Cards & Rarity', description: 'Learn about athlete cards.', value: 'link_cards', emoji: '🃏' },
                { label: 'Technical Support', description: 'Troubleshooting and Ace AI.', value: 'link_support', emoji: '🛠️' },
            ])
    );

    const response = await interaction.reply({ 
        embeds: [mainEmbed], 
        components: [menu], 
        flags: [MessageFlags.Ephemeral] 
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        let targetUrl = 'https://docs.peaxel.me/guide';
        let label = 'Open Documentation';

        switch (i.values[0]) {
            case 'link_play': targetUrl = 'https://docs.peaxel.me/guide/getting-started'; label = 'Guide: Getting Started'; break;
            case 'link_gw': targetUrl = 'https://docs.peaxel.me/guide/game-week'; label = 'Guide: Game Week'; break;
            case 'link_cards': targetUrl = 'https://docs.peaxel.me/guide/cards-and-rarity'; label = 'Guide: Cards & Rarity'; break;
            case 'link_support': targetUrl = 'https://ace.peaxel.me'; label = 'Chat with Ace AI'; break;
        }

        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(targetUrl),
            new ButtonBuilder().setLabel('Main Docs').setStyle(ButtonStyle.Link).setURL('https://docs.peaxel.me/')
        );

        await i.update({ 
            content: `🔗 Access the **${label}** here:`, 
            embeds: [], 
            components: [linkRow] 
        });
    });
}