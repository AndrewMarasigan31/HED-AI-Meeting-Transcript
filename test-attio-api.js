import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ATTIO_API_KEY = process.env.ATTIO_API_KEY;

if (!ANTHROPIC_API_KEY || !ATTIO_API_KEY) {
  console.error('❌ Error: Required API keys not found');
  console.error('Please set environment variables:');
  console.error('  - ANTHROPIC_API_KEY');
  console.error('  - ATTIO_API_KEY');
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTIO API - MCA MEETING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MEETING_ID = '0752aa62-0188-42e2-a2f7-837c675ab2a0';
const CALL_RECORDING_ID = '9add3c00-08ff-4eb1-ae24-8cea07049926';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH FROM ATTIO API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAttioMeetingData() {
  console.log('📡 Fetching meeting data from Attio API...\n');
  
  try {
    // Get meeting details
    const meetingResponse = await fetch(
      `https://api.attio.com/v2/meetings/${MEETING_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${ATTIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      console.log('❌ Meeting API Response Status:', meetingResponse.status);
      console.log('❌ Meeting API Response:', errorText);
      throw new Error(`Attio API Error (${meetingResponse.status}): ${errorText}`);
    }

    const meetingData = await meetingResponse.json();
    console.log('✅ Meeting details retrieved');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GET COMPLETE TRANSCRIPT WITH PAGINATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔄 Fetching transcript (with pagination support)...');
    const completeTranscript = await fetchCompleteTranscript(MEETING_ID, CALL_RECORDING_ID);
    console.log(`✅ Complete transcript retrieved\n`);

    return {
      title: meetingData.data.title,
      date: new Date(meetingData.data.start_time).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      participants: meetingData.data.participants.map(p => p.name).join(', '),
      transcript: completeTranscript.formattedTranscript,
      transcriptSegments: completeTranscript.allSegments,
      webUrl: completeTranscript.webUrl,
      stats: completeTranscript.stats // Include pagination stats
    };

  } catch (error) {
    console.error('❌ Error fetching from Attio:', error.message);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGINATED TRANSCRIPT FETCHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchCompleteTranscript(meetingId, callRecordingId) {
  let allSegments = [];
  let allRawText = '';
  let cursor = null;
  let pageCount = 0;
  let webUrl = null;

  console.log('   📄 Fetching page 1...');

  do {
    // Build URL with cursor if available
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
      throw new Error(`Transcript API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    pageCount++;

    // Accumulate segments
    if (data.data.transcript && data.data.transcript.length > 0) {
      allSegments = allSegments.concat(data.data.transcript);
    }

    // Accumulate raw transcript text
    if (data.data.raw_transcript) {
      allRawText += (allRawText ? '\n' : '') + data.data.raw_transcript;
    }

    // Store web URL from first page
    if (!webUrl && data.data.web_url) {
      webUrl = data.data.web_url;
    }

    // Check for next page (pagination is at root level, not data.data)
    cursor = data.pagination?.next_cursor || null;

    if (cursor) {
      console.log(`   📄 Fetching page ${pageCount + 1}...`);
    }

  } while (cursor); // Continue until no more pages

  // Build formatted transcript from all segments
  // Group consecutive words from same speaker into sentences
  const formattedTranscript = buildFormattedTranscript(allSegments);

  // Calculate duration
  const durationSeconds = allSegments.length > 0 
    ? allSegments[allSegments.length - 1].end_time 
    : 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  console.log(`   ✅ Retrieved ${pageCount} page(s)`);
  console.log(`   📊 Total segments: ${allSegments.length.toLocaleString()}`);
  console.log(`   ⏱️  Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  console.log(`   📝 Formatted length: ${formattedTranscript.length.toLocaleString()} characters`);

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
// BUILD READABLE TRANSCRIPT FROM WORD SEGMENTS
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TWO-PASS PROMPT BUILDERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPass1Prompt(meeting) {
  return `You are analyzing a meeting transcript to extract ALL potential action items.

MEETING TRANSCRIPT:
${meeting.transcript}

YOUR TASK - PASS 1: EXTRACT & ANALYZE

Go through the entire transcript and identify EVERY potential action item. For each one, note:

1. WHO is responsible (name from speaker label or context)
2. WHAT is the commitment/task
3. WHEN is it due (if mentioned)
4. IS IT COLLABORATIVE? (multiple people working together)
5. TYPE: Core commitment, Strategic planning, Status update, Vague check-in, or Personal/Office (non-business)
6. CONTEXT: Any relevant details about the action

WHAT TO LOOK FOR:
- Direct commitments: "I'll...", "I will...", "I need to...", "Let me..."
- Requests: "Can you...", "Will you...", "Could you..."
- Strategic: "Save budget for...", "Make sure to...", "Keep X for..."
- Collaborative: "We should...", "Let's...", "You two work on..."
- Responses to questions about upcoming work
- Multi-part actions (e.g., "I'll do X and Y" = 2 actions)

BE VERY THOROUGH - capture everything that might be an action, even if uncertain.

For COLLABORATIVE actions, identify ALL people involved by:
- Looking at who's speaking
- Context of the conversation
- When someone says "we" or "you two" or "you guys", figure out exactly who

OUTPUT FORMAT (simple numbered list):

1. PERSON: [Name]
   ACTION: [What they need to do]
   DUE: [When, if mentioned]
   COLLABORATIVE: [Yes/No - if yes, list all people: Name1, Name2, Name3]
   TYPE: [Core/Strategic/Status/Vague]
   CONTEXT: [Any relevant details]

2. PERSON: [Name]
   ...

Be exhaustive - list every potential action you find.`;
}

function buildPass2Prompt(meeting, rawActionItems) {
  return `You are formatting a meeting transcript to match Attio CRM's EXACT insight template format.

MEETING INFO:
Title: ${meeting.title}
Date: ${meeting.date}
Participants: ${meeting.participants}

RAW ACTION ITEMS (from Pass 1 analysis):
${rawActionItems}

YOUR TASK - PASS 2: FILTER & FORMAT

Use the raw action items above to create the final formatted output. 

For ACTION ITEMS specifically:
1. FILTER OUT (DO NOT INCLUDE THESE): 
   - Vague check-ins ("touch base", "catch up")
   - Routine status updates
   - Personal/office/social items ("save a donut", "put donut in fridge", "grab coffee", "save a seat")
   - CRITICAL: If it's not related to campaigns, projects, budgets, or business deliverables, DON'T include it
2. KEEP ONLY: Business action items related to campaigns, projects, budgets, strategy, deliverables
3. MAKE ITEMS DETAILED: Include context, purpose, or reason
   - Bad: "Send landing page"
   - Good: "Send Data Dreams landing page to Ari for A/B testing setup"
   - Bad: "Check budget"
   - Good: "Check budget availability for New Year's Eve party campaign"
4. COLLABORATIVE ACTIONS: If Pass 1 identified multiple people, list them ALL in ONE row
   Format: "Person1, Person2, and Person3 | Action | Due Date |"
5. MULTI-PART: If one person has "do X and Y", split into 2 separate rows
6. USE FIRST NAMES ONLY: "Katie" not "Katie Howell"
7. DUE DATES: Extract exactly as mentioned, blank if none
8. AIM FOR: 6-10 high-quality, detailed action items (not 20+)
9. EXAMPLES TO FILTER OUT:
   - "Put donut in fridge" (personal, not business)
   - "Save me a seat" (personal, not business)
   - "Book a meeting room" (administrative, not project-related)

FULL FORMATTING INSTRUCTIONS:

${buildPrompt(meeting).split('MEETING TRANSCRIPT:')[0]}

Based on the raw action items provided above, create a high-quality filtered list.

Output the complete formatted meeting summary now.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINGLE-PASS PROMPT BUILDER (WITH SPEAKER LABEL OPTIMIZATION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPrompt(meeting) {
  return `You are formatting a meeting transcript to match Attio CRM's EXACT insight template format.

I have analyzed Attio's actual output from multiple meetings. Follow these PRECISE formatting rules:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: MEETING NOTES (Paragraph-style bullet list format)

DEFINITION: Summarise the key areas that were discussed on the call, with each section correlating to a topic area.

RULES:
- Create 5-7 comprehensive bullets, each covering one major topic area
- Each bullet should GROUP related discussion points together into one cohesive paragraph
- END each line with a PERIOD (not a comma)
- Use past tense throughout ("were discussed", "was reviewed", "informed the team")
- Be SPECIFIC to this meeting - include names, dates, campaigns, amounts mentioned
- Each bullet = one topic area (e.g., introductions, campaign performance, process discussions, planning, decisions)
- Combine related information into comprehensive, detailed sentences

TOPIC GROUPING EXAMPLES:
- Introductions/new team members → Group all intro info together
- Campaign performance/status → Group all performance discussion together
- Process/workflow discussions → Group briefing, copy workflow, tools together
- Planning/scheduling → Group meeting schedules, timelines, deadlines together
- Budget/financial discussions → Group all budget talk together

CORRECT FORMAT:
Meeting Notes

The team discussed campaign performance across multiple platforms, with Google campaigns showing improved cost per conversions and Meta campaigns generating strong engagement numbers.

Budget allocation decisions were reviewed, including plans to bundle the MCLA campaign budget into the main summer campaign after launch.

Strategy discussion focused on A/B testing a new landing page for Data Dreams on both Google and Meta platforms to compare conversion performance.

Planning for the Christmas campaign included adding shipping cutoff dates to conversion ads and late-night shopping messaging to traffic ads.

INCORRECT FORMAT (Don't do this):
Meeting Notes
Summer campaign discussed,
MCLA campaign reviewed,
Budget allocation planned,
[Too fragmented, too many bullets, wrong punctuation]
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2: CAMPAIGN UPDATES, METRICS, AND PERFORMANCE (Detailed list format)

RULES:
- List EVERY SINGLE metric and performance data point mentioned in the transcript
- Include even brief mentions like "mobile performing well" or "tablets struggling"
- Format: [Platform/Campaign Name]: [Specific metric with exact numbers]
- Include exact figures, dates, currencies, percentages
- Add context in parentheses when helpful: "(Meta - December)", "(Google)"
- END each line with a COMMA (not a period)
- Be extremely precise with numbers
- Create SEPARATE lines for platform breakdowns (e.g., if Facebook vs Instagram mentioned separately)
- Do NOT skip any performance comments, even qualitative ones like "continues to perform well"
- Aim for 12-15+ lines for a meeting with multiple campaigns

CORRECT FORMAT:
Campaign Updates, Metrics, and Performance
DataDreams Google Campaigns: Cost per conversion came down to $10, $12, $17 across different campaigns, with an average of $17,
Demand Gen (Google): Saw 3 conversions from Sydney and 1 conversion from Interstate,
Membership (Meta - December): Reached 16,500, with 24,500 impressions and over 400 link clicks,
Data Dreams Total (Meta): 251 purchases to date, with 141 sales in Sydney, 55 in intrastate and interstate each, and zero in New Zealand,

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: KEY DECISIONS (Clean bullet list format)

DEFINITION: A list of decisions that were made. Don't include the words "Decision to" or similar at the front of each sentence.

WHAT TO CAPTURE AS DECISIONS:
1. Process/workflow decisions: How work will be done, who handles what tasks
   - Example: "Half Baked and Donut will handle the creation and implementation of UTM links for campaigns."
2. Role/responsibility decisions: Who is responsible for what
   - Example: "Dina will provide top-line copy, and Half Baked and Donut will optimize it."
3. Tool/system decisions: What tools or platforms will be used, primary sources of truth
   - Example: "A Looker Studio dashboard will serve as the primary source of truth for campaign performance data."
4. Communication decisions: How teams will communicate or coordinate
   - Example: "Campaign copy changes should be communicated via email, with modifications highlighted in red."
5. Campaign strategy decisions: Budget, targeting, platform choices, testing approaches
   - Example: "The MCLA campaign budget will be bundled into the main summer campaign."
6. Scope/inclusion decisions: Who is included in what projects or meetings
   - Example: "Lauren Murphy will be included in communications and meetings for both Security and Integrate events."
7. Timeline/scheduling decisions: When things will happen
   - Example: "The next meeting will be scheduled for the second week of January."

RULES:
- DO NOT start with "Decision to" or similar phrases - start directly with the decision
- Use future tense "will be" or "will" for forward-looking decisions
- END each line with a PERIOD (not a comma - this section is different!)
- Be specific and include details (who, what, how, when)
- Split multi-part decisions into separate bullets
- Aim for 6-10 decisions per meeting
- INCLUDE process/workflow decisions, not just campaign strategy

CORRECT FORMAT:
Key Decisions
Half Baked and Donut will handle the creation and implementation of UTM links for campaigns.
Campaign copy changes should be communicated via email, with modifications highlighted in red in the provided document.
The MCLA campaign budget will be bundled into the main summer campaign after the summer campaign launch.

INCORRECT FORMAT:
Key Decisions
Decision to bundle the MCLA campaign budget into the main summer campaign.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: ACTION ITEMS (Markdown table format)

FORMAT:
| Responsible Person | Action Item | Due Date |
- Use FIRST NAMES ONLY: "Katie" not "Katie Howell"
- Multi-person format: "Katie and Stella" or "Katie, Stella, and Ari" in ONE row
- Due dates: Extract exactly as mentioned ("next week", "Monday", "January 5th"), leave blank if none
- NO punctuation at end of action items
- ACTION ITEMS MUST BE DETAILED: Include WHY, WHAT FOR, or CONTEXT
  * Bad: "Send landing page"
  * Good: "Send Data Dreams landing page to Ari for A/B testing setup"
  * Bad: "Share keywords"
  * Good: "Share negative keywords for Art Pass campaign to prevent cannibalization with Data Dreams"

WHAT TO CAPTURE (Core commitments only):
1. Direct commitments: "I'll/I will/Let me/I need to/I'm going to/I can..."
2. Requests with person named: "Can you [do X], [Name]?" → assign to Name
3. Third-person assignments: "[Name] will/needs to/should do X" → assign to Name
4. Strategic planning: "Save budget for...", "Make sure to...", "Hold back X for...", "Keep Y aside for..."
5. Collaborative planning: "Maybe we should revisit...", "We need to work on...", "Let's meet to..."
6. Responses to "anything else?": If someone lists specific items, those are their commitments
7. Multi-part actions: "I'll do X and Y" = split into 2 separate rows

WHAT NOT TO CAPTURE (Filter these out):
- Vague check-ins: "touch base", "catch up", "sync sometime" without specific agenda
- Ongoing status reports: "send weekly updates", "keep sending reports" (if already routine)
- Generic monitoring without specific issue: "keep an eye on things"
- Pure suggestions: "Maybe someday we could..." (no timeframe)
- Personal/office items: "save a donut", "grab coffee", "book a room" (not project-related)
- Social coordination: "meet for lunch", "save me a seat" (not business tasks)
- ONLY capture business/project/campaign-related action items

MULTI-PERSON ATTRIBUTION (Critical - get this right):
- "[Name1] and [Name2], can you work on X?" → "Name1 and Name2" (both in ONE row)
- "You two should handle Y" → identify the 2 people from context
- "We should all..." → ALL meeting attendees
- "We need to..." → if context shows specific people (e.g., 2 speakers discussing), use those specific people; if general, use all attendees

SPEAKER LABELS (Use these for attribution):
- "[Name]: I'll do X" → Name is responsible
- "[Name1]: Can you do X, [Name2]?" → Name2 is responsible
- Someone says "[Name] will handle it" → Name is responsible

QUALITY OVER QUANTITY:
- Aim for 6-12 action items per meeting (not 20+)
- Prioritize clear commitments with deliverables over vague mentions
- Each action should have a clear owner and clear deliverable
- When in doubt: include it if COLLABORATIVE PLANNING or STRATEGIC, exclude if VAGUE CHECK-IN

EXAMPLES:
1. Multi-part: "I'll review the budget and send the report" = 2 actions (review budget | send report)
2. Strategic: "Save some budget for the final weeks" = action item (strategic planning)
3. Multi-person: "You two work on budget pacing" + context shows Stella and Zirthang = "Stella and Zirthang"
4. Filter out: "Let's touch base when Robin gets back" (too vague) vs "Review 2026 budget items with Robin" (specific)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: NEXT MEETING AGENDA (Flowing text format)

RULES:
- Write as ONE OR TWO complete sentences (NOT bullet points)
- List all topics to be discussed, connected by commas
- Keep it comprehensive but concise
- Use future tense or descriptive format
- END with a PERIOD

CORRECT FORMAT:
Next Meeting Agenda
The next meeting agenda will include confirming the MCLA budget shift to the main summer campaign, updating on the New Year's Eve party campaign budget decision, discussing negative keywords for the Art Pass campaign, reviewing Art Pass copy approval and setup, checking the status of the Data Dreams landing page A/B testing, and getting updates on Christmas campaign copy changes and donor list targeting for the New Year's Eve party.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL PUNCTUATION RULES:
- Meeting Notes: END WITH PERIODS
- Campaign Updates: END WITH COMMAS
- Key Decisions: END WITH PERIODS
- Action Items: NO PUNCTUATION in table cells
- Next Meeting Agenda: END WITH PERIOD

IMPORTANT GUIDELINES:
- Use past tense throughout (except future plans use "will be")
- Be VERY specific with names, numbers, dates, currencies
- If a section has no relevant content, you may omit that section entirely
- Do not add extra commentary or explanations
- Capture ALL details mentioned - be thorough
- Add context in parentheses where helpful: "(Meta)", "(December)", "(Google)"

SPEAKER LABELS (Available in this transcript):
- This transcript includes speaker labels showing exactly who said what
- Use speaker labels as PRIMARY source for attribution in Action Items
- When speaker says "I will/I'll/Let me" → that speaker is responsible
- When speaker asks "Can you/Will you [Name]" → [Name] is responsible
- Speaker labels dramatically improve action item accuracy - leverage them fully

CRITICAL - THOROUGHNESS REQUIREMENTS (READ THIS CAREFULLY):
- This is a COMPREHENSIVE summary - do not leave anything out
- Better to include too much detail than too little
- Meeting Notes: Capture EVERY topic discussed (aim for 9-12 bullets)
- Campaign Updates: Capture EVERY metric mentioned, even brief comments (aim for 12-15 lines)
- Key Decisions: List EVERY decision separately - do NOT combine (aim for 6-8 decisions)
- Action Items: Capture EVERY action for EVERY person - THIS IS CRITICAL:
  * ALL major tasks and setup work
  * ALL follow-up and checking tasks  
  * ALL monitoring and ongoing tasks
  * ALL sharing and sending tasks
  * ALL coordination and review tasks
  * Even tiny commitments like "I'll check..." or "I'll monitor..."
  * If someone says "I'll do X and Y" = 2 separate action items
  * If someone agrees to a request = that's an action item
  * If someone mentions ongoing work = that's an action item
  * Aim for 12-18+ items for active meetings
  * SCAN THE ENTIRE TRANSCRIPT for every single commitment
- When in doubt, INCLUDE IT - comprehensiveness is absolutely key
- For Action Items: It is BETTER to have 20 actions than miss even 1 commitment
- Do NOT filter out "small" tasks - small tasks matter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOW FORMAT THIS MEETING:

Meeting: ${meeting.title}
Date: ${meeting.date}
Participants: ${meeting.participants}

Transcript:
${meeting.transcript}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT EXACTLY IN THIS FORMAT:

Meeting Notes
[Your output here - grouped topic bullets with periods at end]

Campaign Updates, Metrics, and Performance
[Your output here - detailed metrics with commas at end]

Key Decisions
[Your output here - decisions with periods at end]

Action Items
[Your output here - markdown table format]

Next Meeting Agenda
[Your output here - flowing text with period at end]`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE API FORMATTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function formatWithClaudeTwoPass(meeting) {
  try {
    console.log('🤖 Two-Pass Formatting with Claude API...\n');
    
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // PASS 1: Extract and analyze all potential action items
    console.log('   🔍 Pass 1: Extracting and analyzing potential action items...');
    const pass1Message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: buildPass1Prompt(meeting)
        }
      ],
    });
    
    const rawActionItems = pass1Message.content[0].text;
    console.log('   ✅ Pass 1 complete - Found potential action items\n');

    // PASS 2: Format complete output with filtered action items
    console.log('   ✨ Pass 2: Formatting and filtering final output...');
    const pass2Message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: buildPass2Prompt(meeting, rawActionItems)
        }
      ],
    });
    
    console.log('   ✅ Pass 2 complete - Final output ready\n');
    return pass2Message.content[0].text;
    
  } catch (error) {
    console.error('❌ Error calling Claude API:', error.message);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runTest() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ATTIO API TEST - MCA (TWO-PASS)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch from Attio API
    const meetingData = await getAttioMeetingData();

    console.log('📄 Meeting Information:');
    console.log(`   Title: ${meetingData.title}`);
    console.log(`   Date: ${meetingData.date}`);
    console.log(`   Participants: ${meetingData.participants}`);
    console.log();
    console.log('📊 Transcript Statistics:');
    console.log(`   Pages fetched: ${meetingData.stats.pages}`);
    console.log(`   Total segments: ${meetingData.stats.segments.toLocaleString()}`);
    console.log(`   Duration: ${Math.floor(meetingData.stats.durationSeconds / 60)}:${Math.floor(meetingData.stats.durationSeconds % 60).toString().padStart(2, '0')}`);
    console.log(`   Characters: ${meetingData.stats.characters.toLocaleString()}`);
    console.log(`   Speaker-labeled: YES ✅\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Save raw transcript with speaker labels
    writeFileSync('attio-transcript-raw.txt', meetingData.transcript, 'utf8');
    console.log('💾 Raw transcript with speaker labels saved to: attio-transcript-raw.txt\n');

    // Format with Claude (Two-Pass Approach)
    const formattedOutput = await formatWithClaudeTwoPass(meetingData);

    // Display output
    console.log('✅ FORMATTED OUTPUT:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(formattedOutput);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Save formatted output
    writeFileSync('attio-output-formatted.txt', formattedOutput, 'utf8');
    
    console.log('\n✅ Test completed successfully!');
    console.log('💾 Formatted output saved to: attio-output-formatted.txt');
    console.log('💾 Raw transcript saved to: attio-transcript-raw.txt');
    console.log('\n🎯 This output uses SPEAKER LABELS for accurate action item attribution!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('YOUR_ATTIO_API_KEY_HERE')) {
      console.error('\n💡 Please set your ATTIO_API_KEY');
      console.error('   Edit test-attio-api.js and replace YOUR_ATTIO_API_KEY_HERE');
      console.error('   Or set environment variable: $env:ATTIO_API_KEY="your_key"');
    }
    
    process.exit(1);
  }
}

// Run the test
runTest();

