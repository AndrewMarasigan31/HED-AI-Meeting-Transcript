/**
 * AWS Lambda Worker - Background Processing
 * Handles the actual processing (Attio → Claude → Gmail)
 */

import { getAttioMeetingData } from './src/attio-client.js';
import { formatMeetingNotes } from './src/claude-formatter.js';
import { createGmailDraft } from './src/gmail-client-lambda.js';

export const handler = async (event) => {
  const startTime = Date.now();
  
  console.log('🔧 Worker started:', {
    timestamp: new Date().toISOString(),
    event: event
  });

  try {
    // Extract meeting IDs from event
    const { meeting_id, call_recording_id } = event;
    
    if (!meeting_id || !call_recording_id) {
      throw new Error('Missing required fields: meeting_id and call_recording_id');
    }

    console.log('📋 Processing:', { meeting_id, call_recording_id });

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
    
    console.log('✅ Worker complete:', {
      meeting: meetingData.title,
      draft_id: draft.id,
      time: `${elapsed}s`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        meeting_id,
        draft_id: draft.id,
        processing_time_seconds: parseFloat(elapsed)
      })
    };

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('❌ Worker error:', {
      message: error.message,
      stack: error.stack,
      time: `${elapsed}s`
    });

    // Don't throw - Lambda will mark as success but log the error
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        processing_time_seconds: parseFloat(elapsed)
      })
    };
  }
};


