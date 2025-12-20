import { readFileSync } from 'fs';
import { createGmailDraft } from './src/gmail-client.js';
import './src/load-env.js';

console.log('🧪 Testing Gmail Email Format');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Read the Claude-formatted output
const claudeOutput = readFileSync('./attio-output-formatted.txt', 'utf-8');

console.log('📄 Read Claude output:', claudeOutput.length, 'characters\n');

// Test data
const meetingTitle = '[MCA] Check In';
const meetingDate = '2024-12-10T14:00:00Z'; // ISO format date
const meetingUrl = 'https://app.attio.com/workspace/14beef7a-99f7-4534-a87e-70b564330a4c/meetings/0752aa62-0188-42e2-a2f7-837c675ab2a0';

console.log('📧 Creating Gmail draft...\n');

try {
  const draft = await createGmailDraft(
    claudeOutput,
    meetingTitle,
    meetingDate,
    meetingUrl
  );
  
  console.log('\n✅ SUCCESS!');
  console.log('Draft ID:', draft.id);
  console.log('\n📬 Check your Gmail drafts!');
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
}






