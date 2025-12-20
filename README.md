# Attio Meeting Transcript Formatter

This Node.js script formats meeting transcripts using Claude API to match Attio CRM's exact insight template format.

## 📋 What It Does

Takes raw meeting transcripts and formats them into Attio's 5-section structure:
1. **Meeting Notes** - Discussion summary
2. **Campaign Updates, Metrics, and Performance** - Detailed metrics
3. **Key Decisions** - Decisions made
4. **Action Items** - Table with responsible person, action, and due date
5. **Next Meeting Agenda** - Topics for next meeting

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Your API Key

Option A: Environment variable (recommended)
```bash
export ANTHROPIC_API_KEY=your_key_here
```

Option B: Edit `test-formatting.js`
```javascript
const ANTHROPIC_API_KEY = 'your_key_here';
```

Get your API key from: https://console.anthropic.com/settings/keys

### 3. Add Your Transcript

Edit `test-formatting.js` and update the `testMeeting` object:

```javascript
const testMeeting = {
  title: '[MCA] Check-in',
  date: 'December 14, 2024',
  participants: 'Katie, Erin, Stella, Ari',
  transcript: `
[Paste your full transcript here]
`
};
```

### 4. Run the Formatter

```bash
npm test
```

or

```bash
npm run format
```

## 📊 Output

The script will:
- Display formatted output in the console
- Save output to `output.txt`
- Show success/error messages

## 🎯 Based on Real Attio Analysis

This prompt was reverse-engineered from actual Attio outputs analyzing:
- Exact punctuation patterns (commas vs periods)
- Bullet point structure (flat vs nested)
- Detail level and specificity
- Table formatting
- Tense usage (past tense throughout)

See `attio-format-analysis.md` for the complete analysis.

## 📁 Files

- `test-formatting.js` - Main script with Claude integration
- `package.json` - Project dependencies
- `sample-transcript.txt` - Template for transcripts
- `attio-format-analysis.md` - Detailed analysis of Attio's patterns
- `output.txt` - Generated output (created after first run)

## 🔧 Troubleshooting

### "Cannot use import statement"
Make sure `"type": "module"` is in package.json (already included)

### "Invalid API key"
- Verify your key at https://console.anthropic.com/settings/keys
- Make sure it's set correctly (no extra spaces)

### "Rate limit error"
- Wait 60 seconds and try again
- Check your API usage limits

### Empty or incorrect output
- Ensure transcript has actual content
- Check that transcript format is natural conversation
- Review the prompt in `buildPrompt()` function

## 💡 Tips

1. **Test with multiple transcripts** - Each meeting type may need slight tweaks
2. **Compare with Attio** - Put outputs side-by-side to spot differences
3. **Iterate the prompt** - Adjust `buildPrompt()` based on results
4. **Check punctuation** - Commas vs periods matter in Attio's format
5. **Review action items** - Make sure empty due dates are actually empty (not "TBD")

## 📈 Next Steps

1. Run with your 3 sample transcripts from the CSV
2. Compare outputs with Attio's actual outputs
3. Note any formatting differences
4. Provide feedback for prompt refinement
5. Iterate until 95%+ match

## 🛠️ Customization

To adjust the formatting, edit the `buildPrompt()` function in `test-formatting.js`.

Key areas to customize:
- Section rules and examples
- Punctuation patterns
- Detail level instructions
- Tone and tense guidelines

---

Built for matching Attio CRM's insight template format exactly.


