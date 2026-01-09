# Attio Meeting Notes Automation

Automated webhook system that processes Attio meeting recordings and creates formatted Gmail drafts using Claude AI.

## 🎯 What It Does

When a meeting recording is created in Attio, this system automatically:
1. **Receives webhook** from Attio (`call-recording.created` event)
2. **Fetches transcript** from Attio API
3. **Formats with Claude AI** into 5 structured sections:
   - Meeting Notes
   - Campaign Updates, Metrics, and Performance
   - Key Decisions
   - Action Items (table format)
   - Next Meeting Agenda
4. **Creates Gmail draft** with formatted notes

## 🏗️ Architecture

```
Attio Meeting Ends → Recording Processed → Webhook Triggered
                                                 ↓
                                    Your Webhook Server (AWS/Local)
                                                 ↓
                              Fetch Transcript (Attio API)
                                                 ↓
                              Format Notes (Claude AI)
                                                 ↓
                              Create Gmail Draft
```

## 📁 Project Structure

```
HED-AI-Meeting-Transcript/
├── src/
│   ├── webhook-server.js      # Express webhook server
│   ├── attio-client.js        # Attio API integration
│   ├── claude-formatter.js    # Claude AI formatting
│   ├── gmail-client.js        # Gmail draft creation
│   ├── gmail-auth.js          # Gmail OAuth
│   ├── gmail-auth-setup.js    # Gmail setup script
│   └── load-env.js           # Environment config
├── check-missing-recordings.js # Utility to check unprocessed recordings
├── notification-client.js     # Telegram notifications (optional)
├── prepare-aws-env.js        # AWS deployment helper
├── Procfile                  # Heroku/AWS deployment
└── package.json              # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file with:

```env
ATTIO_API_KEY=your_attio_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token  # Optional
TELEGRAM_CHAT_ID=your_chat_id              # Optional
```

### 3. Set Up Gmail OAuth

```bash
npm run gmail-auth
```

Follow the instructions to authenticate with Gmail. This creates `gmail-token.json`.

### 4. Run the Webhook Server

**Local development:**
```bash
npm run webhook
```

**Production:**
```bash
npm start
```

Server runs on port 3000 (or PORT environment variable).

## 📋 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start server | `npm start` | Run webhook server (production) |
| Start server | `npm run webhook` | Run webhook server (development) |
| Gmail auth | `npm run gmail-auth` | Set up Gmail OAuth |
| Check recordings | `npm run check-missing` | Check for unprocessed recordings |
| AWS prep | `npm run prepare-aws-env` | Prepare AWS environment file |

## 🔧 Deployment

### AWS Elastic Beanstalk

1. **Prepare environment:**
   ```bash
   npm run prepare-aws-env
   ```

2. **Follow AWS deployment guide:**
   See `AWS-CONSOLE-DEPLOYMENT.md` for detailed instructions.

3. **Register webhook in Attio:**
   - Go to Attio Settings → Webhooks
   - Add webhook URL: `https://your-app-url/webhooks/attio/call-recording-created`
   - Select event: `call-recording.created`

## 📖 Documentation

- **[AWS Deployment Guide](AWS-CONSOLE-DEPLOYMENT.md)** - Deploy to AWS Elastic Beanstalk
- **[Gmail Setup Guide](GMAIL-SETUP-GUIDE.md)** - Set up Gmail OAuth
- **[Webhook Setup Guide](WEBHOOK-SETUP.md)** - Configure Attio webhooks
- **[Telegram Setup Guide](TELEGRAM-SETUP-GUIDE.md)** - Optional notifications
- **[Attio API Reference](attio_api.md)** - Attio API endpoints

## 🛠️ Utilities

### Check for Unprocessed Recordings

```bash
npm run check-missing
```

This script:
- Checks Gmail drafts for processed meetings
- Queries Attio for meetings with recordings
- Identifies recordings that haven't been processed
- Useful for troubleshooting webhook issues

## 🔍 Troubleshooting

### Webhook Not Triggering

1. **Check webhook registration** in Attio settings
2. **Verify server is running** and publicly accessible
3. **Check logs** for errors

### "Missing environment variables"

Make sure `.env` file exists with all required keys:
- `ATTIO_API_KEY`
- `ANTHROPIC_API_KEY`

### Gmail Token Expired

Run `npm run gmail-auth` to refresh the token.

### No Recordings Found

Recordings are only created after meetings end and Attio processes them. The webhook triggers when the recording is ready, not when the meeting is created.

## 🔐 Security

- **Never commit** `.env`, `gmail-token.json`, or `credentials.json`
- Store sensitive data in environment variables for production
- Use AWS Secrets Manager or similar for production deployments

## 📝 API Permissions Required

**Attio API:**
- Meetings: Read
- Call Recordings: Read

**Gmail API:**
- Gmail: Modify (for creating drafts)

**Anthropic API:**
- Claude API access

## 🎯 Features

- ✅ Automatic webhook processing
- ✅ Pagination support for long transcripts
- ✅ Two-pass Claude AI formatting
- ✅ HTML email formatting
- ✅ Error handling and logging
- ✅ Health check endpoint
- ✅ Optional Telegram notifications
- ✅ Utility scripts for monitoring

## 📊 Monitoring

Check if recordings are being processed:
```bash
npm run check-missing
```

Check server health:
```bash
curl https://your-server-url/health
```

## 🤝 Contributing

This is an internal automation tool. For issues or improvements, update the code and redeploy.

---

**Built for Half Eaten Donut** - Attio CRM Meeting Notes Automation
