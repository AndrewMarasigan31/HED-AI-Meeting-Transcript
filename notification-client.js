// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATION CLIENT - TELEGRAM
// Sends instant Telegram notifications when new recording is detected
// Separate from main src/ folder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEND NEW RECORDING NOTIFICATION VIA TELEGRAM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function notifyNewRecording(meetingId, recordingId) {
  try {
    // Check if Telegram is configured
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('⚠️  Telegram not configured, skipping notification');
      return;
    }

    const message = `
🔔 *New Meeting Recording*

A new meeting recording has been detected and is being processed automatically.

📋 *Meeting ID:* \`${meetingId}\`
🎙️ *Recording ID:* \`${recordingId}\`
⏰ *Time:* ${new Date().toLocaleString()}

📧 Your formatted meeting notes will appear as a Gmail draft in approximately 30-60 seconds.

_Automated notification from Attio Meeting Notes Automation_
    `.trim();

    // Send message via Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }

    console.log('📬 Telegram notification sent: New recording detected');

  } catch (error) {
    // Don't let notification errors break the main workflow
    console.error('⚠️  Failed to send Telegram notification:', error.message);
  }
}
