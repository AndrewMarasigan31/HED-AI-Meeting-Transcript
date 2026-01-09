# How to Check if Attio is Sending Webhooks

## Check AWS Logs

1. **Go to AWS Elastic Beanstalk Console**
   - Environment: `Attio-meeting-formatter-env-2-env`

2. **Click "Logs" in left sidebar**

3. **Click "Request Logs" → "Last 100 Lines"**

4. **Download and search for:**
   - `🔨 Webhook Received` - Attio successfully sent webhook
   - `POST /webhooks/attio/call-recording-created` - Incoming webhook requests
   - `Attio-Signature` header - Confirms it's from Attio

## What to Look For

### ✅ Webhook IS Working:
```
🔨 Webhook Received: call-recording.created
   Meeting ID: xxx
   Recording ID: xxx
```

### ❌ Webhook NOT Working:
- No log entries with webhook messages
- Only health checks: `GET /health`
- Means Attio isn't sending webhooks

## Troubleshooting

### If NO webhooks in logs:

1. **Verify webhook is configured in Attio:**
   - Go to: https://app.attio.com/settings/developers/webhooks
   - Check URL is correct
   - Check event type is `call-recording.created`
   - Check it's **Enabled**

2. **Check webhook secret matches:**
   - Attio secret: `de1877c32951b1a3501e0a266f376108cf24b9b17ba3671f75961f8c831da8b0`
   - But our code doesn't verify signatures yet (optional)

3. **Try creating a new test recording:**
   - See if it triggers the webhook

### If webhooks ARE in logs but failing:

- You'll see the `credentials.json` error
- This confirms Attio → Webhook works! ✅
- Problem is Webhook → Gmail (needs deployment)

## Quick Test

Create a 30-second test call in Attio and wait 2 minutes. Then check AWS logs.
If you see the webhook log entry, Attio → Webhook connection works!


