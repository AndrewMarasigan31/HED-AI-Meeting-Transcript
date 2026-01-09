# Troubleshooting JSON Payload Errors

## 🔴 Error Message
```json
{
  "success": false,
  "error": "Invalid JSON payload",
  "message": "Request body must be valid JSON"
}
```

## 📋 What Was Fixed

### 1. **Enhanced JSON Error Handling** (`src/webhook-server.js`)
- Added custom error handler for `express.json()` middleware
- Increased payload size limit to 10MB
- Added request body verification
- Enhanced logging to capture malformed JSON

### 2. **Comprehensive Request Logging**
- Logs all incoming webhook requests with headers
- Captures Content-Type, Content-Length, User-Agent
- Logs payload preview for debugging
- Skips health check logging to reduce noise

### 3. **AWS Elastic Beanstalk Configuration** (`.ebextensions/`)
- **`01_nginx.config`**: Configures nginx to handle larger payloads
  - Increased `client_max_body_size` to 10M
  - Extended proxy timeouts to 300 seconds
  - Improved buffer settings
- **`02_environment.config`**: Environment and deployment settings
  - Node.js configuration
  - Logging enabled
  - Timeout settings

### 4. **Test & Deployment Tools**
- **`test-json-payload.js`**: Tests various JSON payload scenarios
- **`deploy-to-aws.js`**: Automated deployment script

---

## 🚀 How to Deploy the Fixes

### Option 1: Automated Deployment (Recommended)

```bash
npm run deploy-aws
```

This will:
1. Stage all changes
2. Create a commit
3. Deploy to AWS Elastic Beanstalk
4. Show deployment status

### Option 2: Manual Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Fix JSON payload handling and add error logging"

# 2. Deploy to AWS
eb deploy

# 3. Monitor logs
eb logs --stream
```

---

## 🧪 Testing

### Test JSON Payload Handling

```bash
npm run test-json
```

This tests:
- ✅ Valid Attio webhook payloads
- ❌ Empty objects
- ❌ Null payloads
- ❌ Invalid JSON strings
- ❌ Missing Content-Type headers

### Test Specific Meeting

```bash
npm run test-webhook <meeting_id> <recording_id>
```

Example:
```bash
npm run test-webhook 465a7c11-cc85-455e-b586-433dd8bb87e1 eec7b78d-1004-48a4-89f1-de8d0280a17e
```

---

## 🔍 Diagnosing Issues

### Check AWS Logs

```bash
# Stream live logs
eb logs --stream

# View recent logs
eb logs

# Check specific log
eb logs --instance <instance-id>
```

### Check Webhook Health

```bash
curl http://your-webhook-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Attio Meeting Notes Automation",
  "timestamp": "2026-01-09T..."
}
```

### Check Attio Webhook Configuration

1. Go to **Attio** → **Settings** → **Webhooks**
2. Verify webhook URL is correct
3. Check event type: `call-recording.created`
4. Test webhook from Attio dashboard

---

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid JSON payload"

**Causes:**
- Attio sending malformed JSON
- Missing Content-Type header
- nginx rejecting large payloads
- Encoding issues

**Solution:**
1. Check AWS logs: `eb logs`
2. Look for detailed error messages in new logging
3. Verify Content-Type: `application/json`
4. Deploy the nginx configuration fixes

### Issue 2: Webhook Times Out

**Causes:**
- Transcript too long
- Claude API slow response
- nginx proxy timeout

**Solution:**
1. Check processing time in logs
2. Verify timeout settings in `.ebextensions/01_nginx.config`
3. Consider increasing timeouts if needed

### Issue 3: Webhook Not Receiving Events

**Causes:**
- Webhook not registered in Attio
- Incorrect URL
- AWS server not running

**Solution:**
1. Verify webhook URL in Attio
2. Check AWS environment: `eb status`
3. Ensure server is running: `eb health`
4. Test manually: `npm run test-webhook <meeting_id> <recording_id>`

---

## 📊 Monitoring After Deployment

### 1. Watch Logs in Real-Time

```bash
eb logs --stream
```

Look for:
- ✅ `📨 Webhook Received: call-recording.created`
- ✅ `✅ Meeting retrieved: "Meeting Title"`
- ✅ `✅ Gmail draft created successfully!`
- ❌ `❌ JSON Parse Error` (should not appear after fix)

### 2. Test with a New Meeting

1. Create/complete a meeting in Attio with recording
2. Watch the logs for webhook processing
3. Check Gmail drafts folder
4. Verify formatted notes are correct

### 3. Run Missing Recordings Check

```bash
npm run check-missing 2026-01-09
```

This verifies all recordings from a specific date were processed.

---

## 🆘 Still Having Issues?

### Collect Debug Information

1. **AWS Environment Status:**
   ```bash
   eb status
   eb health
   ```

2. **Recent Logs:**
   ```bash
   eb logs > aws-logs.txt
   ```

3. **Webhook Test Results:**
   ```bash
   npm run test-json > test-results.txt
   ```

4. **Attio Webhook Logs:**
   - Go to Attio → Settings → Webhooks
   - Check webhook delivery history
   - Look for failed deliveries

### Check These Points

- [ ] AWS EB environment is running (`eb status`)
- [ ] Webhook URL matches in Attio settings
- [ ] Content-Type is `application/json`
- [ ] Nginx configuration is deployed
- [ ] Environment variables are set in AWS
- [ ] Gmail token is not expired

---

## 📝 Changes Summary

| File | Changes |
|------|---------|
| `src/webhook-server.js` | Added JSON error handling, request logging, payload validation |
| `.ebextensions/01_nginx.config` | Nginx configuration for payload handling |
| `.ebextensions/02_environment.config` | Environment and timeout settings |
| `test-json-payload.js` | JSON payload testing script |
| `deploy-to-aws.js` | Automated deployment script |
| `package.json` | Added `test-json` and `deploy-aws` scripts |

---

## ✅ Next Steps

1. **Deploy the fixes:**
   ```bash
   npm run deploy-aws
   ```

2. **Test the webhook:**
   ```bash
   npm run test-json
   ```

3. **Monitor logs:**
   ```bash
   eb logs --stream
   ```

4. **Verify with real meeting:**
   - Complete a meeting in Attio
   - Wait for webhook trigger
   - Check Gmail drafts

---

**Last Updated:** January 9, 2026  
**Version:** 1.1.0

