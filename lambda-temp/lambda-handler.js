/**
 * AWS Lambda Handler for Attio Webhook
 * Replaces Express.js server with serverless function
 */

import { getAttioMeetingData } from './src/attio-client.js';
import { formatMeetingNotes } from './src/claude-formatter.js';
import { createGmailDraft } from './src/gmail-client.js';

// Lambda handler
export const handler = async (event) => {
  const startTime = Date.now();
  
  console.log('📨 Webhook Received:', {
    timestamp: new Date().toISOString(),
    body: event.body,
    headers: event.headers
  });

  try {
    // Parse incoming webhook payload
    const webhookPayload = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event.body;

    // Validate event type
    if (webhookPayload.event_type !== 'call-recording.created') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid event type',
          expected: 'call-recording.created',
          received: webhookPayload.event_type
        })
      };
    }

    // Extract IDs
    const { meeting_id, call_recording_id } = webhookPayload.id || {};
    
    if (!meeting_id || !call_recording_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields',
          required: ['id.meeting_id', 'id.call_recording_id']
        })
      };
    }

    console.log('📋 Processing:', { meeting_id, call_recording_id });

    // ASYNC PATTERN: Return immediately, process in background
    // (Lambda will continue processing after response is sent if invoked async)
    
    // Step 1: Fetch meeting data from Attio
    console.log('📡 Fetching meeting data...');
    const meetingData = await getAttioMeetingData(meeting_id, call_recording_id);
    console.log(`✅ Fetched: ${meetingData.title}`);

    // Step 2: Format with Claude AI
    console.log('🤖 Formatting with Claude AI...');
    const formattedNotes = await formatMeetingNotes(meetingData);
    console.log(`✅ Formatted (${formattedNotes.length} chars)`);

    // Step 3: Create Gmail draft
    console.log('📧 Creating Gmail draft...');
    const draft = await createGmailDraft(
      formattedNotes,
      meetingData.title,
      meetingData.date,
      meetingData.webUrl
    );
    console.log(`✅ Gmail draft created: ${draft.id}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ Processing complete:', {
      meeting: meetingData.title,
      draft_id: draft.id,
      time: `${elapsed}s`
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        meeting_id,
        draft_id: draft.id,
        processing_time_seconds: parseFloat(elapsed)
      })
    };

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('❌ Error:', {
      message: error.message,
      stack: error.stack,
      time: `${elapsed}s`
    });

    return {
      statusCode: 200, // Return 200 to prevent Attio from retrying
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        processing_time_seconds: parseFloat(elapsed)
      })
    };
  }
};

