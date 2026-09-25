/**
 * Tickets Discord auto pour livraison de cartes Athlete.
 * Catégorie privée + user + rôles staff + bouton de clôture staff.
 */

import {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import { resolve } from 'path';
import { readJsonSync, updateJsonSync } from './jsonStore.js';
import {
    getTicketCategoryId,
    getClaimStaffRoleIds,
} from './configManager.js';
import {
    getHubProfile,
    setPeaxelContact,
    claimPendingCardByReason,
    registerDirectCardClaim,
    fulfillClaimedCard,
} from '../web/services/hubXpService.js';
import { addLiveLog } from '../web/services/liveLogService.js';

const STORE_PATH = resolve('./data/claim_tickets.json');

export const CLAIM_BTN_PREFIX = 'claim_ticket_start:';
export const CLAIM_MODAL_PREFIX = 'claim_ticket_modal:';
export const CLAIM_CLOSE_ID = 'claim_ticket_close';

const REASON_LABELS = {
    ace_chat: 'Ace chat reward (Free Athlete Card)',
    quiz_win: 'Scout Quiz win',
    giveaway: 'Weekend giveaway',
    weekly_podium: 'Weekly XP champion (#1)',
    weekly_quest: 'Weekly Hub quest complete',
    streak_milestone: 'Daily streak milestone',
    leaderboard_weekly: 'Weekly XP champion (#1)',
    hub_claim: 'Hub card vault claim',
};

function defaultStore() {
    return { byChannel: {} };
}

function loadStore() {
    return { ...defaultStore(), ...readJsonSync(STORE_PATH, defaultStore()) };
}

function saveTicketMeta(channelId, meta) {
    updateJsonSync(STORE_PATH, defaultStore(), (store) => {
        if (!store.byChannel) store.byChannel = {};
        store.byChannel[channelId] = meta;
        return store;
    });
}

function removeTicketMeta(channelId) {
    updateJsonSync(STORE_PATH, defaultStore(), (store) => {
        if (store.byChannel?.[channelId]) delete store.byChannel[channelId];
        return store;
    });
}

export function reasonLabel(reason) {
    return REASON_LABELS[reason] || reason || 'Athlete Card reward';
}

export function sanitizeChannelName(discordUsername) {
    const base = String(discordUsername || 'manager')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20) || 'manager';
    return `claim-${base}`.slice(0, 90);
}

export function buildClaimDeliveryRow(reason) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${CLAIM_BTN_PREFIX}${reason}`)
            .setLabel('Open delivery ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Success),
    );
}

export function buildClaimContactModal(reason) {
    return new ModalBuilder()
        .setCustomId(`${CLAIM_MODAL_PREFIX}${reason}`)
        .setTitle('Peaxel delivery details')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('peaxel_contact')
                    .setLabel('In-game username OR email')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. AceManager22 or you@email.com')
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(100),
            ),
        );
}

function isStaffMember(member) {
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    const staffIds = getClaimStaffRoleIds();
    return staffIds.some((id) => member.roles.cache.has(id));
}

function buildTicketIntro({ userId, peaxelContact, reason, discordTag }) {
    const label = reasonLabel(reason);
    return {
        content: `<@${userId}>`,
        embeds: [
            new EmbedBuilder()
                .setTitle('🎫 Card delivery ticket')
                .setColor(0xa855f7)
                .setDescription(
                    `Hey <@${userId}> — **Ace opened this private ticket** so the Peaxel team can deliver your **Athlete Card**.\n\n`
                    + `Please keep an eye on this channel: staff will confirm once the card is on your Peaxel account.\n\n`
                    + `**Peaxel username / email on file:** \`${peaxelContact}\`\n`
                    + `**Reward:** ${label}\n`
                    + `**Discord:** ${discordTag || '—'}\n\n`
                    + `_Reply here if any detail looks wrong._`,
                )
                .setFooter({ text: 'Peaxel · Ace delivery · Staff close when done' })
                .setTimestamp(),
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CLAIM_CLOSE_ID)
                    .setLabel('Close ticket (staff)')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
            ),
        ],
    };
}

/**
 * Crée un salon ticket privé et y taggue l'utilisateur.
 * @returns {{ ok: boolean, channel?: import('discord.js').GuildChannel, url?: string, reason?: string }}
 */
