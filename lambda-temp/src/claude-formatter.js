import Anthropic from '@anthropic-ai/sdk';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE FORMATTER
// Transforms meeting transcripts into formatted meeting notes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN FORMATTING FUNCTION (Two-Pass Approach)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function formatMeetingNotes(meetingData) {
  try {
    console.log('🤖 Formatting with Claude AI (Two-Pass)...');
    
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // PASS 1: Extract and analyze all potential action items
    console.log('   🔍 Pass 1: Extracting action items...');
    const pass1Message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: buildPass1Prompt(meetingData)
        }
      ],
    });
    
    const rawActionItems = pass1Message.content[0].text;
    console.log('   ✅ Pass 1 complete');

    // PASS 2: Format complete output with filtered action items
    console.log('   ✨ Pass 2: Formatting final output...');
    const pass2Message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: buildPass2Prompt(meetingData, rawActionItems)
        }
      ],
    });
    
    console.log('   ✅ Pass 2 complete');
    return pass2Message.content[0].text;
    
  } catch (error) {
    console.error('❌ Error calling Claude API:', error.message);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASS 1 PROMPT: Extract Action Items
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASS 2 PROMPT: Filter & Format
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPass2Prompt(meeting, rawActionItems) {
  // Get the main prompt template (without the transcript part)
  const mainPromptTemplate = buildMainPrompt(meeting).split('Transcript:')[0];
  
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
4. COLLABORATIVE ACTIONS: If Pass 1 identified multiple people, list them ALL in ONE row
5. MULTI-PART: If one person has "do X and Y", split into 2 separate rows
6. USE FIRST NAMES ONLY: "Katie" not "Katie Howell"
7. DUE DATES: Extract exactly as mentioned, blank if none
8. AIM FOR: 6-10 high-quality, detailed action items (not 20+)

FULL FORMATTING INSTRUCTIONS:

${mainPromptTemplate}

Based on the raw action items provided above, create a high-quality filtered list.

Output the complete formatted meeting summary now.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PROMPT TEMPLATE (Attio Format Specification)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildMainPrompt(meeting) {
  return `You are formatting a meeting transcript to match Attio CRM's EXACT insight template format.

I have analyzed Attio's actual output from multiple meetings. Follow these PRECISE formatting rules:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: MEETING NOTES (Paragraph-style bullet list format)

DEFINITION: Summarise the key areas that were discussed on the call, with each section correlating to a topic area.

RULES:
- Create 5-7 comprehensive bullets, each covering one major topic area
- Each bullet should GROUP related discussion points together into one cohesive paragraph
- END each line with a COMMA (not a period)
- Use past tense throughout ("were discussed", "was reviewed", "informed the team")
- Be SPECIFIC to this meeting - include names, dates, campaigns, amounts mentioned
- Each bullet = one topic area (e.g., introductions, campaign performance, process discussions, planning, decisions)
- Combine related information into comprehensive, detailed sentences

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: KEY DECISIONS (Clean bullet list format)

RULES:
- List ALL decisions made during the meeting
- DO NOT start with "Decision to" or similar phrases
- Start directly with the decision itself
- Use future tense "will be" or past tense "was decided"
- END each line with a PERIOD (not a comma - this section is different!)
- Be specific and clear
- CRITICAL: Do NOT combine multiple decisions into one bullet - each decision gets its own line
- Include budget allocation decisions with specific amounts
- Aim for 6-8 decisions for a typical meeting with multiple topics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: ACTION ITEMS (Markdown table format)

FORMAT:
| Responsible Person | Action Item | Due Date |

RULES:
- Use FIRST NAMES ONLY: "Katie" not "Katie Howell"
- Multi-person format: "Katie and Stella" or "Katie, Stella, and Ari" in ONE row
- Due dates: Extract exactly as mentioned ("next week", "Monday", "January 5th"), leave blank if none
- NO punctuation at end of action items
- ACTION ITEMS MUST BE DETAILED: Include WHY, WHAT FOR, or CONTEXT
- WHAT TO CAPTURE (Core commitments only):
  * Direct commitments: "I'll/I will/Let me/I need to/I'm going to/I can..."
  * Requests with person named: "Can you [do X], [Name]?" → assign to Name
  * Third-person assignments: "[Name] will/needs to/should do X" → assign to Name
  * Strategic planning: "Save budget for...", "Make sure to...", "Hold back X for...", "Keep Y aside for..."
  * Collaborative planning: "Maybe we should revisit...", "We need to work on...", "Let's meet to..."
  * Responses to "anything else?": If someone lists specific items, those are their commitments
  * Multi-part actions: "I'll do X and Y" = split into 2 separate rows
- WHAT NOT TO CAPTURE (Filter these out):
  * Vague check-ins: "touch base", "catch up", "sync sometime" without specific agenda
  * Ongoing status reports: "send weekly updates", "keep sending reports" (if already routine)
  * Generic monitoring without specific issue: "keep an eye on things"
  * Pure suggestions: "Maybe someday we could..." (no timeframe)
  * Personal/office items: "save a donut", "grab coffee", "book a room" (not project-related)
  * Social coordination: "meet for lunch", "save me a seat" (not business tasks)
  * ONLY capture business/project/campaign-related action items
- Aim for 6-12 action items per meeting (not 20+)
- Prioritize clear commitments with deliverables over vague mentions
- Each action should have a clear owner and clear deliverable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: NEXT MEETING AGENDA (Flowing text format)

RULES:
- Write as ONE OR TWO complete sentences (NOT bullet points)
- List all topics to be discussed, connected by commas
- Keep it comprehensive but concise
- Use future tense or descriptive format
- END with a PERIOD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL PUNCTUATION RULES:
- Meeting Notes: END WITH COMMAS
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
[Your output here - grouped topic bullets with commas at end]

Campaign Updates, Metrics, and Performance
[Your output here - detailed metrics with commas at end]

Key Decisions
[Your output here - decisions with periods at end]

Action Items
[Your output here - markdown table format]

Next Meeting Agenda
[Your output here - flowing text with period at end]`;
}






