#!/usr/bin/env node

/**
 * Test JSON Payload Handling
 * Tests various JSON payloads to identify parsing issues
 */

import './src/load-env.js';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://Attio-meeting-formatter-env-1.eba-zgrpwenp.ap-southeast-1.elasticbeanstalk.com/webhooks/attio/call-recording-created';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 JSON Payload Testing');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Target: ${WEBHOOK_URL}\n`);

const testCases = [
  {
    name: 'Valid Attio Webhook',
    payload: {
      event_type: 'call-recording.created',
      id: {
        workspace_id: 'test-workspace',
        meeting_id: '465a7c11-cc85-455e-b586-433dd8bb87e1',
        call_recording_id: 'eec7b78d-1004-48a4-89f1-de8d0280a17e'
      },
      actor: {
        type: 'workspace-member',
        id: 'test-actor'
      }
    },
    contentType: 'application/json',
    shouldSucceed: true
  },
  {
    name: 'Empty Object',
    payload: {},
    contentType: 'application/json',
    shouldSucceed: false
  },
  {
    name: 'Null Payload',
    payload: null,
    contentType: 'application/json',
    shouldSucceed: false
  },
  {
    name: 'String instead of JSON',
    payload: 'not a json object',
    contentType: 'application/json',
    shouldSucceed: false
  },
  {
    name: 'Missing Content-Type',
    payload: {
      event_type: 'call-recording.created',
      id: {
        workspace_id: 'test-workspace',
        meeting_id: '465a7c11-cc85-455e-b586-433dd8bb87e1',
        call_recording_id: 'eec7b78d-1004-48a4-89f1-de8d0280a17e'
      }
    },
    contentType: null,
    shouldSucceed: false
  }
];

async function runTest(test) {
  console.log(`\n📋 Test: ${test.name}`);
  console.log('━'.repeat(50));
  
  try {
    const headers = {};
    if (test.contentType) {
      headers['Content-Type'] = test.contentType;
    }
    
    let body;
    if (typeof test.payload === 'string') {
      body = test.payload;
    } else {
      body = JSON.stringify(test.payload);
    }
    
    console.log(`   Payload: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
    console.log(`   Content-Type: ${test.contentType || 'not set'}`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: headers,
      body: body,
      signal: AbortSignal.timeout(10000)
    });
    
    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(responseJson, null, 2).substring(0, 200)}`);
    
    const testPassed = test.shouldSucceed ? response.ok : !response.ok;
    if (testPassed) {
      console.log(`   ✅ PASS (expected ${test.shouldSucceed ? 'success' : 'failure'})`);
      return true;
    } else {
      console.log(`   ❌ FAIL (expected ${test.shouldSucceed ? 'success' : 'failure'}, got ${response.ok ? 'success' : 'failure'})`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Total: ${testCases.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the error messages above.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! JSON payload handling is working correctly.\n');
  }
}

runAllTests();


