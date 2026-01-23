import { 
  ModalBuilder, TextInputBuilder, TextInputStyle, 
  ActionRowBuilder, EmbedBuilder, AttachmentBuilder 
} from 'discord.js';
import { saveFeedbackData, hasAlreadySubmitted, getFeedbackStats } from '../utils/feedbackStore.js';
import { getConfig } from '../utils/configManager.js'; // Import config to find the general channel
import fs from 'fs';
import { resolve } from 'path';

/**
 * Handles the feedback button or command - displays the modal
 * Includes a check to prevent multiple submissions from the same user
 */
export async function handleFeedbackButton(interaction) {
  // Check if user has already submitted feedback
  if (hasAlreadySubmitted(interaction.user.id)) {
    return interaction.reply({ 
      content: '❌ You have already submitted your feedback for this period. Thank you!', 
      ephemeral: true 
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('feedback_modal')
    .setTitle('💬 Game Feedback');

  // Input: Star Rating
  const ratingInput = new TextInputBuilder()
    .setCustomId('feedback_rating')
    .setLabel('Rate our project (1-5)')
    .setPlaceholder('Enter a number from 1 to 5')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1);

  // Input: Positive Feedback
  const likedInput = new TextInputBuilder()
    .setCustomId('feedback_liked')
    .setLabel('What did you enjoy?')
    .setPlaceholder('Tell us what worked well...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  // Input: Improvements
  const improveInput = new TextInputBuilder()
    .setCustomId('feedback_improve')
    .setLabel('What could be improved?')
    .setPlaceholder('Share your suggestions for the game...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  // Input: Extra Comments
  const commentsInput = new TextInputBuilder()
    .setCustomId('feedback_comments')
    .setLabel('Any other comments?')
    .setPlaceholder('Optional: anything else to share?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  // Action rows for modal components
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
 * Saves data, updates stats, notifies admins, and announces publicly
 */
export async function handleFeedbackSubmit(interaction) {
  const rating = interaction.fields.getTextInputValue('feedback_rating');
  const liked = interaction.fields.getTextInputValue('feedback_liked');
  const improve = interaction.fields.getTextInputValue('feedback_improve');
  const comments = interaction.fields.getTextInputValue('feedback_comments') || 'N/A';

  const ratingNum = parseInt(rating);
  // Validation: Rating must be a number between 1 and 5
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return interaction.reply({ content: '❌ Invalid rating. Please enter a number between 1 and 5.', ephemeral: true });
  }

  // Prepare data for JSON storage
  const feedbackEntry = {
    date: new Date().toISOString(),
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    rating: ratingNum,
    liked: liked.replace(/,/g, ';'), 
    improve: improve.replace(/,/g, ';'),
    comments: comments.replace(/,/g, ';')
  };
  
  // 1. Save to local JSON database (Railway Volume)
  saveFeedbackData(feedbackEntry);

  // 2. Update the Voice Channel Stats immediately
  await updateFeedbackStatsChannel(interaction.client);

  // 3. ANNOUNCEMENT: Post in the Welcome/General channel to boost engagement
  try {
    const config = getConfig();
    const generalChannelId = config.channels?.welcome || '1369976259613954059'; 
    const generalChannel = await interaction.client.channels.fetch(generalChannelId);

    if (generalChannel) {
      await generalChannel.send({
        content: `🚀 **New Activity!** <@${interaction.user.id}> just published a feedback! \n*Managers, share your thoughts too by using the feedback button!*`
      });
    }
  } catch (error) {
    console.error('[FeedbackHandler] Public announcement failed:', error.message);
  }

  // 4. Forward feedback to the specific admin channel (Logs)
  const feedbackChannelId = process.env.FEEDBACK_CHANNEL_ID || '1369976255860051973';
  
  try {
    const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelId);
    if (feedbackChannel) {
      const stars = '⭐'.repeat(ratingNum);
      const embed = new EmbedBuilder()
        .setTitle('📝 New Feedback Received')
        .setColor(ratingNum > 3 ? 0x22C55E : 0xEF4444) 
        .addFields(
          { name: '👤 Manager', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: '⭐ Rating', value: `${stars} (${ratingNum}/5)`, inline: true },
          { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
          { name: '💚 What worked', value: liked },
          { name: '💡 Improvements', value: improve },
          { name: '💬 Extra Comments', value: comments }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${interaction.user.id}` });

      await feedbackChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[FeedbackHandler] Error sending to admin channel:', error.message);
  }

  // Confirm submission to the user
  await interaction.reply({ 
    content: '✅ **Thank you!** Feedback saved and stats updated. Coach Ace has received your report.', 
    ephemeral: true 
  });
}

/**
 * Updates the designated stats channel name
 */
export async function updateFeedbackStatsChannel(client) {
    const statsChannelId = process.env.FEEDBACK_STATS_CHANNEL_ID;
    
    if (!statsChannelId) {
        console.warn('[FeedbackHandler] ⚠️ Stats update skipped: FEEDBACK_STATS_CHANNEL_ID not found in .env');
        return;
    }

    try {
        const channel = await client.channels.fetch(statsChannelId);
        
        if (channel) {
            const { total, average } = getFeedbackStats();
            const newName = `Feedback: ${total} | ${average} ⭐`;
            
            console.log(`[FeedbackHandler] 🔄 Attempting to rename channel ${statsChannelId} to: "${newName}"`);
            
            await channel.setName(newName);
            console.log(`[FeedbackHandler] ✅ Stats channel updated successfully.`);
        }
    } catch (error) {
        if (error.status === 429) {
            console.error('[FeedbackHandler] ⏳ Rate Limited! Discord limits channel renaming to 2 times per 10 minutes.');
        } else {
            console.error('[FeedbackHandler] ❌ Stats channel update failed:', error.message);
        }
    }
}

/**
 * Generates and sends the feedback database as a CSV file
 */
export async function exportFeedbackCSV(interaction) {
  const DB_PATH = resolve('./data/feedbacks.json');
  
  if (!fs.existsSync(DB_PATH)) {
    return interaction.reply({ content: '❌ No feedback data found in the database.', ephemeral: true });
  }

  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(rawData);

    if (data.length === 0) {
      return interaction.reply({ content: '❌ The feedback database is currently empty.', ephemeral: true });
    }

    const header = 'Date,User,Rating,Liked,Improve,Comments\n';
    const csvRows = data.map(f => {
      return `"${f.date}","${f.userTag}",${f.rating},"${f.liked}","${f.improve}","${f.comments}"`;
    }).join('\n');
    
    const csvContent = header + csvRows;
    const exportFilePath = resolve('./data/feedback_export.csv');
    
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    
    fs.writeFileSync(exportFilePath, csvContent);
    const file = new AttachmentBuilder(exportFilePath);

    await interaction.reply({ 
      content: `📊 **Feedback Export Successful**\nTotal records found: **${data.length}**`, 
      files: [file], 
      ephemeral: true 
    });
  } catch (err) {
    console.error('[FeedbackHandler] Export Error:', err);
    await interaction.reply({ content: '❌ An error occurred while generating the CSV file.', ephemeral: true });
  }
}