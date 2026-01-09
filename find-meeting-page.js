#!/usr/bin/env node

/**
 * Find which page the target meeting is on
 */

import './src/load-env.js';

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const targetMeetingId = 'd74eb63c-e345-48ff-be7d-395863beb47c';

async function findMeetingPage() {
  console.log('\n🔍 Searching for meeting across all pages...\n');
  
  let cursor = null;
  let pageNum = 0;
  let found = false;
  
  try {
    do {
      pageNum++;
      const url = cursor 
        ? `https://api.attio.com/v2/meetings?limit=50&cursor=${encodeURIComponent(cursor)}`
        : 'https://api.attio.com/v2/meetings?limit=50';
      
      console.log(`   📄 Checking page ${pageNum}...`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`   ❌ API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const meetings = data.data || [];
      
      // Check if target is on this page
      const foundMeeting = meetings.find(m => {
        const meetingId = m.id?.meeting_id || m.id;
        return meetingId === targetMeetingId;
      });
      
      if (foundMeeting) {
        console.log(`\n   🎯 FOUND on page ${pageNum}!`);
        console.log(`      Title: ${foundMeeting.title}`);
        console.log(`      Meeting ID: ${foundMeeting.id?.meeting_id}\n`);
        found = true;
        break;
      }
      
      cursor = data.pagination?.next_cursor || null;
      
      // Safety limit
      if (pageNum >= 50) {
        console.log(`\n   ⚠️  Stopped at page 50 (safety limit)`);
        break;
      }
      
    } while (cursor);
    
    if (!found) {
      console.log(`\n   ❌ Meeting not found in first ${pageNum} pages`);
      console.log(`      Either it's beyond page ${pageNum} or doesn't exist\n`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

findMeetingPage();

