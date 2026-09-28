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

/** Verrou anti double-clic parallèle (même userId). */
const creatingLocks = new Set();

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

function ticketUrl(guildId, channelId) {
    return `https://discord.com/channels/${guildId}/${channelId}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cherche un ticket claim encore ouvert pour ce user (store + scan catégorie Discord).
 * @returns {Promise<null | { channel: import('discord.js').GuildChannel, url: string, cardId: string|null, reason: string|null }>}
 */
export async function findOpenTicketForUser(client, userId) {
    const uid = String(userId);
    const guildId = process.env.DISCORD_GUILD_ID;
    const categoryId = getTicketCategoryId();
    const store = loadStore();

    for (const [channelId, meta] of Object.entries(store.byChannel || {})) {
        if (String(meta.userId) !== uid) continue;
        try {
            const ch = await client.channels.fetch(channelId);
            if (ch) {
                return {
                    channel: ch,
                    url: ticketUrl(guildId, channelId),
                    cardId: meta.cardId || null,
                    reason: meta.reason || null,
                };
            }
        } catch {
            removeTicketMeta(channelId);
        }
    }

    if (!client || !guildId || !categoryId) return null;

    try {
        const guild = await client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        for (const [, ch] of channels) {
            if (!ch || ch.parentId !== categoryId || ch.type !== ChannelType.GuildText) continue;
            const topic = String(ch.topic || '');
            const parts = topic.split(' · ').map((s) => s.trim());
            if (parts[2] !== uid && !topic.includes(uid)) continue;

            saveTicketMeta(ch.id, {
                userId: uid,
                reason: parts[1] || 'unknown',
                peaxelContact: parts[3] || null,
                cardId: null,
                discordUsername: null,
                createdAt: new Date().toISOString(),
            });
            return {
                channel: ch,
                url: ticketUrl(guildId, ch.id),
                cardId: null,
                reason: parts[1] || null,
            };
        }
    } catch (err) {
        console.error('[ClaimTicket] open-ticket scan failed:', err.message);
    }
    return null;
}

async function notifyExistingTicket(channel, {
    userId,
    reason,
    peaxelContact,
    cardId,
}) {
    if (!channel?.isTextBased?.()) return;
    const label = reasonLabel(reason);
    await channel.send({
        content: `<@${userId}>`,
        embeds: [
            new EmbedBuilder()
                .setTitle('🎫 Additional claim on open ticket')
                .setColor(0xa855f7)
                .setDescription(
                    `Another claim arrived while this ticket is still open — **no second ticket created**.\n\n`
                    + `**Reward:** ${label}\n`
                    + (peaxelContact ? `**Peaxel contact:** \`${peaxelContact}\`\n` : '')
                    + (cardId ? `**Card id:** \`${cardId}\`\n` : '')
                    + `\n_Staff can deliver here._`,
                )
                .setTimestamp(),
        ],
    }).catch(() => null);
}

async function clearClaimButton(interaction) {
    if (interaction?.message?.editable) {
        await interaction.message.edit({ components: [] }).catch(() => null);
    }
}

