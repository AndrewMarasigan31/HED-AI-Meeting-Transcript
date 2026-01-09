#!/usr/bin/env node

/**
 * Test if date filtering works on meetings API
 */

import './src/load-env.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const targetMeetingId = 'd74eb63c-e345-48ff-be7d-395863beb47c';

async function testDateFilter() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Date Filter on Meetings API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const starts_from = '2026-01-01T00:00:00Z';
    const url = `https://api.attio.com/v2/meetings?limit=200&starts_from=${encodeURIComponent(starts_from)}`;
    
    console.log(`📡 Fetching meetings from ${starts_from}...`);
    console.log(`   URL: ${url}\n`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ API Error: ${response.status}`);
      console.log(`   ${error}\n`);
      return;
    }

    const data = await response.json();
    const meetings = data.data || [];
    
    console.log(`✅ Got ${meetings.length} meetings from 2026+\n`);
    
    if (meetings.length > 0) {
      console.log('📋 First 5 meetings:');
      for (let i = 0; i < Math.min(5, meetings.length); i++) {
        const m = meetings[i];
        console.log(`   ${i + 1}. ${m.title || 'Untitled'}`);
        console.log(`      ID: ${m.id?.meeting_id || m.id}`);
      }
      console.log('');
    }
    
    // Check if target meeting is in results
    const found = meetings.find(m => {
      const meetingId = m.id?.meeting_id || m.id;
      return meetingId === targetMeetingId;
    });
    
    if (found) {
      console.log(`🎯 Target meeting FOUND!`);
      console.log(`   Title: ${found.title}`);
      console.log(`   ID: ${found.id?.meeting_id}\n`);
    } else {
      console.log(`⚠️  Target meeting NOT in first 200 results`);
      console.log(`   Total returned: ${meetings.length}`);
      console.log(`   Has more pages: ${data.pagination?.next_cursor ? 'Yes' : 'No'}\n`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

testDateFilter();


