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

**AWS Lambda (2-Function Setup):**

```
Attio Meeting Ends → Recording Processed → Webhook Triggered
                                                 ↓
                              Lambda Handler (Fast Response - 202 Accepted)
                                                 ↓
                              Lambda Worker (Async Processing)
                                                 ↓
                        ┌───────────────┬─────────────────┬──────────────┐
                        ↓               ↓                 ↓              ↓
                  Fetch Transcript  Format Notes    Read Gmail    Create Draft
                  (Attio API)       (Claude AI)     Creds (S3)    (Gmail API)
```

**Benefits of Lambda:**
- ✅ Fast webhook responses (< 1 second)
- ✅ No server management
- ✅ Auto-scaling
- ✅ Costs ~$1/month (vs $15-30 for Elastic Beanstalk)
- ✅ Simple updates (just upload ZIP)

## 📁 Project Structure

```
HED-AI-Meeting-Transcript/
├── lambda-handler.js           # AWS Lambda webhook receiver (fast response)
├── lambda-worker.js            # AWS Lambda worker (async processing)
├── src/
│   ├── attio-client.js        # Attio API integration
│   ├── claude-formatter.js    # Claude AI formatting
│   ├── gmail-client.js        # Gmail draft creation
│   ├── gmail-auth.js          # Gmail OAuth (with S3 support)
│   ├── gmail-auth-setup.js    # Gmail setup script
│   └── load-env.js           # Environment config
├── package-lambda-simple.py    # Creates lambda-package.zip
├── check-missing-recordings.js # Utility to check unprocessed recordings
├── notification-client.js     # Telegram notifications (optional)
└── package.json               # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Gmail OAuth (Local Only)

```bash
npm run gmail-auth
```

Follow the instructions to authenticate with Gmail. This creates:
- `credentials.json` (from Google Cloud Console)
- `gmail-token.json` (generated after OAuth flow)

### 3. Create Lambda Deployment Package

```bash
python package-lambda-simple.py
```

This creates `lambda-package.zip` (~60-80 MB, takes 1-2 minutes).

### 4. Deploy to AWS Lambda

Follow the complete setup guide:
- See **[LAMBDA-SETUP-GUIDE.md](LAMBDA-SETUP-GUIDE.md)** for step-by-step instructions

**Quick summary:**
1. Create S3 bucket → Upload `credentials.json` and `gmail-token.json`
2. Create Lambda handler function → Upload `lambda-package.zip`
3. Create Lambda worker function → Upload same ZIP
4. Configure environment variables (API keys, S3 bucket name)
5. Create API Gateway → Get public webhook URL
6. Register webhook URL in Attio

## 📋 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Gmail auth | `npm run gmail-auth` | Set up Gmail OAuth (local setup) |
| Package Lambda | `python package-lambda-simple.py` | Create Lambda deployment ZIP |
| Check recordings | `npm run check-missing` | Check for unprocessed recordings |
| Test webhook | `npm run test-webhook` | Test webhook with sample meeting |
| Local dev | `npm run webhook` | Run webhook server locally (dev only) |

**Deployment Steps:**

1. **Create deployment package:**
   ```bash
   python package-lambda-simple.py
   ```

2. **Follow Lambda setup guide:**
   See **[LAMBDA-SETUP-GUIDE.md](LAMBDA-SETUP-GUIDE.md)** for complete instructions.

3. **Register webhook in Attio:**
   - Go to Attio Settings → Developers → Webhooks
   - Add webhook URL: `https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod/webhook`
   - Select event: `call-recording.created`
   - Click "Test" to verify

### Updating Your Code

1. Make changes locally
2. Run `python package-lambda-simple.py`
3. Upload new `lambda-package.zip` to both Lambda functions (handler + worker)
4. Deploy takes ~10 seconds!

## 📖 Documentation

- **[Lambda Setup Guide](LAMBDA-SETUP-GUIDE.md)** - Complete AWS Lambda deployment (RECOMMENDED)
- **[Attio API Reference](attio_api.md)** - Attio API endpoints and examples
- **[AWS Console Deployment](AWS-CONSOLE-DEPLOYMENT.md)** - Legacy Elastic Beanstalk guide (deprecated)

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

1. **Check webhook registration** in Attio → Settings → Developers → Webhooks
2. **Verify Lambda is deployed**: Go to AWS Lambda console, check both functions exist
3. **Test from Attio**: Use the "Test" button in webhook settings
4. **Check CloudWatch logs**: Lambda console → Monitor → View CloudWatch logs

### "Missing environment variables"

Check Lambda environment variables are set:
1. Go to Lambda function → Configuration → Environment variables
2. Verify: `ATTIO_API_KEY`, `ANTHROPIC_API_KEY`, `S3_BUCKET_NAME`, `AWS_REGION`

### Gmail Token Issues

1. **S3 bucket**: Verify `credentials.json` and `gmail-token.json` are uploaded to S3
2. **Lambda permissions**: Check Lambda execution role has S3 read permissions
3. **Refresh token**: Run `npm run gmail-auth` locally, then re-upload `gmail-token.json` to S3

### No Recordings Found

Recordings are only created after meetings end and Attio processes them. The webhook triggers when the recording is ready, not when the meeting is created.

### CloudWatch Logs

View detailed logs:
1. Lambda console → Monitor tab → View CloudWatch logs
2. Look for:
   - `📨 Webhook Received` - Confirms handler received webhook
   - `✅ Gmail draft created` - Confirms success
   - `❌ Error:` - Shows specific errors

## 🔐 Security

- **Never commit** `.env`, `gmail-token.json`, or `credentials.json` to git
- **S3 Storage**: Gmail credentials stored in private S3 bucket with restricted access
- **Lambda IAM Roles**: Uses AWS IAM for secure S3 access (no hardcoded credentials)
- **API Keys**: Stored in Lambda environment variables (encrypted at rest)
- **Private S3 Bucket**: Block all public access enabled by default

## 📝 API Permissions Required

**Attio API:**
- Meetings: Read
- Call Recordings: Read

**Gmail API:**
- Gmail: Modify (for creating drafts)
- Scopes: `https://www.googleapis.com/auth/gmail.compose`