function formatTicketReply(result) {
    if (result.alreadyOpen) {
        return `ℹ️ Your delivery ticket is already open — Ace tagged you here: ${result.url}`;
    }
    return `✅ Ticket opened — Ace tagged you here: ${result.url}`;
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
 * Anti-doublon : 1 ticket ouvert max par user — 2e claim → message + note staff.
 * @returns {{ ok: boolean, alreadyOpen?: boolean, channel?: import('discord.js').GuildChannel, url?: string, reason?: string, cardId?: string|null }}
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
    const uid = String(userId);

    if (!categoryId || !guildId) {
        return { ok: false, reason: 'missing_config' };
    }

    const contact = String(peaxelContact || '').trim();
    if (!contact) return { ok: false, reason: 'missing_contact' };

    setPeaxelContact(userId, contact, { username: discordUsername });

    const existing = await findOpenTicketForUser(client, uid);
    if (existing) {
        await notifyExistingTicket(existing.channel, {
            userId: uid,
            reason,
            peaxelContact: contact,
            cardId,
        });
        addLiveLog('TICKET', `Claim ticket already open · ${discordUsername || uid} · ${reason}`);
        return {
            ok: true,
            alreadyOpen: true,
            channel: existing.channel,
            url: existing.url,
            cardId: existing.cardId || cardId || null,
        };
    }

    if (creatingLocks.has(uid)) {
        await sleep(800);
        const again = await findOpenTicketForUser(client, uid);
        if (again) {
            return {
                ok: true,
                alreadyOpen: true,
                channel: again.channel,
                url: again.url,
                cardId: again.cardId || cardId || null,
            };
        }
        return { ok: false, reason: 'in_progress' };
    }

    creatingLocks.add(uid);
    try {
        const raced = await findOpenTicketForUser(client, uid);
        if (raced) {
            await notifyExistingTicket(raced.channel, {
                userId: uid,
                reason,
                peaxelContact: contact,
                cardId,
            });
            return {
                ok: true,
                alreadyOpen: true,
                channel: raced.channel,
                url: raced.url,
                cardId: raced.cardId || cardId || null,
            };
        }

        let card = null;
        if (cardId) {
            card = { id: cardId };
        } else if (
            reason === 'quiz_win'
            || reason === 'weekly_quest'
            || reason === 'streak_milestone'
            || reason === 'leaderboard_weekly'
            || reason === 'weekly_podium'
        ) {
            const claimed = claimPendingCardByReason(
                userId,
                reason === 'weekly_podium' ? 'leaderboard_weekly' : reason,
                { username: discordUsername, peaxelContact: contact },
            );
            card = claimed.card || null;
        } else if (reason === 'ace_chat' || reason === 'giveaway') {
            card = registerDirectCardClaim(userId, reason, {
                username: discordUsername,
                peaxelContact: contact,
            });
        }

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
            topic: `Card claim · ${reason} · ${uid} · ${contact}`,
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
            userId: uid,
            reason,
            peaxelContact: contact,
            cardId: card?.id || cardId || null,
            discordUsername: discordUsername || null,
            createdAt: new Date().toISOString(),
        });

        const url = ticketUrl(guildId, channel.id);
        addLiveLog('TICKET', `Claim ticket opened · ${discordUsername || uid} · ${reason}`);
        return { ok: true, alreadyOpen: false, channel, url, cardId: card?.id || cardId || null };
    } catch (err) {
        console.error('[ClaimTicket] create failed:', err.message);
        addLiveLog('ERROR', `Claim ticket failed: ${err.message}`);
        return { ok: false, reason: err.message };
    } finally {
        creatingLocks.delete(uid);
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

    const existing = await findOpenTicketForUser(client, userId);
    if (existing) {
        const descExtra = `\n\n🎫 **Your delivery ticket is already open** — ${existing.url}`;
        const winEmbed = embed
            ? EmbedBuilder.from(embed).setDescription(`${embed.data?.description || ''}${descExtra}`)
            : null;
        await channel.send({
            content: mentionContent,
            embeds: winEmbed ? [winEmbed] : [],
            components: [],
        });
        await notifyExistingTicket(existing.channel, {
            userId,
            reason,
            peaxelContact: getHubProfile(userId).peaxelContact || null,
            cardId: null,
        });
        return { ok: true, alreadyOpen: true, channel: existing.channel, url: existing.url };
    }

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
            ? (result.alreadyOpen
                ? `\n\n🎫 **Your delivery ticket is already open** — ${result.url}`
                : `\n\n🎫 **Delivery ticket opened** — Ace tagged you in ${result.url}`)
            : `\n\nClick **Open delivery ticket** if the auto-ticket failed.`;

        const winEmbed = embed
            ? EmbedBuilder.from(embed).setDescription(`${embed.data?.description || ''}${descExtra}`)
            : null;

        await channel.send({
            content: mentionContent,
            embeds: winEmbed ? [winEmbed] : [],
            components: result.ok ? [] : [buildClaimDeliveryRow(reason)],
        });

        if (result.ok && !result.alreadyOpen) {
            await channel.send({
                content: `<@${userId}> your private delivery ticket is ready — staff + Ace are waiting for you there.`,
            }).catch(() => null);
        } else if (result.ok && result.alreadyOpen) {
            await channel.send({
                content: `<@${userId}> your delivery ticket is already open: ${result.url}`,
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
    await clearClaimButton(interaction);
    return interaction.editReply({ content: formatTicketReply(result) });
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
    await clearClaimButton(interaction);
    return interaction.editReply({ content: formatTicketReply(result) });
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
