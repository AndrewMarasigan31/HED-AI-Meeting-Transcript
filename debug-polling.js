#!/usr/bin/env node

/**
 * Debug script to see exactly what polling is doing
 */

import './src/load-env.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;

async function debugPolling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐛 Debug Polling Logic');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const targetMeetingId = 'd74eb63c-e345-48ff-be7d-395863beb47c';
  const start2026 = new Date('2026-01-01T00:00:00Z').getTime();
  
  try {
    console.log('📡 Step 1: Fetch first page of meetings...');
    const url = 'https://api.attio.com/v2/meetings?limit=50';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const meetings = data.data || [];
    
    console.log(`   ✅ Got ${meetings.length} meetings\n`);
    
    console.log('🔍 Step 2: Check first 5 meetings structure...\n');
    
    for (let i = 0; i < Math.min(5, meetings.length); i++) {
      const meeting = meetings[i];
      console.log(`   Meeting ${i + 1}:`);
      console.log(`      ID: ${JSON.stringify(meeting.id)}`);
      console.log(`      Title: ${meeting.title || 'N/A'}`);
      console.log(`      Type of ID: ${typeof meeting.id}`);
      
      // Try to extract meeting ID the way our code does
      const meetingId = typeof meeting.id === 'string' 
        ? meeting.id 
        : (meeting.id?.meeting_id || JSON.stringify(meeting.id));
      
      console.log(`      Extracted ID: ${meetingId}`);
      
      if (meetingId === targetMeetingId) {
        console.log(`      🎯 THIS IS OUR TARGET MEETING!\n`);
      } else {
        console.log('');
      }
    }
    
    console.log('🔍 Step 3: Check if target meeting is in first page...\n');
    
    const foundTarget = meetings.find(m => {
      const meetingId = typeof m.id === 'string' 
        ? m.id 
        : (m.id?.meeting_id || JSON.stringify(m.id));
      return meetingId === targetMeetingId;
    });
    
    if (foundTarget) {
      console.log(`   ✅ Target meeting FOUND in first page!`);
      console.log(`      Title: ${foundTarget.title}`);
      console.log(`      ID: ${JSON.stringify(foundTarget.id)}\n`);
      
      // Now try to get recordings for it
      console.log('📡 Step 4: Fetch recordings for target meeting...\n');
      
      const meetingId = typeof foundTarget.id === 'string' 
        ? foundTarget.id 
        : (foundTarget.id?.meeting_id || JSON.stringify(foundTarget.id));
      
      const recordingsUrl = `https://api.attio.com/v2/meetings/${meetingId}/call_recordings`;
      console.log(`   URL: ${recordingsUrl}`);
      
      const recordingsResponse = await fetch(recordingsUrl, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Response: ${recordingsResponse.status} ${recordingsResponse.statusText}`);
      
      if (recordingsResponse.ok) {
        const recordingsData = await recordingsResponse.json();
        const recordings = recordingsData.data || [];
        
        console.log(`   ✅ Found ${recordings.length} recording(s)\n`);
        
        for (const recording of recordings) {
          console.log(`   Recording:`);
          console.log(`      ID: ${JSON.stringify(recording.id)}`);
          console.log(`      Created: ${recording.created_at}`);
          
          if (recording.created_at) {
            const recordingTime = new Date(recording.created_at).getTime();
            const is2026 = recordingTime >= start2026;
            console.log(`      Is 2026?: ${is2026 ? '✅ YES' : '❌ NO'}`);
          }
          console.log('');
        }
      } else {
        const errorText = await recordingsResponse.text();
        console.log(`   ❌ Failed to get recordings`);
        console.log(`   Error: ${errorText}\n`);
      }
      
    } else {
      console.log(`   ❌ Target meeting NOT in first page`);
      console.log(`   Need to check more pages...\n`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Debug Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

debugPolling();

