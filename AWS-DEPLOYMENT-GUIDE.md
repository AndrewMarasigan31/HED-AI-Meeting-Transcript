# AWS Elastic Beanstalk Deployment Guide

## Prerequisites

1. **AWS Account** - Create one at https://aws.amazon.com
2. **AWS CLI** - Install from https://aws.amazon.com/cli/
3. **EB CLI** - Elastic Beanstalk Command Line Interface

## Step 1: Install AWS CLI and EB CLI

### Install AWS CLI (Windows)
```powershell
# Download and run the MSI installer from:
# https://awscli.amazonaws.com/AWSCLIV2.msi

# Or use winget:
winget install -e --id Amazon.AWSCLI
```

### Install EB CLI
```powershell
pip install awsebcli --upgrade --user
```

Verify installation:
```powershell
aws --version
eb --version
```

## Step 2: Configure AWS Credentials

```powershell
aws configure
```

You'll need:
- **AWS Access Key ID** - Get from AWS Console → IAM → Users → Security Credentials
- **AWS Secret Access Key** - Generated with Access Key
- **Default region** - e.g., `us-east-1`, `ap-southeast-2` (Sydney), `us-west-2`
- **Default output format** - `json`

## Step 3: Initialize Elastic Beanstalk Application

From your project directory:

```powershell
eb init
```

Answer the prompts:
1. **Select a region** - Choose closest to you (e.g., `10` for Sydney/ap-southeast-2)
2. **Application name** - Use default: `attio-meeting-formatter`
3. **Platform** - Select `Node.js`
4. **Platform version** - Select latest (e.g., `Node.js 20`)
5. **CodeCommit** - Select `n` (no)
6. **SSH** - Select `y` if you want SSH access (optional)

## Step 4: Create Environment and Deploy

```powershell
eb create attio-webhook-prod
```

This will:
- Create a new environment
- Upload your code
- Install dependencies
- Start the server

**⏱️ This takes 5-10 minutes**

## Step 5: Set Environment Variables

You need to set your API keys as environment variables in AWS:

### Option A: Using EB CLI (Recommended)
```powershell
eb setenv ATTIO_API_KEY="your-attio-api-key-here"
eb setenv ANTHROPIC_API_KEY="your-anthropic-api-key-here"
eb setenv GMAIL_CREDENTIALS='{"installed":{"client_id":"...","project_id":"..."}}'
eb setenv GMAIL_TOKEN='{"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":...}'
```

### Option B: Using AWS Console
1. Go to AWS Console → Elastic Beanstalk → Your Environment
2. Click "Configuration" in left sidebar
3. Under "Software", click "Edit"
4. Scroll to "Environment properties"
5. Add each key-value pair:
   - `ATTIO_API_KEY` = your key
   - `ANTHROPIC_API_KEY` = your key
   - `GMAIL_CREDENTIALS` = paste your `credentials.json` content (as single line)
   - `GMAIL_TOKEN` = paste your `gmail-token.json` content (as single line)
6. Click "Apply"

**⚠️ Important:** The JSON values must be on a single line with no extra whitespace.

## Step 6: Update Gmail Auth to Use Environment Variables

Update `src/gmail-auth.js` to read from environment variables in production:

```javascript
const CREDENTIALS = process.env.GMAIL_CREDENTIALS 
  ? JSON.parse(process.env.GMAIL_CREDENTIALS)
  : JSON.parse(readFileSync('./credentials.json', 'utf-8'));

const TOKEN_PATH = './gmail-token.json';

function loadTokenFromEnv() {
  if (process.env.GMAIL_TOKEN) {
    return JSON.parse(process.env.GMAIL_TOKEN);
  }
  if (existsSync(TOKEN_PATH)) {
    return JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
  }
  return null;
}
```

## Step 7: Get Your Webhook URL

```powershell
eb status
```

Look for:
```
CNAME: attio-webhook-prod.us-east-1.elasticbeanstalk.com
```

Your webhook URL will be:
```
https://attio-webhook-prod.us-east-1.elasticbeanstalk.com/webhooks/attio/call-recording-created
```

Test the health endpoint:
```powershell
curl https://attio-webhook-prod.us-east-1.elasticbeanstalk.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-18T16:40:00.000Z"
}
```

## Step 8: Register Webhook with Attio

1. Go to Attio Settings → Webhooks → Create Webhook
2. **URL**: Paste your Elastic Beanstalk URL from Step 7
3. **Event**: Select `call-recording.created`
4. **Secret** (optional): Leave blank for now
5. Click "Create"

## Step 9: Test with Real Meeting

1. Record a meeting in Attio (or trigger an existing one)
2. Check Gmail drafts - a new draft should appear!
3. Monitor logs: `eb logs`

## Useful Commands

### View Application Logs
```powershell
eb logs
```

### Check Application Status
```powershell
eb status
```

### Redeploy After Code Changes
```powershell
eb deploy
```

### Open Application in Browser
```powershell
eb open
```

### SSH into Server (if enabled)
```powershell
eb ssh
```

### Terminate Environment (Delete Everything)
```powershell
eb terminate attio-webhook-prod
```

## Cost Estimate

AWS Elastic Beanstalk pricing (Free tier eligible):
- **EC2 Instance**: t2.micro (free tier) or t3.micro (~$8/month)
- **Load Balancer**: Optional, ~$16/month if enabled
- **Data Transfer**: First 100GB free, then $0.09/GB

**Estimated monthly cost**: $0-8 (free tier) or $8-24 (paid)

## Troubleshooting

### Issue: Environment creation fails
- Check AWS service limits in your region
- Try a different region
- Ensure your AWS account is activated

### Issue: Application won't start
- Check logs: `eb logs`
- Verify environment variables are set correctly
- Ensure `package.json` has correct `start` script

### Issue: Timeout errors
- Check `.ebextensions/01_timeout.config` is present
- Increase timeout values if needed

### Issue: Gmail authentication fails
- Verify `GMAIL_CREDENTIALS` and `GMAIL_TOKEN` are valid JSON
- Check environment variables are set correctly
- Test locally first with same credentials

### Issue: Attio webhook not triggering
- Verify webhook URL is registered in Attio
- Check URL is HTTPS (not HTTP)
- Check server logs: `eb logs`
- Test with `curl` to your webhook URL

## Security Best Practices

1. **Never commit secrets** - Keep `.env`, `credentials.json`, `gmail-token.json` in `.gitignore`
2. **Use IAM roles** - Limit permissions for Elastic Beanstalk
3. **Enable HTTPS only** - Elastic Beanstalk provides this by default
4. **Rotate API keys regularly** - Update environment variables when keys change
5. **Monitor logs** - Check for suspicious activity

## Scaling

If you expect high volume:

1. **Enable Auto Scaling**:
   ```powershell
   eb config
   ```
   - Set min instances: 1
   - Set max instances: 5

2. **Use larger instance type**:
   - Change from t2.micro to t3.small or t3.medium

3. **Enable load balancer** (for high availability)

## Support

- AWS Documentation: https://docs.aws.amazon.com/elasticbeanstalk/
- EB CLI Docs: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html
- Attio Webhooks: https://docs.attio.com/rest-api/webhook-reference