**Anthropic API:**
- Claude API access

**AWS Services:**
- **Lambda**: Function execution
- **S3**: Read access to your bucket (credentials.json, gmail-token.json)
- **API Gateway**: Public endpoint for webhooks
- **CloudWatch**: Logging (automatic)

## 🎯 Features

- ✅ **Fast webhook responses** (< 1 second, async processing)
- ✅ **Serverless architecture** (AWS Lambda + API Gateway)
- ✅ **Auto-scaling** (handles any meeting volume)
- ✅ **Pagination support** for long transcripts
- ✅ **Two-pass Claude AI formatting** for structured output
- ✅ **HTML email formatting** with tables and styling
- ✅ **S3 credential storage** (secure, no environment variables)
- ✅ **Comprehensive logging** (CloudWatch integration)
- ✅ **Error handling and retry logic**
- ✅ **Utility scripts** for monitoring and backfilling

## 📊 Monitoring

### Check Processing Status

Run locally to check for unprocessed recordings:
```bash
npm run check-missing
```

### View Lambda Logs

**Via AWS Console:**
1. Go to Lambda function → Monitor tab
2. Click "View CloudWatch logs"
3. Select latest log stream
4. Look for: `📨 Webhook Received`, `✅ Gmail draft created`

**Via AWS CLI:**
```bash
aws logs tail /aws/lambda/attio-webhook-handler --follow
aws logs tail /aws/lambda/attio-webhook-worker --follow
```

### Monitor Performance

Lambda console shows:
- **Invocations**: Number of webhooks processed
- **Duration**: Average processing time (~50-60 seconds)
- **Errors**: Failed executions
- **Cost**: Monthly spend (typically < $2/month)

## 🤝 Contributing

This is an internal automation tool. For issues or improvements, update the code and redeploy.

---

**Built for Half Eaten Donut** - Attio CRM Meeting Notes Automation
