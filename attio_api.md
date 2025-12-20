# Attio API Endpoints Reference

## Base Configuration
```javascript
const ATTIO_API_BASE = 'https://api.attio.com/v2';
const ATTIO_API_KEY = 'your_attio_api_key_here';

const headers = {
  'Authorization': `Bearer ${ATTIO_API_KEY}`,
  'Content-Type': 'application/json'
};
```

---

## Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/meetings/{meeting_id}` | GET | Get meeting details, participants, date |
| `/meetings/{meeting_id}/call_recordings/{call_recording_id}` | GET | Get call recording metadata |
| `/meetings/{meeting_id}/call_recordings/{call_recording_id}/transcript` | GET | Get full transcript with speakers |

---

## 1. Get Meeting Details

### Endpoint
```
GET https://api.attio.com/v2/meetings/{meeting_id}
```

### Headers
```
Authorization: Bearer YOUR_ATTIO_API_KEY
Content-Type: application/json
```

### Example Request (cURL)
```bash
curl -X GET \
  "https://api.attio.com/v2/meetings/a2cfbe26-bc9f-40f5-96ce-62646264088c" \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY" \
  -H "Content-Type: application/json"
```

### Example Request (JavaScript)
```javascript
async function getMeetingDetails(meetingId) {
  const response = await fetch(
    `https://api.attio.com/v2/meetings/${meetingId}`,
    {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}
```

### Response
```json
{
  "data": {
    "id": "a2cfbe26-bc9f-40f5-96ce-62646264088c",
    "title": "[Franchising + SYOB] Digital check-in",
    "start_time": "2024-12-11T10:00:00Z",
    "end_time": "2024-12-11T11:00:00Z",
    "participants": [
      {
        "name": "Zirhang Bawn",
        "email": "zirhang@company.com"
      },
      {
        "name": "Sophie Cartwright",
        "email": "sophie@company.com"
      }
    ],
    "record_url": "https://app.attio.com/half-eaten-donut/calls/..."
  }
}
```

### What You Need
- `data.title` - Meeting title
- `data.start_time` - Meeting date
- `data.participants` - Array of participants (name + email)
- `data.record_url` - Link back to Attio

---

## 2. Get Call Recording Transcript

### Endpoint
```
GET https://api.attio.com/v2/meetings/{meeting_id}/call_recordings/{call_recording_id}/transcript
```

### Headers
```
Authorization: Bearer YOUR_ATTIO_API_KEY
Content-Type: application/json
```

### Example Request (cURL)
```bash
curl -X GET \
  "https://api.attio.com/v2/meetings/a2cfbe26-bc9f-40f5-96ce-62646264088c/call_recordings/3c42555a-d9e9-45bc-9681-9221738003fd/transcript" \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY" \
  -H "Content-Type: application/json"
