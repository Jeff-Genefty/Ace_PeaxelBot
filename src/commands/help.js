import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
} from 'discord.js';
import { HELP_TOPICS, HELP_MENU_OPTIONS } from '../content/hubHelp.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hub Pass, XP, cards, challenges — and quick links.');

function mainEmbed() {
    return new EmbedBuilder()
        .setTitle('🏟️ Peaxel Help Center')
        .setColor(0xa855f7)
        .setDescription(
            'Everything about the **Community Hub**, game docs, and support.\n\n'
            + '**Hub Pass** — earn XP on Discord (`/daily`, messages, challenges), climb levels, unlock cards in your vault, and fight for weekly #1.\n\n'
            + 'Pick a topic below. Need more? Chat with **Ace AI** or open a ticket.',
        )
        .addFields(
            {
                name: 'Quick start',
                value:
                    '1. Message on the server → `/daily`\n'
                    + '2. Check progress with `/rank`\n'
                    + '3. Open [Hub `/app`](https://peaxel.genefty.com/app) for challenges & vault',
            },
            {
                name: 'Also useful',
                value:
                    '• `/how-to-play` — game lineups & scoring\n'
                    + '• [docs.peaxel.me](https://docs.peaxel.me) · [ace.peaxel.me](https://ace.peaxel.me)\n'
                    + '• Trustpilot review → claim **200 XP** on Zealy',
            },
        )
        .setFooter({ text: 'Peaxel Hub · Select a topic · Menu expires in 2 min' });
}

function topicEmbed(topicKey) {
    const topic = HELP_TOPICS[topicKey];
    const embed = new EmbedBuilder()
        .setTitle(topic.title)
        .setColor(topic.color)
        .setDescription(topic.description);
    for (const field of topic.fields) {
        embed.addFields({ name: field.name, value: field.value });
    }
    embed.setFooter({ text: 'Peaxel Hub · Use the menu to switch topics' });
    return embed;
}

function helpMenu(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('What do you need?')
            .setDisabled(disabled)
            .addOptions(HELP_MENU_OPTIONS),
    );
}

function linkButtons(targetUrl, label, isReview = false) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(targetUrl),
        new ButtonBuilder().setLabel('Main Docs').setStyle(ButtonStyle.Link).setURL('https://docs.peaxel.me/'),
        new ButtonBuilder().setLabel('Open Hub').setStyle(ButtonStyle.Link).setURL('https://peaxel.genefty.com/app'),
    );
    if (isReview) {
        row.addComponents(
            new ButtonBuilder().setLabel('Zealy Quest').setStyle(ButtonStyle.Link).setURL('https://zealy.io/c/peaxel'),
        );
    }
    return row;
}

export async function execute(interaction) {
    const response = await interaction.reply({
        embeds: [mainEmbed()],
        components: [helpMenu()],
        flags: [MessageFlags.Ephemeral],
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'This help menu is not for you — run `/help` yourself.', ephemeral: true });
        }

        const value = i.values[0];

        if (HELP_TOPICS[value]) {
            await i.update({
                content: null,
                embeds: [topicEmbed(value)],
                components: [helpMenu()],
            });
            return;
        }

        let targetUrl = 'https://docs.peaxel.me/guide';
        let label = 'Open Documentation';
        let isReview = false;

        switch (value) {
            case 'link_play':
                targetUrl = 'https://docs.peaxel.me/guide/getting-started';
                label = 'Guide: Getting Started';
                break;
            case 'link_cards':
                targetUrl = 'https://docs.peaxel.me/guide/cards-and-rarity';
                label = 'Guide: Cards & Rarity';
                break;
            case 'link_support':
                targetUrl = 'https://ace.peaxel.me';
                label = 'Chat with Ace AI';
                break;
            case 'link_trustpilot':
                targetUrl = 'https://www.trustpilot.com/review/peaxel.me';
                label = 'Leave a Review ⭐';
                isReview = true;
                break;
            default:
                break;
        }

        await i.update({
            content: isReview
                ? '🙏 **Thanks for supporting Peaxel!** Leave a review, then claim your rewards on Zealy:'
                : `🔗 **${label}** — open the link below:`,
            embeds: [],
            components: [linkButtons(targetUrl, label, isReview), helpMenu()],
        });
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [helpMenu(true)] });
        } catch {
            /* reply may already be gone */
        }
    });
}

export default { data, execute };
