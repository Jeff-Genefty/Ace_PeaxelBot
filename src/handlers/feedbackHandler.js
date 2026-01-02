import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  EmbedBuilder
} from 'discord.js';
import { recordFeedback } from '../utils/activityTracker.js';
import { logFeedbackReceived } from '../utils/discordLogger.js';

const logPrefix = '[Peaxel Feedback]';

/**
 * Handle the feedback button interaction - show modal
 * @param {import('discord.js').ButtonInteraction} interaction 
 */
export async function handleFeedbackButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('feedback_modal')
    .setTitle('💬 Game Feedback');

  // Input: Rating (1-5)
  const ratingInput = new TextInputBuilder()
    .setCustomId('feedback_rating')
    .setLabel('Rate this week\'s game (1-5)')
    .setPlaceholder('Enter a number from 1 to 5')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1);

  // Input: Positive feedback
  const likedInput = new TextInputBuilder()
    .setCustomId('feedback_liked')
    .setLabel('What did you enjoy?')
    .setPlaceholder('Tell us what worked well...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  // Input: Improvements
  const improveInput = new TextInputBuilder()
    .setCustomId('feedback_improve')
    .setLabel('What could be improved?')
    .setPlaceholder('Share your suggestions...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  // Input: Extra comments
  const commentsInput = new TextInputBuilder()
    .setCustomId('feedback_comments')
    .setLabel('Any other comments?')
    .setPlaceholder('Anything else you\'d like to share...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  // Each component must be in its own ActionRow
  modal.addComponents(
    new ActionRowBuilder().addComponents(ratingInput),
    new ActionRowBuilder().addComponents(likedInput),
    new ActionRowBuilder().addComponents(improveInput),
    new ActionRowBuilder().addComponents(commentsInput)
  );

  await interaction.showModal(modal);
}

/**
 * Handle the feedback modal submission
 * @param {import('discord.js').ModalSubmitInteraction} interaction 
 */
export async function handleFeedbackSubmit(interaction) {
  const rating = interaction.fields.getTextInputValue('feedback_rating');
  const liked = interaction.fields.getTextInputValue('feedback_liked') || 'No response';
  const improve = interaction.fields.getTextInputValue('feedback_improve') || 'No response';
  const comments = interaction.fields.getTextInputValue('feedback_comments') || 'No response';

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return interaction.reply({
      content: '❌ Invalid rating. Please enter a number from 1 to 5.',
      ephemeral: true
    });
  }

  const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

  // Internal Analytics
  recordFeedback();
  await logFeedbackReceived(interaction.user.tag, ratingNum);

  // Forward to Dedicated Feedback Channel
  const feedbackChannelId = process.env.FEEDBACK_CHANNEL_ID;
  if (feedbackChannelId) {
    try {
      const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelId);
      if (feedbackChannel?.isTextBased()) {
        const feedbackEmbed = new EmbedBuilder()
          .setTitle('📝 New Game Feedback')
          .setColor(getRatingColor(ratingNum))
          .addFields(
            { name: '👤 User', value: `${interaction.user.tag}`, inline: true },
            { name: '⭐ Rating', value: `${stars} (${ratingNum}/5)`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '💚 Liked', value: liked },
            { name: '💡 Suggestions', value: improve },
            { name: '💬 Comments', value: comments }
          )
          .setFooter({ text: `User ID: ${interaction.user.id}` })
          .setTimestamp();

        await feedbackChannel.send({ embeds: [feedbackEmbed] });
      }
    } catch (error) {
      console.error(`${logPrefix} Error forwarding feedback:`, error.message);
    }
  }

  // Final confirmation to user
  await interaction.reply({
    content: `✅ **Thank you for your feedback!**\n\nYour rating: ${stars}\nWe appreciate your help in improving Peaxel!`,
    ephemeral: true
  });
}

function getRatingColor(rating) {
  const colors = { 1: 0xEF4444, 2: 0xF97316, 3: 0xEAB308, 4: 0x84CC16, 5: 0x22C55E };
  return colors[rating] || 0x6366F1;
}