```

### Example Request (JavaScript)
```javascript
async function getTranscript(meetingId, callRecordingId) {
  const response = await fetch(
    `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}/transcript`,
    {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}
```

### Response
```json
{
  "data": {
    "id": {
      "workspace_id": "14beef7a-99f7-4534-a87e-70b564330a4c",
      "meeting_id": "a2cfbe26-bc9f-40f5-96ce-62646264088c",
      "call_recording_id": "3c42555a-d9e9-45bc-9681-9221738003fd"
    },
    "transcript": [
      {
        "speech": "Hi Sophie, how are you?",
        "start_time": 0.5,
        "end_time": 2.8,
        "speaker": {
          "name": "Zirhang Bawn"
        }
      },
      {
        "speech": "Good, thank you.",
        "start_time": 3.0,
        "end_time": 4.2,
        "speaker": {
          "name": "Sophie Cartwright"
        }
      },
      {
        "speech": "How's your back?",
        "start_time": 4.5,
        "end_time": 5.3,
        "speaker": {
          "name": "Zirhang Bawn"
        }
      }
    ],
    "raw_transcript": "[00:00] Zirhang Bawn: Hi Sophie, how are you?\n[00:03] Sophie Cartwright: Good, thank you.\n[00:04] Zirhang Bawn: How's your back?",
    "web_url": "https://app.attio.com/half-eaten-donut/calls/a2cfbe26-bc9f-40f5-96ce-62646264088c/3c42555a-d9e9-45bc-9681-9221738003fd/transcript"
  }
}
```

### Response Fields

#### ✅ **RECOMMENDED: `data.raw_transcript` (string)**
Pre-formatted transcript with speaker labels and timestamps.
- **Format**: `[MM:SS] Speaker Name: Speech content`
- **Advantage**: Ready to use, no formatting needed
- **Use case**: Direct input to Claude API for analysis
- **Example**:
  ```
  [00:00] Zirhang Bawn: Hi Sophie, how are you?
  [00:03] Sophie Cartwright: Good, thank you.
  ```

#### Alternative: `data.transcript[]` (array)
Individual speech segments with detailed timing information.
- **Format**: Array of objects with `speech`, `start_time`, `end_time`, `speaker.name`
- **Use case**: When you need programmatic access to individual segments
- **Example**: Building custom transcript formats, analyzing speech patterns

#### Other Fields
- `data.id` - IDs for workspace, meeting, and call recording
- `data.web_url` - Direct link back to Attio transcript page

---

## 3. Get Call Recording Details

### Endpoint
```
GET https://api.attio.com/v2/meetings/{meeting_id}/call_recordings/{call_recording_id}
```

### Headers
```
Authorization: Bearer YOUR_ATTIO_API_KEY
Content-Type: application/json
```

### Example Request (cURL)
```bash
curl -X GET \
  "https://api.attio.com/v2/meetings/a2cfbe26-bc9f-40f5-96ce-62646264088c/call_recordings/3c42555a-d9e9-45bc-9681-9221738003fd" \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY" \
  -H "Content-Type: application/json"
```

### Example Request (JavaScript)
```javascript
async function getCallRecording(meetingId, callRecordingId) {
  const response = await fetch(
    `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}`,
    {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}
```

### Response
```json
{
  "data": {
    "id": "3c42555a-d9e9-45bc-9681-9221738003fd",
    "status": "completed",
    "duration": 3600,
    "created_at": "2024-12-11T10:00:00Z"
  }
}
```

---

## Getting IDs from Attio URL

When you're viewing a call recording in Attio, the URL looks like:
```
https://app.attio.com/half-eaten-donut/calls/
  a2cfbe26-bc9f-40f5-96ce-62646264088c/  ← Meeting ID
  3c42555a-d9e9-45bc-9681-9221738003fd/  ← Call Recording ID
  transcript
```

Extract:
- **Meeting ID**: `a2cfbe26-bc9f-40f5-96ce-62646264088c`
- **Call Recording ID**: `3c42555a-d9e9-45bc-9681-9221738003fd`

---

## 🎯 Raw Transcript Format (Recommended)

### Overview
The Attio API returns transcript data in **TWO formats**. We recommend using `raw_transcript` for most use cases.

### Option 1: `raw_transcript` ✅ RECOMMENDED

**Field**: `data.raw_transcript`  
**Type**: `string`  
**Format**: `[MM:SS] Speaker Name: Speech content`

**Advantages:**
- ✅ Pre-formatted with speaker labels
- ✅ Includes timestamps in readable format
- ✅ Ready to use directly with Claude API
- ✅ No formatting code needed
- ✅ Matches Attio's UI display format

**Example:**
```
[00:00] Alex Bell: Mr Watson, come here. I want to see you.
[00:05] Tom Watson: I'm here.
```

**Usage:**
```javascript
const transcript = transcriptData.data.raw_transcript;
// That's it! Ready to use.
```

### Option 2: `transcript[]` Array

**Field**: `data.transcript`  
**Type**: `array of objects`  
**Structure**: Each object contains `speech`, `start_time`, `end_time`, `speaker.name`

**Use when you need:**
- Programmatic access to individual speech segments
- Custom formatting or processing
- Precise timing information in seconds
- Analysis of speaker patterns or timing

**Example:**
```javascript
const segments = transcriptData.data.transcript;
// Manual formatting required:
const formatted = segments
  .map(seg => `${seg.speaker.name}: ${seg.speech}`)
  .join('\n');
```

### Comparison

| Feature | `raw_transcript` | `transcript[]` |
|---------|------------------|----------------|
| Pre-formatted | ✅ Yes | ❌ No |
| Timestamps included | ✅ Yes ([MM:SS]) | ✅ Yes (seconds) |
| Speaker labels | ✅ Yes | ✅ Yes |
| Ready to use | ✅ Yes | Requires formatting |
| Individual segments | ❌ No | ✅ Yes |
| Custom processing | ❌ Limited | ✅ Full control |

### Recommendation
**Use `raw_transcript` unless** you specifically need:
- Individual segment access
- Custom timestamp formats
- Programmatic speech analysis
- Fine-grained timing control

---

## Complete Example: Get Everything (Using raw_transcript)
```javascript
async function getFullMeetingData(meetingId, callRecordingId) {
  // Get meeting details
  const meetingDetails = await fetch(
    `https://api.attio.com/v2/meetings/${meetingId}`,
    {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  ).then(r => r.json());

  // Get transcript
  const transcriptData = await fetch(
    `https://api.attio.com/v2/meetings/${meetingId}/call_recordings/${callRecordingId}/transcript`,
    {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  ).then(r => r.json());

  // ✅ RECOMMENDED: Use raw_transcript (pre-formatted by Attio)
  const transcript = transcriptData.data.raw_transcript;
  
  // Alternative: Format manually from segments
  // const transcript = transcriptData.data.transcript
  //   .map(segment => `${segment.speaker.name}: ${segment.speech}`)
  //   .join('\n');

  return {
    title: meetingDetails.data.title,
    date: new Date(meetingDetails.data.start_time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    participants: meetingDetails.data.participants.map(p => p.name).join(', '),
    participantEmails: meetingDetails.data.participants.map(p => p.email),
    transcript: transcript, // Using raw_transcript field
    transcriptSegments: transcriptData.data.transcript, // Keep segments if needed
    attioUrl: meetingDetails.data.record_url,
    transcriptUrl: transcriptData.data.web_url // Direct link to transcript in Attio
  };
}

// Usage
const meetingData = await getFullMeetingData(
  'a2cfbe26-bc9f-40f5-96ce-62646264088c',
  '3c42555a-d9e9-45bc-9681-9221738003fd'
);

console.log(meetingData);
// Output:
// {
//   title: "[Franchising + SYOB] Digital check-in",
//   date: "December 11, 2024",
//   participants: "Zirhang Bawn, Sophie Cartwright",
//   transcript: "[00:00] Zirhang Bawn: Hi Sophie, how are you?\n[00:03] Sophie Cartwright: Good, thank you.\n...",
//   transcriptSegments: [...], // Array of individual segments
//   attioUrl: "https://app.attio.com/...",
//   transcriptUrl: "https://app.attio.com/.../transcript"
// }
```

---

## Required API Permissions

When creating your Attio API key, enable:

✅ **Meetings**: Read
✅ **Call Recordings**: Read

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid API key"
  }
}
```
**Solution:** Check your API key is correct and has proper permissions

**404 Not Found**
```json
{
  "error": {
    "code": "not_found",
    "message": "Meeting not found"
  }
}
```
**Solution:** Verify meeting ID and call recording ID are correct

**429 Rate Limited**
```json
{
  "error": {
    "code": "rate_limited",
    "message": "Too many requests"
  }
}
```
**Solution:** Wait 60 seconds and retry

### Example Error Handling
```javascript
async function safeApiCall(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ATTIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Attio API Error: ${error.error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    throw error;
  }
}
```

---

## Rate Limits

Attio API has rate limits (check their docs for current limits):
- ~100 requests per minute per workspace
- Implement retry logic with exponential backoff for production

---

## Additional Resources

- **Attio API Documentation**: https://docs.attio.com/rest-api/overview
- **Authentication Guide**: https://docs.attio.com/rest-api/guides/authentication
- **Meetings API Reference**: https://docs.attio.com/rest-api/endpoint-reference/meetings
- **Rate Limiting**: https://docs.attio.com/rest-api/guides/rate-limiting

---

## Quick Reference
```bash
# Test your API key
curl -X GET "https://api.attio.com/v2/self" \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY"

# Should return your workspace info
```

---

## Notes

- **✅ Raw transcript available**: Use `data.raw_transcript` field for pre-formatted transcript with speaker labels
- **❌ Insights NOT available via API** (confirmed by Attio support)
- Must use Claude to recreate insights from transcript
- Timestamps: Meeting times in ISO 8601 format (UTC), transcript in [MM:SS] format
- Speaker names automatically match meeting participants
- Both `raw_transcript` (string) and `transcript[]` (array) are returned in the same API call