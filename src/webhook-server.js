#!/usr/bin/env node

import './load-env.js'; // Load environment variables
import express from 'express';
import { getAttioMeetingData } from './attio-client.js';
import { formatMeetingNotes } from './claude-formatter.js';
import { createGmailDraft } from './gmail-client.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Optional: for signature verification

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPRESS APP SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const app = express();
app.use(express.json());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'Attio Meeting Notes Automation',
    timestamp: new Date().toISOString()
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT PATH (for AWS Load Balancer health checks)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'Attio Meeting Notes Automation',
    version: '1.0.0',
    available_endpoints: [
      'GET /health',
      'POST /webhooks/attio/call-recording-created'
    ]
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK ENDPOINT: call-recording.created
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.post('/webhooks/attio/call-recording-created', async (req, res) => {
  const startTime = Date.now();
  const webhookPayload = req.body;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 Webhook Received: call-recording.created');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Validate Webhook Payload
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { event_type, id, actor } = webhookPayload;
    
    if (event_type !== 'call-recording.created') {
      console.log(`⚠️  Unexpected event type: ${event_type}`);
      return res.status(400).json({ 
        error: 'Invalid event type',
        expected: 'call-recording.created',
        received: event_type
      });
    }
    
    if (!id || !id.meeting_id || !id.call_recording_id) {
      console.log('❌ Missing required IDs in webhook payload');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['id.meeting_id', 'id.call_recording_id']
      });
    }
    
    const { meeting_id, call_recording_id, workspace_id } = id;
    
    console.log(`   Meeting ID: ${meeting_id}`);
    console.log(`   Recording ID: ${call_recording_id}`);
    console.log(`   Workspace ID: ${workspace_id}`);
    if (actor) {
      console.log(`   Actor: ${actor.type} (${actor.id})`);
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Fetch Meeting Data from Attio
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log('\n📡 Step 1/3: Fetching meeting data from Attio...');
    const meetingData = await getAttioMeetingData(meeting_id, call_recording_id);
    
    console.log(`✅ Meeting retrieved: "${meetingData.title}"`);
    console.log(`   Date: ${meetingData.date}`);
    console.log(`   Participants: ${meetingData.participants}`);
    console.log(`   Transcript: ${meetingData.stats.segments} segments, ${meetingData.stats.characters} characters`);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Format with Claude AI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log('\n🤖 Step 2/3: Formatting with Claude AI...');
    const formattedNotes = await formatMeetingNotes(meetingData);
    
    console.log(`✅ Formatted notes ready (${formattedNotes.length} characters)`);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Create Gmail Draft
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log('\n📧 Step 3/3: Creating Gmail draft...');
    const draft = await createGmailDraft(
      formattedNotes,
      meetingData.title,
      meetingData.date,
      meetingData.webUrl
    );
    
    console.log(`✅ Gmail draft created successfully!`);
    console.log(`   Draft ID: ${draft.id}`);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUCCESS: Return 200 to Attio
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Webhook Processing Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total time: ${elapsedTime}s`);
    console.log(`   Meeting: ${meetingData.title}`);
    console.log(`   Draft ID: ${draft.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(200).json({ 
      success: true,
      meeting_id,
      draft_id: draft.id,
      processing_time_seconds: parseFloat(elapsedTime)
    });
    
  } catch (error) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ERROR HANDLING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Webhook Processing Failed');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${error.message}`);
    console.error(`   Total time: ${elapsedTime}s`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    
    // Send error notification (non-blocking)
    // TODO: Implement error notifications if needed
    // const webhookPayload = req.body;
    // sendNotification('error', {
    //   meetingId: webhookPayload?.id?.meeting_id || 'Unknown',
    //   recordingId: webhookPayload?.id?.call_recording_id || 'Unknown',
    //   error: error.message
    // }).catch(err => console.error('Notification failed:', err.message));
    
    // Still return 200 to prevent Attio from retrying
    // (Log the error for manual review instead)
    return res.status(200).json({ 
      success: false,
      error: error.message,
      processing_time_seconds: parseFloat(elapsedTime)
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 404 HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    available_endpoints: [
      'GET  /health',
      'POST /webhooks/attio/call-recording-created'
    ]
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Attio Meeting Notes Webhook Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Status: Running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Webhook: http://localhost:${PORT}/webhooks/attio/call-recording-created`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Ready to receive webhooks from Attio!');
  console.log('📝 Waiting for call-recording.created events...\n');
});

