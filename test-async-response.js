#!/usr/bin/env node

/**
 * Test if async webhook responds quickly (< 5 seconds)
 */

const url = 'https://Attio-meeting-formatter-env-2-env.eba-eemwt72d.ap-southeast-1.elasticbeanstalk.com/webhooks/attio/call-recording-created';

const payload = {
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

async function testAsync() {
  console.log('\n🧪 Testing Async Webhook Response...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${elapsed}s`);
    console.log(`Body: ${JSON.stringify(data, null, 2)}\n`);
    
    if (response.status === 202) {
      console.log('✅ ASYNC VERSION IS LIVE!');
      console.log('   Responded with 202 Accepted in < 5s');
      console.log('   Attio test should pass!\n');
    } else if (response.status === 200 && elapsed < 5) {
      console.log('✅ Fast response, but still using 200 status');
      console.log('   Might work, but 202 is better\n');
    } else {
      console.log('❌ OLD VERSION STILL RUNNING');
      console.log(`   Status ${response.status} took ${elapsed}s`);
      console.log('   Deployment may have failed\n');
    }
    
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error.message.includes('timeout')) {
      console.log(`❌ TIMEOUT after ${elapsed}s`);
      console.log('   Old synchronous version still running');
      console.log('   Deployment did NOT update the code\n');
    } else {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
}

testAsync();

