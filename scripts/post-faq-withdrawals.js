/**
 * One-shot: post Withdrawals FAQ embed to the FAQ channel.
 * Usage: node scripts/post-faq-withdrawals.js
 */
import { config } from 'dotenv';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
} from 'discord.js';
import { resolve } from 'path';

config();

const CHANNEL_ID = process.env.FAQ_CHANNEL_ID || '1370054311949631648';
const ASSETS = resolve('./assets');
const FILE = 'faq-withdrawals.png';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel?.isTextBased()) throw new Error(`Channel ${CHANNEL_ID} not text-based`);

        const file = new AttachmentBuilder(resolve(ASSETS, FILE), { name: FILE });
        const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('💸 Withdrawals & payouts')
            .setDescription(
                'Rewards go to your **Peaxel wallet**. Cash withdrawals are paid out via **wire transfer** or **Stripe**, '
                + 'depending on your **location / region**. Payouts follow a fixed schedule — they are **not** instant or on-demand.',
            )
            .addFields(
                {
                    name: 'Payout methods',
                    value:
                        '• **Wire transfer** or **Stripe** — available method depends on your **geolocation**\n'
                        + '• The option shown in your Peaxel account is the one enabled for your region\n'
                        + '• We cannot force a method that is unavailable in your country',
                },
                {
                    name: 'Processing schedule',
                    value:
                        '• Withdrawals are processed **once per day**\n'
                        + '• **Monday to Friday only** (no weekend processing)\n'
                        + '• Instant / on-demand payouts are **not available**',
                },
                {
                    name: 'Important notice',
                    value:
                        'Please **do not open repeated tickets** asking when your payment will arrive or which method you “should” get.\n\n'
                        + 'If ticket volume about payment timing continues, we will:\n'
                        + '1. **Auto-close** those tickets\n'
                        + '2. Move payout processing to **once per week** instead of daily\n\n'
                        + 'Thanks for your understanding — this keeps payouts fast and fair for everyone.',
                },
                {
                    name: 'Need help?',
                    value:
                        'Open a ticket only for **real payout issues** (missing transfer after the expected window, '
                        + 'failed Stripe payout, wrong bank details, etc.) — not for “when will I get paid?” '
                        + 'or “can I switch to Stripe/wire?” questions.',
                },
            )
            .setImage(`attachment://${FILE}`)
            .setFooter({ text: 'Peaxel · Withdrawals · Wire / Stripe by region · Mon–Fri' })
            .setTimestamp();

        const sent = await channel.send({ embeds: [embed], files: [file] });
        console.log(`✅ Withdrawals FAQ posted → ${sent.id} in #${channel.name || CHANNEL_ID}`);
    } catch (err) {
        console.error('Failed:', err);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN missing');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
