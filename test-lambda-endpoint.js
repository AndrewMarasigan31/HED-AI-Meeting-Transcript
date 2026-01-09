/**
 * Test Lambda Endpoint
 */

const testPayload = {
  event_type: 'call-recording.created',
  id: {
    meeting_id: 'test-meeting-123',
    call_recording_id: 'test-recording-456'
  }
};

const url = 'https://b27vdyj2r8.execute-api.ap-southeast-1.amazonaws.com/prod/webhook';

console.log('🧪 Testing Lambda endpoint...');
console.log('📍 URL:', url);
console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testPayload)
})
  .then(async (response) => {
    console.log('\n✅ Response received:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('Body:', text);
    
    if (response.ok) {
      console.log('\n✅ Lambda is responding correctly!');
    } else {
      console.log('\n❌ Lambda returned an error');
    }
  })
  .catch((error) => {
    console.error('\n❌ Failed to connect:', error.message);
  });


