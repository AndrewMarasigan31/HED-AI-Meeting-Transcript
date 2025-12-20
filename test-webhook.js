// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST WEBHOOK TRIGGER
// Sends a test webhook payload to your local server
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MEETING_ID = '0752aa62-0188-42e2-a2f7-837c675ab2a0';
const CALL_RECORDING_ID = '9add3c00-08ff-4eb1-ae24-8cea07049926';

async function testWebhook() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Webhook Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const webhookPayload = {
    event_type: 'call-recording.created',
    id: {
      workspace_id: '14beef7a-99f7-4534-a87e-70b564330a4c',
      meeting_id: MEETING_ID,
      call_recording_id: CALL_RECORDING_ID
    },
    actor: {
      type: 'workspace-member',
      id: '50cf242c-7fa3-4cad-87d0-75b1af71c57b'
    }
  };

  console.log('📤 Sending webhook payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log();

  try {
    const response = await fetch('http://localhost:3000/webhooks/attio/call-recording-created', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Webhook Response');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(result, null, 2));
    console.log();

    if (result.success) {
      console.log('✅ Webhook processed successfully!');
      console.log(`   Meeting ID: ${result.meeting_id}`);
      console.log(`   Draft ID: ${result.draft_id}`);
      console.log(`   Processing time: ${result.processing_time_seconds}s`);
      console.log('\n📧 Check your Gmail drafts folder!');
    } else {
      console.log('❌ Webhook processing failed');
      console.log(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Test Failed');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${error.message}`);
    console.error('\n💡 Make sure the webhook server is running!');
    console.error('   Run: npm start (in another terminal)\n');
  }
}

console.log('🎯 Make sure your webhook server is running!');
console.log('   If not, run: npm start\n');
console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n');

// Wait 3 seconds to give user time to cancel
setTimeout(() => {
  testWebhook();
}, 3000);