export async function createClaimTicket(client, {
    userId,
    discordUsername,
    peaxelContact,
    reason,
    cardId = null,
}) {
    const categoryId = getTicketCategoryId();
    const staffRoleIds = getClaimStaffRoleIds();
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!categoryId || !guildId) {
        return { ok: false, reason: 'missing_config' };
    }

    const contact = String(peaxelContact || '').trim();
    if (!contact) return { ok: false, reason: 'missing_contact' };

    setPeaxelContact(userId, contact, { username: discordUsername });

    let card = null;
    if (cardId) {
        // Hub claim déjà claimé — cardId connu
        card = { id: cardId };
    } else if (reason === 'quiz_win' || reason === 'weekly_quest' || reason === 'streak_milestone' || reason === 'leaderboard_weekly' || reason === 'weekly_podium') {
        const claimed = claimPendingCardByReason(userId, reason === 'weekly_podium' ? 'leaderboard_weekly' : reason, {
            username: discordUsername,
            peaxelContact: contact,
        });
        card = claimed.card || null;
    } else if (reason === 'ace_chat' || reason === 'giveaway') {
        card = registerDirectCardClaim(userId, reason, {
            username: discordUsername,
            peaxelContact: contact,
        });
    }

    try {
        const guild = await client.guilds.fetch(guildId);
        const botId = client.user.id;

        const overwrites = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
                id: userId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                ],
            },
            {
                id: botId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.EmbedLinks,
                ],
            },
            ...staffRoleIds.map((roleId) => ({
                id: roleId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.AttachFiles,
                ],
            })),
        ];

        const channel = await guild.channels.create({
            name: sanitizeChannelName(discordUsername),
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: `Card claim · ${reason} · ${userId} · ${contact}`,
            permissionOverwrites: overwrites,
            reason: `Ace card delivery ticket for ${discordUsername}`,
        });

        const intro = buildTicketIntro({
            userId,
            peaxelContact: contact,
            reason,
            discordTag: discordUsername ? `@${discordUsername}` : `<@${userId}>`,
        });

        await channel.send(intro);

        saveTicketMeta(channel.id, {
            userId: String(userId),
            reason,
            peaxelContact: contact,
            cardId: card?.id || cardId || null,
            discordUsername: discordUsername || null,
            createdAt: new Date().toISOString(),
        });

        const url = `https://discord.com/channels/${guildId}/${channel.id}`;
        addLiveLog('TICKET', `Claim ticket opened · ${discordUsername || userId} · ${reason}`);
        return { ok: true, channel, url, cardId: card?.id || cardId || null };
    } catch (err) {
        console.error('[ClaimTicket] create failed:', err.message);
        addLiveLog('ERROR', `Claim ticket failed: ${err.message}`);
        return { ok: false, reason: err.message };
    }
}

/** Si contact déjà sauvé → ticket immédiat, sinon bouton pour fournir le contact. */
export async function openClaimTicketOrPrompt(client, {
    userId,
    discordUsername,
    reason,
    channel,
    mentionContent,
    embed,
}) {
    if (!channel?.isTextBased?.()) return { ok: false, reason: 'no_channel' };

    const profile = getHubProfile(userId);
    const contact = profile.peaxelContact;

    if (contact) {
        const result = await createClaimTicket(client, {
            userId,
            discordUsername,
            peaxelContact: contact,
            reason,
        });

        const descExtra = result.ok
            ? `\n\n🎫 **Delivery ticket opened** — Ace tagged you in ${result.url}`
            : `\n\nClick **Open delivery ticket** if the auto-ticket failed.`;

        const winEmbed = embed
            ? EmbedBuilder.from(embed).setDescription(`${embed.data?.description || ''}${descExtra}`)
            : null;

        await channel.send({
            content: mentionContent,
            embeds: winEmbed ? [winEmbed] : [],
            components: result.ok ? [] : [buildClaimDeliveryRow(reason)],
        });

        if (result.ok) {
            await channel.send({
                content: `<@${userId}> your private delivery ticket is ready — staff + Ace are waiting for you there.`,
            }).catch(() => null);
        }
        return result;
    }

    const winEmbed = embed
        ? EmbedBuilder.from(embed).setDescription(
            `${embed.data?.description || ''}\n\n`
            + `Click **Open delivery ticket** and share your Peaxel **in-game username or email** — Ace will open a private ticket with staff and tag you.`,
        )
        : null;

    const sent = await channel.send({
        content: mentionContent,
        embeds: winEmbed ? [winEmbed] : [],
        components: [buildClaimDeliveryRow(reason)],
    });
    return { ok: true, prompted: true, message: sent };
}

export async function handleClaimTicketButton(interaction) {
    const reason = interaction.customId.slice(CLAIM_BTN_PREFIX.length);
    if (!reason) {
        return interaction.reply({ content: '❌ Invalid claim button.', flags: MessageFlags.Ephemeral });
    }

    const profile = getHubProfile(interaction.user.id);
    if (!profile.peaxelContact) {
        return interaction.showModal(buildClaimContactModal(reason));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await createClaimTicket(interaction.client, {
        userId: interaction.user.id,
        discordUsername: interaction.user.username,
        peaxelContact: profile.peaxelContact,
        reason,
    });

    if (!result.ok) {
        return interaction.editReply({ content: `❌ Could not open ticket (${result.reason}). Try again or ping staff.` });
    }
    return interaction.editReply({ content: `✅ Ticket opened — Ace tagged you here: ${result.url}` });
}

export async function handleClaimTicketModal(interaction) {
    const reason = interaction.customId.slice(CLAIM_MODAL_PREFIX.length);
    const contact = interaction.fields.getTextInputValue('peaxel_contact')?.trim();
    if (!contact) {
        return interaction.reply({ content: '❌ Username / email required.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await createClaimTicket(interaction.client, {
        userId: interaction.user.id,
        discordUsername: interaction.user.username,
        peaxelContact: contact,
        reason,
    });

    if (!result.ok) {
        return interaction.editReply({ content: `❌ Could not open ticket (${result.reason}).` });
    }
    return interaction.editReply({ content: `✅ Ticket opened — Ace tagged you here: ${result.url}` });
}

export async function handleClaimTicketClose(interaction) {
    if (!isStaffMember(interaction.member)) {
        return interaction.reply({
            content: '❌ Only staff can close delivery tickets.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const meta = loadStore().byChannel?.[interaction.channelId];
    await interaction.reply({ content: '🔒 Closing ticket…' });

    if (meta?.cardId && meta?.userId) {
        fulfillClaimedCard(meta.userId, meta.cardId, {
            username: meta.discordUsername,
            silent: false,
        });
    }

    removeTicketMeta(interaction.channelId);
    addLiveLog('TICKET', `Claim ticket closed by ${interaction.user.tag}`);

    setTimeout(async () => {
        try {
            await interaction.channel?.delete('Ace claim ticket closed by staff');
        } catch (err) {
            console.error('[ClaimTicket] delete failed:', err.message);
        }
    }, 1500);
}
