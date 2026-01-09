#!/usr/bin/env node

/**
 * Test script to manually trigger the webhook endpoint
 * Usage: node test-webhook.js [meeting_id] [recording_id]
 */

import './src/load-env.js';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://Attio-meeting-formatter-env-1.eba-zgrpwenp.ap-southeast-1.elasticbeanstalk.com/webhooks/attio/call-recording-created';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Get meeting and recording IDs from command line or use defaults
const meetingId = process.argv[2] || '4287541d-d0fe-4ce4-8547-a0b191a61ecc';
const recordingId = process.argv[3] || 'cd23ae5d-11b3-4653-87e6-6bf28a2f9e5b';

// Construct webhook payload (matching Attio's format)
const payload = {
  event_type: 'call-recording.created',
  id: {
    workspace_id: 'your-workspace-id', // This can be any value for testing
    meeting_id: meetingId,
    call_recording_id: recordingId
  },
  actor: {
    type: 'workspace-member',
    id: 'test-actor-id'
  }
};

async function testWebhook() {
  let webhookUrl = WEBHOOK_URL;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Webhook Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   URL: ${webhookUrl}`);
  console.log(`   Meeting ID: ${meetingId}`);
  console.log(`   Recording ID: ${recordingId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const bodyString = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json'
    };

    // If webhook secret is configured, calculate signature
    if (WEBHOOK_SECRET) {
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
      hmac.update(bodyString);
      const signature = hmac.digest('hex');
      headers['Attio-Signature'] = signature;
      console.log('   ✅ Webhook signature calculated');
    }

    // First, test if the server is reachable via health endpoint
    const baseUrl = webhookUrl.replace('/webhooks/attio/call-recording-created', '');
    const healthUrl = `${baseUrl}/health`;
    
    console.log('🔍 Checking server health...');
    let serverReachable = false;
    try {
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log(`   ✅ Server is reachable: ${JSON.stringify(healthData)}`);
        serverReachable = true;
      } else {
        console.log(`   ⚠️  Server responded with status: ${healthResponse.status}`);
      }
    } catch (healthError) {
      console.log(`   ⚠️  HTTPS health check failed: ${healthError.message}`);
      console.log(`   💡 Trying HTTP instead of HTTPS...`);
      
      // Try HTTP if HTTPS failed
      const httpBaseUrl = baseUrl.replace('https://', 'http://');
      const httpHealthUrl = `${httpBaseUrl}/health`;
      try {
        const httpHealthResponse = await fetch(httpHealthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
        if (httpHealthResponse.ok) {
          const healthData = await httpHealthResponse.json();
          console.log(`   ✅ Server is reachable via HTTP: ${JSON.stringify(healthData)}`);
          // Update webhook URL to use HTTP
          webhookUrl = webhookUrl.replace('https://', 'http://');
          console.log(`   🔄 Using HTTP URL: ${webhookUrl}`);
          serverReachable = true;
        }
      } catch (httpError) {
        console.log(`   ❌ HTTP also failed: ${httpError.message}`);
      }
    }
    
    if (!serverReachable) {
      console.log('\n⚠️  Warning: Could not reach server health endpoint');
      console.log('   Proceeding with webhook test anyway...\n');
    }
    
    console.log('📤 Sending POST request to webhook endpoint...\n');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: headers,
      body: bodyString,
      signal: AbortSignal.timeout(300000) // 5 minute timeout for webhook processing
    });

    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Body:`);
    console.log(JSON.stringify(responseJson, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:');
    console.error(`   ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Troubleshooting:');
      if (WEBHOOK_URL.includes('localhost')) {
        console.error('   The webhook server is not running on localhost:3000');
        console.error('   Start it with: npm start');
        console.error('   Or: node src/webhook-server.js');
      } else {
        console.error(`   Cannot connect to: ${WEBHOOK_URL}`);
        console.error('   Make sure the server is running and accessible');
      }
    }
    
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testWebhook();

