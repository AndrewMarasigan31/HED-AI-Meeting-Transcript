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
    // Add initial buffer delay as recommended by Attio - transcript may not be ready immediately
    const INITIAL_TRANSCRIPT_BUFFER = 5000; // 5 seconds initial delay
    console.log('🔄 Fetching transcript...');
    console.log(`   ⏳ Waiting ${INITIAL_TRANSCRIPT_BUFFER/1000}s initial buffer (transcript may need time to process)...`);
    await new Promise(resolve => setTimeout(resolve, INITIAL_TRANSCRIPT_BUFFER));
    
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

async function fetchCompleteTranscript(meetingId, callRecordingId, maxRetries = 10, initialRetryDelay = 10000) {
  let allSegments = [];
  let cursor = null;
  let pageCount = 0;
  let webUrl = null;
  let retryCount = 0;
  let consecutive404s = 0; // Track consecutive 404s to detect permanent unavailability

  // Retry logic: Transcript might not be ready immediately after recording is created
  // Uses exponential backoff: 10s, 20s, 40s, 60s, 60s, 60s...
  // Also handles cases where transcripts may never be generated
  while (retryCount < maxRetries) {
    try {
      // Reset for new attempt
      allSegments = [];
      cursor = null;
      pageCount = 0;
      
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

        // If transcript not ready yet (404), retry
        if (response.status === 404) {
          consecutive404s++;
          
          // Check if recording exists to determine if transcript will ever be available
          if (retryCount === 0) {
            // First attempt - check if recording exists
            try {
              const recordingResponse = await fetch(
                `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${ATTIO_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (!recordingResponse.ok) {
                throw new Error(`Recording not found (${recordingResponse.status}). Cannot generate transcript.`);
              }
              
              const recordingData = await recordingResponse.json();
              const recordingStatus = recordingData.data?.status;
              
              // If recording status indicates it won't generate transcript, fail early
              if (recordingStatus === 'failed' || recordingStatus === 'cancelled') {
                throw new Error(`Recording status is "${recordingStatus}". Transcript will not be generated.`);
              }
              
              console.log(`   ℹ️  Recording exists (status: ${recordingStatus || 'unknown'}), waiting for transcript...`);
            } catch (recordingError) {
              // If we can't check recording or it doesn't exist, fail
              throw new Error(`Cannot verify recording: ${recordingError.message}`);
            }
          }
          
          if (retryCount < maxRetries - 1) {
            retryCount++;
            // Exponential backoff: 10s, 20s, 40s, then cap at 60s
            const delay = Math.min(initialRetryDelay * Math.pow(2, retryCount - 1), 60000);
            const totalWaitMinutes = Math.floor((retryCount * 60) / 60); // Approximate
            console.log(`   ⏳ Transcript not ready yet (404). Retrying in ${delay/1000}s... (Attempt ${retryCount}/${maxRetries}, ~${totalWaitMinutes} min total wait)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry from the beginning
          } else {
            // After max retries, check one more time if recording still exists
            const finalCheck = await fetch(
              `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}`,
              {
                headers: {
                  'Authorization': `Bearer ${ATTIO_API_KEY}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (finalCheck.ok) {
              const finalRecording = await finalCheck.json();
              const status = finalRecording.data?.status;
              throw new Error(`Transcript not available after ${maxRetries} attempts (~${Math.floor((maxRetries * 60) / 60)} minutes). Recording exists (status: ${status}) but transcript was never generated. This may indicate the recording does not support transcription.`);
            } else {
              throw new Error(`Transcript not available after ${maxRetries} attempts. Recording may no longer exist.`);
            }
          }
        }
        
        // Reset 404 counter on successful response
        consecutive404s = 0;

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

      // Check if we got any transcript content
      if (allSegments.length === 0) {
        // Transcript endpoint exists but no content yet - might still be processing
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const delay = Math.min(initialRetryDelay * Math.pow(2, retryCount - 1), 60000);
          console.log(`   ⏳ Transcript exists but is empty (still processing). Retrying in ${delay/1000}s... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error(`Transcript exists but is empty after ${maxRetries} attempts. The transcript may still be processing.`);
        }
      }

      // If we got here with content, transcript was successfully fetched
      if (retryCount > 0) {
        console.log(`   ✅ Transcript ready after ${retryCount} retry attempt(s)`);
      }
      break; // Exit retry loop

    } catch (error) {
      // If it's a 404 or empty transcript (transcript not ready), retry
      if (error.message.includes('404') || error.message.includes('not available') || error.message.includes('empty')) {
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const delay = Math.min(initialRetryDelay * Math.pow(2, retryCount - 1), 60000);
          console.log(`   ⏳ Transcript not ready yet. Retrying in ${delay/1000}s... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      // For other errors or max retries reached, throw
      throw error;
    }
  }

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

