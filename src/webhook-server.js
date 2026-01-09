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

// JSON parsing with error handling
app.use(express.json({
  limit: '10mb', // Allow larger payloads
  verify: (req, res, buf, encoding) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ JSON Parse Error');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Path: ${req.path}`);
    console.error(`   Method: ${req.method}`);
    console.error(`   Content-Type: ${req.get('Content-Type')}`);
    console.error(`   Error: ${err.message}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(400).json({ 
      success: false,
      error: 'Invalid JSON payload',
      message: 'Request body must be valid JSON',
      details: err.message
    });
  }
  next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REQUEST LOGGING MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.use((req, res, next) => {
  // Skip logging for health checks to reduce noise
  if (req.path === '/health' || req.path === '/') {
    return next();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 Incoming Request');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Content-Type: ${req.get('Content-Type') || 'not set'}`);
  console.log(`   Content-Length: ${req.get('Content-Length') || 'not set'}`);
  console.log(`   User-Agent: ${req.get('User-Agent') || 'not set'}`);
  
  // Log headers (excluding sensitive ones)
  const relevantHeaders = ['attio-signature', 'x-forwarded-for', 'x-real-ip'];
  relevantHeaders.forEach(header => {
    const value = req.get(header);
    if (value) {
      console.log(`   ${header}: ${value}`);
    }
  });
  
  // Log body preview if present
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body Preview: ${JSON.stringify(req.body).substring(0, 200)}...`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  next();
});

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
  console.log(`   Payload: ${JSON.stringify(webhookPayload, null, 2)}`);
  
  try {
    // Validate that body was parsed (note: typeof null === 'object' in JavaScript!)
    if (webhookPayload === null || webhookPayload === undefined || 
        typeof webhookPayload !== 'object' || Array.isArray(webhookPayload)) {
      console.log('❌ Webhook payload is empty, null, or not a valid object');
      return res.status(400).json({ 
        success: false,
        error: 'Invalid JSON payload',
        message: 'Request body must be valid JSON object',
        received_type: webhookPayload === null ? 'null' : typeof webhookPayload
      });
    }
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

