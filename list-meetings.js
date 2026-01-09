#!/usr/bin/env node

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIST MEETINGS FROM ATTIO
// Shows all recent meetings and finds the latest one
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import './src/load-env.js';
import fs from 'fs';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;

if (!ATTIO_API_KEY) {
  console.error('❌ ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

const LIMIT = process.argv[2] ? parseInt(process.argv[2]) : null; // No limit by default - fetch all

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Listing Meetings from Attio');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Filter: December 2025 with transcripts only`);
if (LIMIT) {
  console.log(`   Limit: ${LIMIT} meetings`);
} else {
  console.log(`   Fetching: ALL meetings (no limit)`);
}
console.log('');

try {
  // Fetch ALL meetings from Attio using pagination
  console.log('📡 Fetching meetings from Attio (with pagination)...');
  
  let allMeetings = [];
  let cursor = null;
  let pageCount = 0;
  const pageLimit = 50; // Fetch 50 at a time
  
  do {
    const url = cursor 
      ? `https://api.attio.com/v2/meetings?limit=${pageLimit}&cursor=${encodeURIComponent(cursor)}`
      : `https://api.attio.com/v2/meetings?limit=${pageLimit}`;
    
    let meetingsResponse;
    try {
      meetingsResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (fetchError) {
      console.error(`\n❌ Network Error Details:`);
      console.error(`   URL: ${url}`);
      console.error(`   Error Type: ${fetchError.constructor.name}`);
      console.error(`   Error Message: ${fetchError.message}`);
      
      if (fetchError.cause) {
        console.error(`   Cause: ${fetchError.cause.message || fetchError.cause}`);
      }
      
      if (fetchError.code) {
        console.error(`   Error Code: ${fetchError.code}`);
      }
      
      throw new Error(`Failed to fetch from Attio API: ${fetchError.message}. Check your internet connection and API key.`);
    }

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
    
    // Stop if we've reached the requested limit (only if user specified one)
    if (LIMIT && allMeetings.length >= LIMIT) {
      allMeetings = allMeetings.slice(0, LIMIT);
      console.log(`   ⏹️  Stopped at ${LIMIT} meetings (user-specified limit)`);
      break;
    }
    
  } while (cursor);
  
  const meetings = allMeetings;

  if (meetings.length === 0) {
    console.log('   ❌ No meetings found.\n');
    process.exit(0);
  }

  console.log(`   ✅ Fetched ${meetings.length} total meeting${meetings.length === 1 ? '' : 's'}\n`);

  // Sort meetings by start datetime (newest first) - this is the actual meeting date
  const sortedMeetings = meetings.sort((a, b) => {
    // Use start.datetime as primary (actual meeting date), fallback to created_at
    const dateA = new Date(a.start?.datetime || a.created_at || 0);
    const dateB = new Date(b.start?.datetime || b.created_at || 0);
    return dateB - dateA;
  });

  // Filter for December 2025 meetings first
  const december2025Meetings = sortedMeetings.filter(meeting => {
    if (!meeting.start?.datetime) return false;
    const meetingDate = new Date(meeting.start.datetime);
    return meetingDate.getFullYear() === 2025 && meetingDate.getMonth() === 11; // Month 11 = December
  });

  // Now check which ones have transcripts available (not just recordings)
  console.log(`\n🔍 Checking which December 2025 meetings have transcripts available...`);
  const meetingsWithTranscripts = [];
  
  for (const meeting of december2025Meetings) {
    const meetingId = typeof meeting.id === 'string' 
      ? meeting.id 
      : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
    
    try {
      // Step 1: Check if meeting has call recordings
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
      
      // Step 2: Check if any recording has a transcript available
      let hasTranscript = false;
      let transcriptRecordingId = null;
      
      for (const recording of recordings) {
        const callRecordingId = typeof recording.id === 'string' 
          ? recording.id 
          : (recording.id?.call_recording_id || JSON.stringify(recording.id));
        
        try {
          // Try to fetch transcript (just first page to check if it exists)
          const transcriptUrl = `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}/transcript?limit=1`;
          const transcriptResponse = await fetch(transcriptUrl, {
            headers: {
              'Authorization': `Bearer ${ATTIO_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (transcriptResponse.ok) {
            const transcriptData = await transcriptResponse.json();
            // Check if transcript has content
            if (transcriptData.data?.transcript && transcriptData.data.transcript.length > 0) {
              hasTranscript = true;
              transcriptRecordingId = callRecordingId;
              break; // Found a transcript, no need to check others
            }
          }
        } catch (error) {
          // Skip this recording, try next one
          continue;
        }
      }
      
      if (hasTranscript) {
        // Add transcript info to meeting object
        meeting.has_transcript = true;
        meeting.transcript_recording_id = transcriptRecordingId;
        if (!meeting.record_url) {
          meeting.record_url = `Has transcript available`;
        }
        meetingsWithTranscripts.push(meeting);
        console.log(`   ✅ ${meeting.title || 'Untitled'}: Transcript available`);
      } else {
        console.log(`   ⏳ ${meeting.title || 'Untitled'}: Recording exists but transcript not ready`);
      }
    } catch (error) {
      // If we can't check, skip this meeting
      console.log(`   ⚠️  Could not check transcript for meeting ${meetingId}: ${error.message}`);
    }
  }
  
  const december2025MeetingsWithTranscripts = meetingsWithTranscripts;

  // Show latest December 2025 meeting with transcript if found
  if (december2025MeetingsWithTranscripts.length > 0) {
    const latestDecemberMeeting = december2025MeetingsWithTranscripts[0];
    const latestMeetingId = typeof latestDecemberMeeting.id === 'string' 
      ? latestDecemberMeeting.id 
      : (latestDecemberMeeting.id?.meeting_id || JSON.stringify(latestDecemberMeeting.id));
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆕 Latest December 2025 Meeting:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Title: ${latestDecemberMeeting.title || 'Untitled Meeting'}`);
    console.log(`   Meeting ID: ${latestMeetingId}`);
    console.log(`   Meeting Date: ${latestDecemberMeeting.start?.datetime ? new Date(latestDecemberMeeting.start.datetime).toLocaleString() : 'Unknown'}`);
    console.log(`   Has Recording: ${latestDecemberMeeting.record_url ? '✅ Yes' : '❌ No'}`);
    
    if (latestDecemberMeeting.record_url) {
      console.log(`   Recording URL: ${latestDecemberMeeting.record_url}`);
    }
    
    if (latestDecemberMeeting.participants && latestDecemberMeeting.participants.length > 0) {
      const participantEmails = latestDecemberMeeting.participants
        .map(p => p.email_address || 'Unknown')
        .join(', ');
      console.log(`   Participants: ${participantEmails}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  // Show December 2025 meetings with transcripts (primary focus)
  if (december2025MeetingsWithTranscripts.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 December 2025 Meetings with Transcripts (${december2025MeetingsWithTranscripts.length} found):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    december2025MeetingsWithTranscripts.forEach((meeting, index) => {
      const meetingId = typeof meeting.id === 'string' 
        ? meeting.id 
        : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
      const startDate = meeting.start?.datetime ? new Date(meeting.start.datetime).toLocaleString() : 'Unknown';
      const hasRecording = meeting.record_url ? '✅' : '❌';
      
      console.log(`${index + 1}. ${meeting.title || 'Untitled Meeting'}`);
      console.log(`   Meeting ID: ${meetingId}`);
      console.log(`   Date: ${startDate}`);
      console.log(`   Transcript: ✅ Available`);
      if (meeting.transcript_recording_id) {
        console.log(`   Recording ID: ${meeting.transcript_recording_id}`);
      }
      
      if (meeting.participants && meeting.participants.length > 0) {
        const participantEmails = meeting.participants
          .map(p => p.email_address || 'Unknown')
          .join(', ');
        console.log(`   Participants: ${participantEmails}`);
      }
      console.log('');
    });
  } else {
    console.log('⚠️  No meetings with transcripts found from December 2025.\n');
    console.log('   (This could mean transcripts are still processing, or meetings have no recordings)\n');
  }

  console.log(`\n📊 Total meetings fetched: ${meetings.length} across ${pageCount} page(s)`);
  
  // Show date range of meetings
  const dates = meetings
    .map(m => m.start?.datetime ? new Date(m.start.datetime) : null)
    .filter(d => d !== null)
    .sort((a, b) => a - b);
  
  if (dates.length > 0) {
    console.log(`   Date range: ${dates[0].toLocaleDateString()} to ${dates[dates.length - 1].toLocaleDateString()}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GENERATE MARKDOWN SUMMARY FILE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const mdContent = generateMarkdownSummary(december2025MeetingsWithTranscripts, meetings, pageCount, dates);
  const mdFileName = 'december-2025-meetings-summary.md';
  
  fs.writeFileSync(mdFileName, mdContent, 'utf8');
  console.log(`\n📝 Markdown summary saved to: ${mdFileName}\n`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARKDOWN GENERATION FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateMarkdownSummary(december2025Meetings, allMeetings, pageCount, dates) {
  const now = new Date().toISOString();
  const dateRange = dates.length > 0 
    ? `${dates[0].toLocaleDateString()} to ${dates[dates.length - 1].toLocaleDateString()}`
    : 'N/A';
  
  let md = `# December 2025 Meetings Summary (With Recordings)\n\n`;
  md += `**Generated:** ${new Date(now).toLocaleString()}\n\n`;
  md += `**Note:** This report only includes meetings from December 2025 that have recordings.\n\n`;
  md += `---\n\n`;
  
  // Summary Statistics
  md += `## Summary Statistics\n\n`;
  md += `- **December 2025 Meetings with Transcripts:** ${december2025Meetings.length}\n`;
  md += `- **Total Meetings Fetched:** ${allMeetings.length}\n`;
  md += `- **Pages Fetched:** ${pageCount}\n`;
  md += `- **Date Range (All Meetings):** ${dateRange}\n\n`;
  md += `---\n\n`;
  
  // Latest December 2025 Meeting
  if (december2025Meetings.length > 0) {
    const latest = december2025Meetings[0];
    const latestMeetingId = typeof latest.id === 'string' 
      ? latest.id 
      : (latest.id?.meeting_id || JSON.stringify(latest.id));
    const latestDate = latest.start?.datetime 
      ? new Date(latest.start.datetime).toLocaleString() 
      : 'Unknown';
    
    md += `## Latest December 2025 Meeting\n\n`;
    md += `- **Title:** ${latest.title || 'Untitled Meeting'}\n`;
    md += `- **Meeting ID:** \`${latestMeetingId}\`\n`;
    md += `- **Date:** ${latestDate}\n`;
      md += `- **Has Transcript:** ✅ Yes\n`;
      
      if (latest.transcript_recording_id) {
        md += `- **Recording ID (with transcript):** \`${latest.transcript_recording_id}\`\n`;
      }
    
    if (latest.participants && latest.participants.length > 0) {
      const participantEmails = latest.participants
        .map(p => p.email_address || 'Unknown')
        .join(', ');
      md += `- **Participants:** ${participantEmails}\n`;
    }
    
    md += `\n---\n\n`;
  }
  
  // All December 2025 Meetings
  if (december2025Meetings.length > 0) {
    md += `## All December 2025 Meetings\n\n`;
    
    december2025Meetings.forEach((meeting, index) => {
      const meetingId = typeof meeting.id === 'string' 
        ? meeting.id 
        : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
      const startDate = meeting.start?.datetime 
        ? new Date(meeting.start.datetime).toLocaleString() 
        : 'Unknown';
      const hasRecording = meeting.record_url ? '✅' : '❌';
      
      md += `### ${index + 1}. ${meeting.title || 'Untitled Meeting'}\n\n`;
      md += `- **Meeting ID:** \`${meetingId}\`\n`;
      md += `- **Date:** ${startDate}\n`;
      md += `- **Transcript:** ✅ Available\n`;
      if (meeting.transcript_recording_id) {
        md += `- **Recording ID (with transcript):** \`${meeting.transcript_recording_id}\`\n`;
      }
      
      if (meeting.participants && meeting.participants.length > 0) {
        const participantEmails = meeting.participants
          .map(p => p.email_address || 'Unknown')
          .join(', ');
        md += `- **Participants:** ${participantEmails}\n`;
      }
      
      md += `\n`;
    });
  } else {
    md += `## December 2025 Meetings\n\n`;
    md += `⚠️ **No meetings with transcripts found from December 2025.**\n\n`;
    md += `This could mean:\n`;
    md += `- Transcripts are still processing\n`;
    md += `- Meetings have no recordings\n`;
    md += `- Recordings exist but transcripts haven't been generated yet\n\n`;
  }
  
  md += `---\n\n`;
  md += `*This report was generated automatically by the list-meetings.js script.*\n`;
  
  return md;
}

