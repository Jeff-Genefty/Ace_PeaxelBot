import { 
  ModalBuilder, TextInputBuilder, TextInputStyle, 
  ActionRowBuilder, EmbedBuilder, AttachmentBuilder 
} from 'discord.js';
import { saveFeedbackData, hasAlreadySubmitted, getFeedbackStats } from '../utils/feedbackStore.js';
import fs from 'fs';
import { resolve } from 'path';

/**
 * Handles the feedback button or command - displays the modal
 */
export async function handleFeedbackButton(interaction) {
  if (hasAlreadySubmitted(interaction.user.id)) {
    return interaction.reply({ 
      content: '❌ You have already submitted your feedback for this period. Thank you!', 
      ephemeral: true 
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('feedback_modal')
    .setTitle('💬 Game Feedback');

  const ratingInput = new TextInputBuilder()
    .setCustomId('feedback_rating')
    .setLabel('Rate this week\'s game (1-5)')
    .setPlaceholder('Enter a number from 1 to 5')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  const likedInput = new TextInputBuilder()
    .setCustomId('feedback_liked')
    .setLabel('What did you enjoy?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const improveInput = new TextInputBuilder()
    .setCustomId('feedback_improve')
    .setLabel('What could be improved?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const commentsInput = new TextInputBuilder()
    .setCustomId('feedback_comments')
    .setLabel('Any other comments?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ratingInput),
    new ActionRowBuilder().addComponents(likedInput),
    new ActionRowBuilder().addComponents(improveInput),
    new ActionRowBuilder().addComponents(commentsInput)
  );

  await interaction.showModal(modal);
}

/**
 * Processes the modal submission
 * Saves data, updates the stats channel, and notifies admins
 */
export async function handleFeedbackSubmit(interaction) {
  const rating = interaction.fields.getTextInputValue('feedback_rating');
  const liked = interaction.fields.getTextInputValue('feedback_liked');
  const improve = interaction.fields.getTextInputValue('feedback_improve');
  const comments = interaction.fields.getTextInputValue('feedback_comments') || 'N/A';

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return interaction.reply({ content: '❌ Invalid rating. Please enter a number between 1 and 5.', ephemeral: true });
  }

  // 1. Save to JSON database
  const feedbackEntry = {
    date: new Date().toISOString(),
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    rating: ratingNum,
    liked: liked.replace(/,/g, ';'), 
    improve: improve.replace(/,/g, ';'),
    comments: comments.replace(/,/g, ';')
  };
  saveFeedbackData(feedbackEntry);

  // 2. Update the Voice Channel Stats immediately
  await updateFeedbackStatsChannel(interaction.client);

  // 3. Forward to Admin Channel
  const feedbackChannelId = process.env.FEEDBACK_CHANNEL_ID || '1369976255998591000';
  try {
    const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelId);
    if (feedbackChannel) {
      const stars = '⭐'.repeat(ratingNum);
      const embed = new EmbedBuilder()
        .setTitle('📝 New Feedback Received')
        .setColor(ratingNum > 3 ? 0x22C55E : 0xEF4444)
        .addFields(
          { name: '👤 Manager', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⭐ Rating', value: `${stars} (${ratingNum}/5)`, inline: true },
          { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
          { name: '💚 Liked', value: liked },
          { name: '💡 Improvements', value: improve },
          { name: '💬 Comments', value: comments }
        )
        .setTimestamp();

      await feedbackChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[FeedbackHandler] Admin log error:', error.message);
  }

  await interaction.reply({ content: '✅ **Thank you!** Feedback saved and stats updated.', ephemeral: true });
}

/**
 * Updates the designated stats channel name
 * Format: "Feedback: 12 | 4.5 ⭐"
 */
export async function updateFeedbackStatsChannel(client) {
    const statsChannelId = process.env.FEEDBACK_STATS_CHANNEL_ID;
    if (!statsChannelId) return;

    try {
        const channel = await client.channels.fetch(statsChannelId);
        if (channel) {
            const { total, average } = getFeedbackStats();
            const newName = `Feedback: ${total} | ${average} ⭐`;
            await channel.setName(newName);
        }
    } catch (error) {
        console.error('[FeedbackHandler] Stats channel update failed:', error.message);
    }
}

/**
 * Generates and sends a CSV extract
 */
export async function exportFeedbackCSV(interaction) {
  const DB_PATH = resolve('./data/feedbacks.json');
  if (!fs.existsSync(DB_PATH)) return interaction.reply({ content: '❌ Database not found.', ephemeral: true });

  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const header = 'Date,User,Rating,Liked,Improve,Comments\n';
    const csvRows = data.map(f => `"${f.date}","${f.userTag}",${f.rating},"${f.liked}","${f.improve}","${f.comments}"`).join('\n');
    
    const exportPath = resolve('./data/feedback_export.csv');
    fs.writeFileSync(exportPath, header + csvRows);
    
    await interaction.reply({ 
      content: `📊 **Export Complete** (${data.length} entries)`, 
      files: [new AttachmentBuilder(exportPath)], 
      ephemeral: true 
    });
  } catch (err) {
    await interaction.reply({ content: '❌ Export failed.', ephemeral: true });
  }
}