#!/usr/bin/env node

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECK FOR MISSING RECORDINGS
// Finds call recordings in Attio that haven't been processed into Gmail drafts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import './src/load-env.js';
import { getGmailClient } from './src/gmail-auth.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;

if (!ATTIO_API_KEY) {
  console.error('❌ ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

// Allow date to be specified via command line argument (YYYY-MM-DD format)
// Defaults to yesterday if no argument provided
let targetDate;
if (process.argv[2]) {
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(process.argv[2])) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD (e.g., 2026-01-06)');
    process.exit(1);
  }
  targetDate = process.argv[2];
} else {
  // Default to yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  targetDate = yesterday.toISOString().split('T')[0];
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Checking for Unprocessed Recordings');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Checking recordings created on: ${targetDate}`);
console.log(`   (This will find recordings that didn't trigger webhooks)`);
console.log(`   Usage: node check-missing-recordings.js [YYYY-MM-DD] (defaults to yesterday)\n`);

try {
  // Step 1: Get all Gmail drafts with "Meeting Notes" to see what's been processed
  console.log('📧 Checking Gmail drafts...');
  const gmail = await getGmailClient();
  
  const startOfDay = new Date(targetDate + 'T00:00:00Z');
  const endOfDay = new Date(targetDate + 'T23:59:59Z');
  
  const draftsResponse = await gmail.users.drafts.list({
    userId: 'me',
    q: 'in:drafts subject:"Meeting Notes"',
    maxResults: 200
  });
  
  const allDrafts = draftsResponse.data.drafts || [];
  const processedMeetings = new Set();
  
  // Get draft details and extract meeting titles
  for (const draft of allDrafts) {
    try {
      const fullDraft = await gmail.users.drafts.get({
        userId: 'me',
        id: draft.id,
        format: 'full'
      });
      
      const created = new Date(parseInt(fullDraft.data.message.internalDate));
      
        // Only check drafts from the target date
      if (created >= startOfDay && created <= endOfDay) {
        const subject = fullDraft.data.message.payload.headers
          .find(h => h.name === 'Subject')?.value || '';
        const titleMatch = subject.match(/Meeting Notes:\s*(.+?)\s*-\s*\d+/);
        if (titleMatch) {
          processedMeetings.add(titleMatch[1].toLowerCase().trim());
        }
      }
    } catch (error) {
      // Skip drafts that error
      continue;
    }
  }
  
  console.log(`   ✅ Found ${processedMeetings.size} processed meeting${processedMeetings.size === 1 ? '' : 's'} in Gmail drafts\n`);
  
  // Step 2: Get first N pages of meetings (newest first)
  // We don't filter by meeting date - instead we filter by recording creation date
  // This is more reliable since recordings can be created for any meeting
  const MAX_PAGES_TO_CHECK = 20; // Check first 20 pages = ~1000 meetings
  const pageLimit = 50; // Fetch 50 at a time
  
  console.log(`📡 Fetching meetings from Attio (checking first ${MAX_PAGES_TO_CHECK} pages)...`);
  console.log(`   Will filter by recording creation date (${targetDate})\n`);
  
  let allMeetings = [];
  let cursor = null;
  let pageCount = 0;
  
  do {
    const url = cursor 
      ? `https://api.attio.com/v2/meetings?limit=${pageLimit}&cursor=${encodeURIComponent(cursor)}`
      : `https://api.attio.com/v2/meetings?limit=${pageLimit}`;
    
    const meetingsResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!meetingsResponse.ok) {
      const errorText = await meetingsResponse.text();
      throw new Error(`Attio API Error (${meetingsResponse.status}): ${errorText}`);
    }

    const meetingsData = await meetingsResponse.json();
    const pageMeetings = meetingsData.data || [];
    
    allMeetings = allMeetings.concat(pageMeetings);
    pageCount++;
    
    cursor = meetingsData.pagination?.next_cursor || null;
    
    console.log(`   📄 Page ${pageCount}: ${pageMeetings.length} meetings (Total: ${allMeetings.length})`);
    
    // Stop after checking enough pages
    if (pageCount >= MAX_PAGES_TO_CHECK) {
      console.log(`   ⏹️  Reached page limit (${MAX_PAGES_TO_CHECK} pages)`);
      break;
    }
    
  } while (cursor);
  
  const meetings = allMeetings;

  if (meetings.length === 0) {
    console.log('   ❌ No meetings found.\n');
    process.exit(0);
  }

  console.log(`   ✅ Found ${meetings.length} meeting${meetings.length === 1 ? '' : 's'} to check\n`);
  console.log(`🔍 Checking which meetings have recordings created on ${targetDate}...\n`);

  const meetingsWithRecordings = [];
  const unprocessedRecordings = [];
  
  // Track the latest recording found (regardless of date)
  let latestRecording = null;
  let latestRecordingDate = null;

  // Step 3: Check each meeting for recordings created today
  let checkedCount = 0;
  for (const meeting of meetings) {
    checkedCount++;
    if (checkedCount % 10 === 0) {
      console.log(`   ⏳ Progress: ${checkedCount}/${meetings.length} meetings checked...`);
    }
    try {
      const meetingId = typeof meeting.id === 'string' 
        ? meeting.id 
        : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
      
      // Get full meeting details
      const meetingDetailUrl = `https://api.attio.com/v2/meetings/${meetingId}`;
      const meetingDetailResponse = await fetch(meetingDetailUrl, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!meetingDetailResponse.ok) {
        continue;
      }

      const meetingDetail = await meetingDetailResponse.json();
      const meetingTitle = meetingDetail.data?.title || meeting.title || 'Untitled Meeting';
      
      // Check if meeting has call recordings using the proper endpoint
      const recordingsUrl = `https://api.attio.com/v2/meetings/${meetingId}/call_recordings`;
      const recordingsResponse = await fetch(recordingsUrl, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!recordingsResponse.ok) {
        continue; // Skip if can't fetch recordings
      }
      
      const recordingsData = await recordingsResponse.json();
      const recordings = recordingsData.data || [];
      
      if (recordings.length === 0) {
        continue; // No recordings, skip
      }
      
      // Check if any recording was created on the target date
      let hasRecordingToday = false;
      let recordingCreatedToday = null;
      
      for (const recording of recordings) {
        // Check created_at field (confirmed from API docs)
        const recordingCreatedAt = recording.created_at;
        
        if (recordingCreatedAt) {
          const recordingDate = new Date(recordingCreatedAt).toISOString().split('T')[0];
          const recordingDateTime = new Date(recordingCreatedAt);
          
          // Track the latest recording found (regardless of target date)
          if (!latestRecordingDate || recordingDateTime > latestRecordingDate) {
            latestRecordingDate = recordingDateTime;
            const callRecordingId = typeof recording.id === 'string' 
              ? recording.id 
              : (recording.id?.call_recording_id || JSON.stringify(recording.id));
            latestRecording = {
              meeting_id: meetingId,
              meeting_title: meetingTitle,
              call_recording_id: callRecordingId,
              created_at: recordingCreatedAt,
              web_url: recording.web_url
            };
          }
          
          // Debug: Log first few recordings to see date format
          if (checkedCount <= 3 && recordings.length > 0) {
            console.log(`   🔍 Debug: Meeting "${meetingTitle.substring(0, 40)}..." has ${recordings.length} recording(s)`);
            console.log(`      Recording created_at: ${recordingCreatedAt} -> parsed date: ${recordingDate} (looking for: ${targetDate})`);
          }
          
          if (recordingDate === targetDate) {
            hasRecordingToday = true;
            recordingCreatedToday = recording;
            break; // Found a recording from the target date
          }
        }
      }
      
      if (hasRecordingToday) {
        const callRecordingId = typeof recordingCreatedToday.id === 'string' 
          ? recordingCreatedToday.id 
          : (recordingCreatedToday.id?.call_recording_id || JSON.stringify(recordingCreatedToday.id));
        
        meetingsWithRecordings.push({
          id: meetingId,
          title: meetingTitle,
          call_recording_id: callRecordingId,
          recording_created_at: recordingCreatedToday.created_at || recordingCreatedToday.data?.created_at
        });
        
        // Check if this meeting has been processed
        const titleLower = meetingTitle.toLowerCase().trim();
        const isProcessed = processedMeetings.has(titleLower) || 
                          Array.from(processedMeetings).some(processed => 
                            titleLower.includes(processed) || processed.includes(titleLower)
                          );
        
        if (!isProcessed) {
          unprocessedRecordings.push({
            id: meetingId,
            title: meetingTitle,
            call_recording_id: callRecordingId,
            recording_created_at: recordingCreatedToday.created_at || recordingCreatedToday.data?.created_at
          });
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking meeting: ${error.message}`);
      continue;
    }
  }

  // Step 4: Display results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📊 Summary:`);
  console.log(`   Total meetings checked: ${meetings.length}`);
  console.log(`   Recordings created on ${targetDate}: ${meetingsWithRecordings.length}`);
  console.log(`   Processed (Gmail drafts): ${meetingsWithRecordings.length - unprocessedRecordings.length}`);
  console.log(`   ⚠️  Unprocessed recordings: ${unprocessedRecordings.length}\n`);
  
  // Display latest recording found
  if (latestRecording) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 Latest Recording Found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Meeting: ${latestRecording.meeting_title}`);
    console.log(`   Meeting ID: ${latestRecording.meeting_id}`);
    console.log(`   Recording ID: ${latestRecording.call_recording_id}`);
    console.log(`   Created: ${new Date(latestRecording.created_at).toLocaleString()}`);
    if (latestRecording.web_url) {
      console.log(`   URL: ${latestRecording.web_url}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.log('   ℹ️  No recordings found in checked meetings\n');
  }

  if (unprocessedRecordings.length === 0) {
    console.log(`   ✅ All recordings created on ${targetDate} have been processed!\n`);
  } else {
    console.log(`   ⚠️  The following recordings created on ${targetDate} have NOT been processed:\n`);
    
    unprocessedRecordings.forEach((recording, index) => {
      console.log(`   ${index + 1}. ${recording.title}`);
      console.log(`      Meeting ID: ${recording.id}`);
      console.log(`      Call Recording ID: ${recording.call_recording_id}`);
      if (recording.recording_created_at) {
        console.log(`      Recording Created: ${new Date(recording.recording_created_at).toLocaleString()}`);
      }
      console.log('');
    });
    
    console.log('   💡 Possible reasons:');
    console.log('      - Webhook server not running');
    console.log('      - Webhook not registered in Attio');
    console.log('      - Recording created but webhook not sent');
    console.log('      - Error during processing');
    console.log('      - Webhook failed silently\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

