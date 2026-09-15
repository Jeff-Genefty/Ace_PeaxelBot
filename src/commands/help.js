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
import { getHelpTopics, getHelpMenuOptions } from '../content/hubHelp.js';
import { pick } from '../utils/discordLocale.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hub Pass, XP, cards, challenges — and quick links.')
    .setDescriptionLocalizations({
        fr: 'Hub Pass, XP, cartes, défis — et liens utiles.',
    });

function mainEmbed(locale) {
    return new EmbedBuilder()
        .setTitle(pick(locale, '🏟️ Peaxel Help Center', '🏟️ Centre d’aide Peaxel'))
        .setColor(0xa855f7)
        .setDescription(
            pick(
                locale,
                'Everything about the **Community Hub**, game docs, and support.\n\n'
                + '**Hub Pass** — earn XP on Discord (`/daily`, messages, challenges), climb levels, unlock cards in your vault, and fight for weekly #1.\n\n'
                + 'Pick a topic below. Need more? Chat with **Ace AI** or open a ticket.',
                'Tout sur le **Community Hub**, la doc jeu et le support.\n\n'
                + '**Hub Pass** — gagne de l’XP sur Discord (`/daily`, messages, défis), monte de niveau, débloque des cartes, vise le #1 hebdo.\n\n'
                + 'Choisis un sujet ci-dessous. Besoin de plus ? Parle à **Ace AI** ou ouvre un ticket.',
            ),
        )
        .addFields(
            {
                name: pick(locale, 'Quick start', 'Démarrage rapide'),
                value: pick(
                    locale,
                    '1. Message on the server → `/daily`\n'
                    + '2. Check progress with `/rank`\n'
                    + '3. Open [Hub `/app`](https://peaxel.genefty.com/app) for challenges & vault',
                    '1. Message sur le serveur → `/daily`\n'
                    + '2. Vérifie ta progression avec `/rank`\n'
                    + '3. Ouvre [Hub `/app`](https://peaxel.genefty.com/app) pour défis & coffre',
                ),
            },
            {
                name: pick(locale, 'Also useful', 'Aussi utile'),
                value: pick(
                    locale,
                    '• `/how-to-play` — game lineups & scoring\n'
                    + '• [docs.peaxel.me](https://docs.peaxel.me) · [ace.peaxel.me](https://ace.peaxel.me)\n'
                    + '• Trustpilot review → claim **200 XP** on Zealy',
                    '• `/how-to-play` — lineups & scoring\n'
                    + '• [docs.peaxel.me](https://docs.peaxel.me) · [ace.peaxel.me](https://ace.peaxel.me)\n'
                    + '• Avis Trustpilot → **200 XP** sur Zealy',
                ),
            },
        )
        .setFooter({
            text: pick(
                locale,
                'Peaxel Hub · Select a topic · Menu expires in 2 min',
                'Peaxel Hub · Choisis un sujet · Menu expire dans 2 min',
            ),
        });
}

function topicEmbed(topicKey, locale) {
    const topic = getHelpTopics(locale)[topicKey];
    const embed = new EmbedBuilder()
        .setTitle(topic.title)
        .setColor(topic.color)
        .setDescription(topic.description);
    for (const field of topic.fields) {
        embed.addFields({ name: field.name, value: field.value });
    }
    embed.setFooter({
        text: pick(locale, 'Peaxel Hub · Use the menu to switch topics', 'Peaxel Hub · Utilise le menu pour changer de sujet'),
    });
    return embed;
}

function helpMenu(locale, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder(pick(locale, 'What do you need?', 'De quoi as-tu besoin ?'))
            .setDisabled(disabled)
            .addOptions(getHelpMenuOptions(locale)),
    );
}

function linkButtons(locale, targetUrl, label, isReview = false) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(targetUrl),
        new ButtonBuilder()
            .setLabel(pick(locale, 'Main Docs', 'Docs'))
            .setStyle(ButtonStyle.Link)
            .setURL('https://docs.peaxel.me/'),
        new ButtonBuilder()
            .setLabel(pick(locale, 'Open Hub', 'Ouvrir le Hub'))
            .setStyle(ButtonStyle.Link)
            .setURL('https://peaxel.genefty.com/app'),
    );
    if (isReview) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel(pick(locale, 'Zealy Quest', 'Quête Zealy'))
                .setStyle(ButtonStyle.Link)
                .setURL('https://zealy.io/c/peaxel'),
        );
    }
    return row;
}

export async function execute(interaction) {
    const locale = interaction.locale;
    const response = await interaction.reply({
        embeds: [mainEmbed(locale)],
        components: [helpMenu(locale)],
        flags: [MessageFlags.Ephemeral],
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({
                content: pick(
                    locale,
                    'This help menu is not for you — run `/help` yourself.',
                    'Ce menu d’aide n’est pas pour toi — lance `/help` toi-même.',
                ),
                ephemeral: true,
            });
        }

        const value = i.values[0];
        const topics = getHelpTopics(locale);

        if (topics[value]) {
            await i.update({
                content: null,
                embeds: [topicEmbed(value, locale)],
                components: [helpMenu(locale)],
            });
            return;
        }

        let targetUrl = 'https://docs.peaxel.me/guide';
        let label = pick(locale, 'Open Documentation', 'Ouvrir la documentation');
        let isReview = false;

        switch (value) {
            case 'link_play':
                targetUrl = 'https://docs.peaxel.me/guide/getting-started';
                label = pick(locale, 'Guide: Getting Started', 'Guide : démarrage');
                break;
            case 'link_cards':
                targetUrl = 'https://docs.peaxel.me/guide/cards-and-rarity';
                label = pick(locale, 'Guide: Cards & Rarity', 'Guide : cartes & rareté');
                break;
            case 'link_support':
                targetUrl = 'https://ace.peaxel.me';
                label = pick(locale, 'Chat with Ace AI', 'Parler à Ace AI');
                break;
            case 'link_trustpilot':
                targetUrl = 'https://www.trustpilot.com/review/peaxel.me';
                label = pick(locale, 'Leave a Review ⭐', 'Laisser un avis ⭐');
                isReview = true;
                break;
            default:
                break;
        }

        await i.update({
            content: isReview
                ? pick(
                    locale,
                    '🙏 **Thanks for supporting Peaxel!** Leave a review, then claim your rewards on Zealy:',
                    '🙏 **Merci de soutenir Peaxel !** Laisse un avis, puis claim tes rewards sur Zealy :',
                )
                : pick(locale, `🔗 **${label}** — open the link below:`, `🔗 **${label}** — ouvre le lien ci-dessous :`),
            embeds: [],
            components: [linkButtons(locale, targetUrl, label, isReview), helpMenu(locale)],
        });
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [helpMenu(locale, true)] });
        } catch {
            /* reply may already be gone */
        }
    });
}

export default { data, execute };
