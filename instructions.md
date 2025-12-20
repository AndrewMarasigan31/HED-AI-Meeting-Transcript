# Claude Meeting Formatter - Build Instructions

## Project Overview
Build a Node.js script that takes a meeting transcript and formats it using Claude API to match Attio CRM's insight template format.

---

## Setup Instructions

### 1. Initialize Project
```bash
npm init -y
npm install @anthropic-ai/sdk
```

### 2. Update package.json
Add `"type": "module"` to enable ES modules:
```json
{
  "name": "attio-claude-test",
  "version": "1.0.0",
  "type": "module",
  "main": "test-formatting.js",
  "scripts": {
    "test": "node test-formatting.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0"
  }
}
```

---

## File Structure

Create these files:
```
attio-claude-test/
├── package.json
├── test-formatting.js (main script)
├── sample-transcript.txt (test data)
├── output.txt (generated)
└── CURSOR_INSTRUCTIONS.md (this file)
```

---

## Main Script: test-formatting.js

Create a Node.js script with the following components:

### Import Dependencies
```javascript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
```

### Configuration Section
```javascript
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE';
```

### Test Data Structure
```javascript
const testMeeting = {
  title: '[Meeting Title]',
  date: 'December 11, 2024',
  participants: 'Person 1, Person 2, Person 3',
  transcript: `
[Transcript content here]
`
};
```

### Build Prompt Function

Create a function `buildPrompt(meeting)` that returns this exact prompt:
```
You are formatting a meeting transcript to match Attio CRM's exact insight template.

Follow these STRICT formatting rules:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: MEETING NOTES (List format)
Rules:
- Summarize the key areas that were discussed on the call
- Each section correlates to a sub-heading
- Under each sub-heading, list the key discussion points, decisions and actions associated with that section
- Use bullet points (•)
- Organize by topic/theme

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2: CAMPAIGN UPDATES, METRICS, AND PERFORMANCE (List format)
Rules:
- List detailing any metrics or performance discussions regarding a campaign
- Include ticket sales, visitor numbers, or performance vs expectations
- List exact figures and dates whenever they are mentioned
- Include currencies where mentioned
- Be precise with numbers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: KEY DECISIONS (List format)
Rules:
- A list of decisions that were made
- DO NOT include the words "Decision to" or similar at the front of each sentence
- Start directly with the decision itself
- Use bullet points (•)

Example:
✓ "Budget increased to $50,000 for Q1 campaign"
✗ "Decision to increase budget to $50,000 for Q1 campaign"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: ACTION ITEMS (Table format)
Rules:
- Action items or tasks that arose from the call
- Include any mention of a change to the budget, detailing the amount of budget, when it would be applied, on which platforms, and any other linked information
- At the FRONT of the item, include the responsible person for each item
- At the END of the item, include the due date or timeframe mentioned
- Present as a markdown table with columns: Responsible Person | Action Item | Due Date

Format:
| Responsible Person | Action Item | Due Date |
|--------------------|-------------|----------|
| [Name] | [Detailed action with budget/platform info] | [Date/timeframe] |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: NEXT MEETING AGENDA (Text format)
Rules:
- Based on the key decisions and action items, list here the key topics for discussion for the next call
- Write as flowing text, NOT bullet points
- Keep it concise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT:
- Use past tense throughout
- Be specific with names, numbers, dates, currencies
- If a section has no relevant content from the meeting, write "Nothing relevant mentioned"
- Do not add extra commentary or explanations

NOW FORMAT THIS MEETING:

Meeting: ${meeting.title}
Date: ${meeting.date}
Participants: ${meeting.participants}

Transcript:
${meeting.transcript}

OUTPUT FORMAT:

MEETING NOTES
[Your output here]

CAMPAIGN UPDATES, METRICS, AND PERFORMANCE
[Your output here]

KEY DECISIONS
[Your output here]

ACTION ITEMS
[Your output here in table format]

NEXT MEETING AGENDA
[Your output here in text format]
```

