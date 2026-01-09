#!/usr/bin/env node

/**
 * Check the actual dates of the target meeting
 */

import './src/load-env.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const meetingId = 'd74eb63c-e345-48ff-be7d-395863beb47c';
const recordingId = 'e3d01635-808d-4701-a209-e4cbfd87da87';

async function checkDates() {
  console.log('\n📅 Checking Meeting Dates...\n');
  
  try {
    // Get meeting details
    const meetingResponse = await fetch(`https://api.attio.com/v2/meetings/${meetingId}`, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (meetingResponse.ok) {
      const meetingData = await meetingResponse.json();
      console.log('🎯 Meeting Details:');
      console.log(`   Title: ${meetingData.data.meeting_name || meetingData.data.title}`);
      console.log(`   Start: ${meetingData.data.meeting_start_time || meetingData.data.start_time || 'NOT SET'}`);
      console.log(`   End: ${meetingData.data.meeting_end_time || meetingData.data.end_time || 'NOT SET'}`);
      console.log('');
    }
    
    // Get recording details
    const recordingResponse = await fetch(
      `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${recordingId}`,
      {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (recordingResponse.ok) {
      const recordingData = await recordingResponse.json();
      console.log('🎥 Recording Details:');
      console.log(`   Created: ${recordingData.data.created_at}`);
      console.log(`   Status: ${recordingData.data.status || 'N/A'}`);
      console.log('');
    }
    
    console.log('💡 Analysis:');
    console.log('   If meeting start_time is NULL or before 2026-01-01,');
    console.log('   it won\'t appear in starts_from=2026-01-01 filter!');
    console.log('');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

checkDates();


