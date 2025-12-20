// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTIO API CLIENT
// Handles all interactions with Attio API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;

if (!ATTIO_API_KEY) {
  throw new Error('ATTIO_API_KEY environment variable is required');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH MEETING DATA (Main Function)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAttioMeetingData(meetingId, callRecordingId) {
  console.log(`📡 Fetching meeting data from Attio API...`);
  console.log(`   Meeting ID: ${meetingId}`);
  console.log(`   Recording ID: ${callRecordingId}`);
  
  try {
    // Get meeting details
    const meetingResponse = await fetch(
      `https://api.attio.com/v2/meetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      throw new Error(`Attio Meeting API Error (${meetingResponse.status}): ${errorText}`);
    }

    const meetingData = await meetingResponse.json();
    console.log('✅ Meeting details retrieved');

    // Get complete transcript with pagination
    console.log('🔄 Fetching transcript...');
    const completeTranscript = await fetchCompleteTranscript(meetingId, callRecordingId);
    console.log(`✅ Complete transcript retrieved (${completeTranscript.stats.segments} segments)`);

    // Extract participant names from email addresses
    const participantNames = meetingData.data.participants
      .map(p => {
        if (!p.email_address) return null;
        // Extract name from email (e.g., "stella@halfeatendonut.com" -> "Stella")
        const namePart = p.email_address.split('@')[0];
        const formatted = namePart
          .replace(/\./g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return formatted;
      })
      .filter(name => name)
      .join(', ');

    // Extract datetime from start object
    const startDatetime = meetingData.data.start?.datetime || meetingData.data.start;

    return {
      title: meetingData.data.title,
      date: startDatetime, // Extract datetime from start object
      dateFormatted: new Date(startDatetime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      participants: participantNames,
      transcript: completeTranscript.formattedTranscript,
      transcriptSegments: completeTranscript.allSegments,
      webUrl: completeTranscript.webUrl,
      stats: completeTranscript.stats
    };

  } catch (error) {
    console.error('❌ Error fetching from Attio:', error.message);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH COMPLETE TRANSCRIPT (With Pagination)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchCompleteTranscript(meetingId, callRecordingId) {
  let allSegments = [];
  let cursor = null;
  let pageCount = 0;
  let webUrl = null;

  do {
    const url = cursor 
      ? `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}/transcript?cursor=${encodeURIComponent(cursor)}`
      : `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}/transcript`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Attio Transcript API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    pageCount++;

    // Accumulate segments
    if (data.data.transcript && data.data.transcript.length > 0) {
      allSegments = allSegments.concat(data.data.transcript);
    }

    // Store web URL from first page
    if (!webUrl && data.data.web_url) {
      webUrl = data.data.web_url;
    }

    // Check for next page
    cursor = data.pagination?.next_cursor || null;

  } while (cursor);

  // Build formatted transcript from all segments
  const formattedTranscript = buildFormattedTranscript(allSegments);

  // Calculate duration
  const durationSeconds = allSegments.length > 0 
    ? allSegments[allSegments.length - 1].end_time 
    : 0;

  return {
    formattedTranscript,
    allSegments,
    webUrl,
    stats: {
      pages: pageCount,
      segments: allSegments.length,
      durationSeconds,
      characters: formattedTranscript.length
    }
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILD FORMATTED TRANSCRIPT (Group by Speaker)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildFormattedTranscript(segments) {
  if (segments.length === 0) return '';

  const lines = [];
  let currentSpeaker = null;
  let currentWords = [];
  let currentStartTime = null;

  for (const segment of segments) {
    const speakerName = segment.speaker?.name || 'Unknown Speaker';

    // If speaker changes, flush the current line
    if (currentSpeaker && currentSpeaker !== speakerName) {
      if (currentWords.length > 0) {
        const timestamp = formatTimestamp(currentStartTime);
        lines.push(`[${timestamp}] ${currentSpeaker}: ${currentWords.join(' ')}`);
        currentWords = [];
      }
      currentSpeaker = speakerName;
      currentStartTime = segment.start_time;
    }

    // Initialize speaker on first word
    if (!currentSpeaker) {
      currentSpeaker = speakerName;
      currentStartTime = segment.start_time;
    }

    // Add word to current line
    currentWords.push(segment.speech);
  }

  // Flush final line
  if (currentWords.length > 0) {
    const timestamp = formatTimestamp(currentStartTime);
    lines.push(`[${timestamp}] ${currentSpeaker}: ${currentWords.join(' ')}`);
  }

  return lines.join('\n');
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