### Claude API Function

Create async function `formatWithClaude(meeting)` that:
1. Initializes Anthropic client with API key
2. Calls Claude API with:
   - Model: 'claude-sonnet-4-20250514'
   - Max tokens: 4000
   - Message: user role with prompt from buildPrompt()
3. Returns the text content from response

### Main Execution Function

Create async function `runTest()` that:
1. Logs test header with meeting details
2. Calls formatWithClaude()
3. Logs the formatted output to console
4. Saves output to 'output.txt'
5. Handles errors with try-catch

### Error Handling
- Wrap API call in try-catch
- Log errors clearly with '❌' emoji
- Provide helpful error messages for common issues:
  - Invalid API key
  - Network errors
  - Malformed responses

---

## Console Output Requirements

The script should output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TESTING CLAUDE FORMATTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Meeting: [title]
Date: [date]
Participants: [names]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Calling Claude API...

✅ FORMATTED OUTPUT:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Claude's formatted output]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test completed successfully!
💾 Output saved to output.txt
```

---

## Testing Instructions

### 1. Set API Key
Either:
- Set environment variable: `export ANTHROPIC_API_KEY=your_key`
- Or replace placeholder in script

### 2. Add Test Data
In `testMeeting` object, add:
- Real meeting title
- Meeting date
- Participant names
- Full transcript (Speaker: Text format)

### 3. Run Test
```bash
npm test
```

### 4. Review Output
- Check console output
- Open `output.txt`
- Compare with Attio's format

---

## Expected Output Structure

The output should have exactly 5 sections:
```
MEETING NOTES
- Topic 1 heading
  - Discussion point
  - Decision made
- Topic 2 heading
  - Key point

CAMPAIGN UPDATES, METRICS, AND PERFORMANCE
- Campaign A: 1,500 visitors, $25K revenue (Dec 1-10)
- Campaign B: Below expectations, 60% of target

KEY DECISIONS
- Budget reallocated to Campaign A for Q1
- Team to focus on Brisbane market launch

ACTION ITEMS
| Responsible Person | Action Item | Due Date |
|--------------------|-------------|----------|
| John Smith | Prepare Q1 budget proposal including $50K allocation for Campaign A | Dec 20, 2024 |
| Sarah Lee | Coordinate Brisbane launch timeline with vendors | End of week |

NEXT MEETING AGENDA
Review Q1 budget proposal, discuss Brisbane launch logistics and vendor contracts, evaluate Campaign A performance metrics from holiday period.
```

---

## Validation Checklist

After running the test, verify:

- [ ] All 5 sections present
- [ ] Meeting Notes has sub-headings with bullets
- [ ] Metrics include exact numbers and currencies
- [ ] Key Decisions don't start with "Decision to"
- [ ] Action Items in table format
- [ ] Action Items show person at front, date at end
- [ ] Next Meeting Agenda is text (not bullets)
- [ ] Past tense throughout
- [ ] No extra commentary added

---

## Troubleshooting

### Module Error
If you get "Cannot use import statement":
- Ensure `"type": "module"` is in package.json

### API Key Error
If you get authentication error:
- Verify key at https://console.anthropic.com/settings/keys
- Check key is set correctly in script

### Rate Limit Error
If you get rate limit error:
- Wait 60 seconds
- Try again

### Empty Output
If sections are empty:
- Check transcript has actual content
- Verify transcript format is "Speaker: Text"

---

## Next Steps After Testing

1. Run the test multiple times with different transcripts
2. Compare outputs with Attio's actual insights
3. Note any differences in formatting or content
4. Adjust prompt rules if needed
5. Re-test until 95%+ match

---

## Notes for Cursor

- Use async/await throughout
- Add proper error handling
- Make code readable with comments
- Use template literals for long strings
- Keep functions focused and single-purpose
- Export functions if they'll be reused later