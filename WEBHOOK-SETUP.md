# 🎣 Webhook Setup Guide

This guide explains how to set up the webhook automation for Attio meeting notes.

## 🏗️ Architecture Overview

```
Attio Meeting Ends
      ↓
Recording Processed
      ↓
Webhook: call-recording.created ──→ Your Server
      ↓                                    ↓
Meeting Transcript Available         Fetch Meeting
      ↓                                    ↓
                                    Format with Claude
                                           ↓
                                    Create Gmail Draft
```

## ✅ Prerequisites

Before starting, make sure you have:

- [x] Gmail OAuth set up (`gmail-token.json` exists)
- [x] Attio API key
- [x] Anthropic API key  
- [x] `.env` file created with all keys

## 📋 Step-by-Step Setup

### Step 1: Test Locally

First, let's test the webhook server locally:

```bash
npm run webhook
```

You should see:

```
🚀 Attio Meeting Notes Webhook Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Status: Running
   Port: 3000
   Health: http://localhost:3000/health
   Webhook: http://localhost:3000/webhooks/attio/call-recording-created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Ready to receive webhooks from Attio!
```

### Step 2: Test the Health Endpoint

Open your browser or use curl:

```bash
curl http://localhost:3000/health
```

Should return:

```json
{
  "status": "healthy",
  "service": "Attio Meeting Notes Automation",
  "timestamp": "2024-12-18T..."
}
```

### Step 3: Test with a Real Meeting (Optional)

You can test the full flow with your existing Attio meeting:

```bash
npm run test-attio
```

This will:
1. Fetch a meeting from Attio
2. Format it with Claude
3. Create a Gmail draft

---

## 🚀 Production Deployment

To use this in production, you need to:

1. **Deploy to a cloud service** (see deployment options below)
2. **Register the webhook with Attio**
3. **Test with a real meeting**

### Deployment Options

#### Option A: Vercel (Recommended - Easiest)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `ATTIO_API_KEY`
   - `ANTHROPIC_API_KEY`
   - Upload `credentials.json` and `gmail-token.json`

4. Note your deployment URL (e.g., `https://your-app.vercel.app`)

#### Option B: Google Cloud Functions

1. Install gcloud CLI
2. Deploy function
3. Set environment variables
4. Note the function URL

#### Option C: AWS Lambda

1. Package the application
2. Deploy to Lambda
3. Set up API Gateway
4. Configure environment variables

---

## 📝 Register Webhook with Attio

Once deployed, register your webhook with Attio:

### Using Attio API

```bash
curl -X POST https://api.attio.com/v2/webhooks \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://your-server.com/webhooks/attio/call-recording-created",
    "subscriptions": [
      {
        "event_type": "call-recording.created"
      }
    ]
  }'
```

Replace:
- `YOUR_ATTIO_API_KEY` with your Attio API key
- `https://your-server.com/...` with your deployed webhook URL

### Verify Webhook Registration

Check that your webhook is registered:

```bash
curl https://api.attio.com/v2/webhooks \
  -H "Authorization: Bearer YOUR_ATTIO_API_KEY"
```

---

## 🧪 Testing the Full Flow

### Option 1: Create a Test Meeting in Attio

1. Create a new meeting in Attio
2. Add a call recording
3. Wait for the recording to be processed
4. The webhook should trigger automatically
5. Check your Gmail drafts!

### Option 2: Manually Trigger the Webhook (for testing)

You can manually send a test webhook payload:

```bash
curl -X POST http://localhost:3000/webhooks/attio/call-recording-created \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "call-recording.created",
    "id": {
      "workspace_id": "your-workspace-id",
      "meeting_id": "0752aa62-0188-42e2-a2f7-837c675ab2a0",
      "call_recording_id": "9add3c00-08ff-4eb1-ae24-8cea07049926"
    },
    "actor": {
      "type": "workspace-member",
      "id": "some-id"
    }
  }'
```

(Use actual meeting IDs from your Attio workspace)

---

## 📊 Monitoring

### Check Logs

When the webhook triggers, you'll see logs like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 Webhook Received: call-recording.created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Timestamp: 2024-12-18T...
   Meeting ID: ...
   Recording ID: ...

📡 Step 1/3: Fetching meeting data from Attio...
✅ Meeting retrieved: "[MCA] Check-in"

🤖 Step 2/3: Formatting with Claude AI...
✅ Formatted notes ready

📧 Step 3/3: Creating Gmail draft...
✅ Gmail draft created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Webhook Processing Complete
   Total time: 15.32s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Check Gmail

Every time a meeting is processed, a new draft will appear in your Gmail drafts folder with:
- Subject: `Meeting Notes: [Meeting Title] - [Date]`
- Formatted meeting notes with all 5 sections
- Link back to Attio

---

## 🔧 Troubleshooting

### Webhook Not Triggering

1. **Check webhook registration**: Make sure your webhook is registered in Attio
2. **Check URL**: Ensure the URL is publicly accessible
3. **Check logs**: Look for any errors in your server logs

### "Missing environment variables" Error

Create a `.env` file with:

```env
ATTIO_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

### Gmail Token Expired

Run `npm run gmail-auth` again to refresh your token.

### Attio API Errors

- Check your Attio API key is valid
- Make sure the meeting ID and recording ID are correct
- Ensure the recording has finished processing

---

## 🎯 Next Steps

After successful setup:

1. ✅ Webhook server running
2. ✅ Registered with Attio
3. ✅ Tested with a meeting
4. ✅ Gmail draft created

**You're done!** 🎉 Every new Attio meeting will automatically generate meeting notes in your Gmail drafts.

---

## 📚 Related Documentation

- [Gmail Setup Guide](GMAIL-SETUP-GUIDE.md)
- [Attio API Reference](attio_api.md)
- [Attio Webhook Docs](https://docs.attio.com/rest-api/webhook-reference/call-recording-events/call-recordingcreated)

