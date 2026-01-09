#!/usr/bin/env node

/**
 * Quick test to check if AWS deployment worked
 */

import './src/load-env.js';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://Attio-meeting-formatter-env-2-env.eba-eemwt72d.ap-southeast-1.elasticbeanstalk.com';

async function testAWS() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing AWS Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Health check
    console.log('📡 Test 1: Health Check...');
    const baseUrl = WEBHOOK_URL.replace('/webhooks/attio/call-recording-created', '');
    const healthUrl = `${baseUrl}/health`;
    
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log(`   ✅ Server is running`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    } else {
      console.log(`   ❌ Health check failed: ${healthResponse.status}\n`);
      return;
    }
    
    // Test 2: Quick webhook test with minimal payload
    console.log('📡 Test 2: Testing webhook endpoint...');
    const webhookUrl = `${baseUrl}/webhooks/attio/call-recording-created`;
    
    const testPayload = {
      event_type: 'call-recording.created',
      id: {
        workspace_id: 'test',
        meeting_id: 'd74eb63c-e345-48ff-be7d-395863beb47c',
        call_recording_id: 'e3d01635-808d-4701-a209-e4cbfd87da87'
      },
      actor: {
        type: 'workspace-member',
        id: 'test'
      }
    };
    
    console.log('   Sending test webhook (this may take 30-60 seconds)...');
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(90000) // 90 second timeout
    });
    
    const responseText = await webhookResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    console.log(`   Status: ${webhookResponse.status}`);
    console.log(`   Response: ${JSON.stringify(responseData, null, 2)}\n`);
    
    if (webhookResponse.ok && responseData.success) {
      console.log('✅ DEPLOYMENT SUCCESSFUL!');
      console.log('   Server has Gmail credentials and can create drafts\n');
    } else if (responseText.includes('credentials.json')) {
      console.log('❌ DEPLOYMENT FAILED');
      console.log('   Server still missing Gmail credentials\n');
    } else if (webhookResponse.status === 504) {
      console.log('⚠️  Server timed out - likely still missing credentials\n');
    } else {
      console.log('⚠️  Unexpected response - check logs above\n');
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.message.includes('timeout')) {
      console.log('   The server is taking too long (likely missing credentials)\n');
    }
  }
}

testAWS();

