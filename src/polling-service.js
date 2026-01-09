#!/usr/bin/env node

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POLLING SERVICE - Proactive Recording Checker
// Runs every hour to catch any recordings missed by webhooks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getGmailClient } from './gmail-auth.js';
import { getAttioMeetingData } from './attio-client.js';
import { formatMeetingNotes } from './claude-formatter.js';
import { createGmailDraft } from './gmail-client.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Track processed recordings to avoid duplicates within same session
const processedRecordings = new Set();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET PROCESSED MEETINGS FROM GMAIL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getProcessedMeetings() {
  try {
    const gmail = await getGmailClient();
    
    // Get all drafts with "Meeting Notes" from 2026
    const draftsResponse = await gmail.users.drafts.list({
      userId: 'me',
      q: 'in:drafts subject:"Meeting Notes" after:2026/01/01',
      maxResults: 500
    });
    
    const drafts = draftsResponse.data.drafts || [];
    const processedMeetings = new Set();
    
    console.log(`   📧 Found ${drafts.length} Gmail drafts to check`);
    
    // Extract meeting titles from drafts
    for (const draft of drafts) {
      try {
        const fullDraft = await gmail.users.drafts.get({
          userId: 'me',
          id: draft.id,
          format: 'full'
        });
        
        const subject = fullDraft.data.message.payload.headers
          .find(h => h.name === 'Subject')?.value || '';
        
        // Extract meeting title from subject: "Meeting Notes: TITLE - DATE"
        const titleMatch = subject.match(/Meeting Notes:\s*(.+?)\s*-\s*\d+/);
        if (titleMatch) {
          processedMeetings.add(titleMatch[1].toLowerCase().trim());
        }
      } catch (error) {
        // Skip drafts that error
        continue;
      }
    }
    
    return processedMeetings;
  } catch (error) {
    console.error(`   ⚠️  Error checking Gmail: ${error.message}`);
    return new Set();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET MEETINGS WITH RECORDINGS FROM ATTIO (2026)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getMeetingsWithRecordings() {
  try {
    const meetings = [];
    let cursor = null;
    const maxPages = 30; // Check first 30 pages (~1500 meetings)
    let pageCount = 0;
    
    const start2026 = new Date('2026-01-01T00:00:00Z').getTime();
    const now = Date.now();
    
    do {
      const url = cursor 
        ? `https://api.attio.com/v2/meetings?limit=50&cursor=${encodeURIComponent(cursor)}`
        : `https://api.attio.com/v2/meetings?limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        break;
      }

      const data = await response.json();
      const pageMeetings = data.data || [];
      
      // Check each meeting for recordings
      for (const meeting of pageMeetings) {
        try {
          const meetingId = typeof meeting.id === 'string' 
            ? meeting.id 
            : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
          
          // Get recordings for this meeting
          const recordingsUrl = `https://api.attio.com/v2/meetings/${meetingId}/call_recordings`;
          const recordingsResponse = await fetch(recordingsUrl, {
            headers: {
              'Authorization': `Bearer ${ATTIO_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (recordingsResponse.ok) {
            const recordingsData = await recordingsResponse.json();
            const recordings = recordingsData.data || [];
            
            // Check if any recording is from 2026
            for (const recording of recordings) {
              if (recording.created_at) {
                const recordingTime = new Date(recording.created_at).getTime();
                
                if (recordingTime >= start2026 && recordingTime <= now) {
                  const recordingId = typeof recording.id === 'string' 
                    ? recording.id 
                    : (recording.id?.call_recording_id || JSON.stringify(recording.id));
                  
                  meetings.push({
                    meeting_id: meetingId,
                    recording_id: recordingId,
                    title: meeting.title || 'Untitled Meeting',
                    created_at: recording.created_at
                  });
                }
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      cursor = data.pagination?.next_cursor || null;
      pageCount++;
      
      if (pageCount >= maxPages) {
        break;
      }
      
    } while (cursor);
    
    return meetings;
  } catch (error) {
    console.error(`   ⚠️  Error fetching Attio meetings: ${error.message}`);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS A SINGLE RECORDING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function processRecording(meeting) {
  const { meeting_id, recording_id, title } = meeting;
  
  try {
    console.log(`\n   📋 Processing: "${title}"`);
    console.log(`      Meeting ID: ${meeting_id}`);
    console.log(`      Recording ID: ${recording_id}`);
    
    // Step 1: Fetch meeting data from Attio
    const meetingData = await getAttioMeetingData(meeting_id, recording_id);
    console.log(`      ✅ Fetched transcript (${meetingData.stats.characters} chars)`);
    
    // Step 2: Format with Claude AI
    const formattedNotes = await formatMeetingNotes(meetingData);
    console.log(`      ✅ Formatted notes (${formattedNotes.length} chars)`);
    
    // Step 3: Create Gmail draft
    const draft = await createGmailDraft(
      formattedNotes,
      meetingData.title,
      meetingData.date,
      meetingData.webUrl
    );
    console.log(`      ✅ Gmail draft created: ${draft.id}`);
    
    // Mark as processed
    processedRecordings.add(recording_id);
    
    return { success: true, draft_id: draft.id };
    
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN POLLING FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function pollForNewRecordings() {
  const startTime = Date.now();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Polling for Unprocessed Recordings');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Target: 2026 recordings\n`);
  
  try {
    // Step 1: Get processed meetings from Gmail
    console.log('📧 Step 1/3: Checking Gmail drafts...');
    const processedMeetings = await getProcessedMeetings();
    console.log(`   ✅ Found ${processedMeetings.size} processed meetings\n`);
    
    // Step 2: Get meetings with recordings from Attio
    console.log('📡 Step 2/3: Checking Attio for 2026 recordings...');
    const meetingsWithRecordings = await getMeetingsWithRecordings();
    console.log(`   ✅ Found ${meetingsWithRecordings.length} meetings with recordings\n`);
    
    // Step 3: Find unprocessed recordings
    console.log('🔍 Step 3/3: Finding unprocessed recordings...');
    const unprocessed = meetingsWithRecordings.filter(meeting => {
      const titleLower = meeting.title.toLowerCase().trim();
      const alreadyProcessed = processedMeetings.has(titleLower) || 
                              processedRecordings.has(meeting.recording_id);
      return !alreadyProcessed;
    });
    
    console.log(`   📊 Found ${unprocessed.length} unprocessed recording(s)\n`);
    
    if (unprocessed.length === 0) {
      console.log('   ✅ All recordings are up to date!');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📝 Processing ${unprocessed.length} Recording(s)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const meeting of unprocessed) {
        const result = await processRecording(meeting);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Small delay between processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Processing Summary');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);
      console.log(`   📁 Total: ${unprocessed.length}`);
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ⏱️  Time: ${elapsed}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Polling Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START POLLING SCHEDULER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function startPollingService() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Polling Service Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Interval: Every 1 hour`);
  console.log(`   Target: 2026 recordings`);
  console.log(`   Next poll: ${new Date(Date.now() + POLL_INTERVAL_MS).toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Run immediately on start
  pollForNewRecordings().catch(err => {
    console.error('Initial poll error:', err.message);
  });
  
  // Then run every hour
  const intervalId = setInterval(() => {
    pollForNewRecordings().catch(err => {
      console.error('Scheduled poll error:', err.message);
    });
  }, POLL_INTERVAL_MS);
  
  // Return the interval ID so it can be cleared if needed
  return intervalId;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANUAL TRIGGER (for testing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  // Running directly (node src/polling-service.js)
  pollForNewRecordings();
}

