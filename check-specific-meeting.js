#!/usr/bin/env node

/**
 * Check if a specific meeting exists and has a recording
 */

import './src/load-env.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const meetingId = process.argv[2] || 'd74eb63c-e345-48ff-be7d-395863beb47c';
const recordingId = process.argv[3] || 'e3d01635-808d-4701-a209-e4cbfd87da87';

async function checkMeeting() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Checking Specific Meeting');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Meeting ID: ${meetingId}`);
  console.log(`   Recording ID: ${recordingId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Get meeting details
    console.log('📡 Step 1: Fetching meeting details...');
    const meetingResponse = await fetch(`https://api.attio.com/v2/meetings/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!meetingResponse.ok) {
      throw new Error(`Failed to fetch meeting: ${meetingResponse.status} ${meetingResponse.statusText}`);
    }

    const meetingData = await meetingResponse.json();
    console.log(`   ✅ Meeting found: "${meetingData.data.meeting_name}"`);
    console.log(`   📅 Date: ${meetingData.data.meeting_start_time || 'Unknown'}`);
    console.log(`   👥 Participants: ${meetingData.data.participants?.map(p => p.name).join(', ') || 'None'}`);

    // Step 2: Get recording details
    console.log('\n📡 Step 2: Fetching recording details...');
    const recordingResponse = await fetch(
      `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${recordingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!recordingResponse.ok) {
      throw new Error(`Failed to fetch recording: ${recordingResponse.status} ${recordingResponse.statusText}`);
    }

    const recordingData = await recordingResponse.json();
    console.log(`   ✅ Recording found!`);
    console.log(`   🎥 Recording ID: ${recordingData.data.id.call_recording_id}`);
    console.log(`   📅 Created: ${recordingData.data.created_at || 'Unknown'}`);
    
    // Parse the created_at date
    if (recordingData.data.created_at) {
      const createdDate = new Date(recordingData.data.created_at);
      const now = new Date();
      const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      console.log(`   ⏱️  Age: ${daysAgo} days ago`);
      console.log(`   📆 Full timestamp: ${createdDate.toISOString()}`);
      
      // Check if it's a 2026 recording
      const start2026 = new Date('2026-01-01T00:00:00Z').getTime();
      const recordingTime = createdDate.getTime();
      
      console.log(`\n🔍 Recording Analysis:`);
      console.log(`   2026 Start: ${new Date(start2026).toISOString()}`);
      console.log(`   Recording:  ${createdDate.toISOString()}`);
      console.log(`   Is 2026?:   ${recordingTime >= start2026 ? '✅ YES' : '❌ NO'}`);
      
      if (recordingTime < start2026) {
        console.log(`\n⚠️  FOUND THE ISSUE!`);
        console.log(`   This recording was created in ${createdDate.getFullYear()}`);
        console.log(`   Our polling only checks for 2026 recordings`);
        console.log(`   That's why it was missed!`);
      }
    }

    // Step 3: Check if transcript exists
    console.log('\n📡 Step 3: Checking transcript...');
    const transcriptResponse = await fetch(
      `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${recordingId}/transcript`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!transcriptResponse.ok) {
      console.log(`   ⚠️  No transcript available: ${transcriptResponse.status}`);
    } else {
      const transcriptData = await transcriptResponse.json();
      const segments = transcriptData.data?.transcript?.length || 0;
      console.log(`   ✅ Transcript found: ${segments} segments`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Analysis Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkMeeting();

