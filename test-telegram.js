#!/usr/bin/env node

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST TELEGRAM NOTIFICATION
// Quick test to verify Telegram notifications are working
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import './src/load-env.js';
import { notifyNewRecording } from './notification-client.js';

console.log('🧪 Testing Telegram Notification...\n');

// Check if Telegram credentials are set
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  console.error('❌ Error: Telegram credentials not found in .env file');
  console.error('\nPlease add to your .env file:');
  console.error('TELEGRAM_BOT_TOKEN=your_bot_token_here');
  console.error('TELEGRAM_CHAT_ID=your_chat_id_here');
  console.error('\nSee TELEGRAM-SETUP-GUIDE.md for instructions.\n');
  process.exit(1);
}

console.log('📱 Telegram Bot Token:', process.env.TELEGRAM_BOT_TOKEN.slice(0, 20) + '...');
console.log('👤 Telegram Chat ID:', process.env.TELEGRAM_CHAT_ID);
console.log('\n📤 Sending test notification...\n');

// Send test notification
await notifyNewRecording('test-meeting-123', 'test-recording-456');

console.log('\n✅ Test complete!');
console.log('📱 Check your Telegram app for the notification.\n');



