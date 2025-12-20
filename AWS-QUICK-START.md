# AWS Deployment - Quick Start

Follow these steps to deploy to AWS Elastic Beanstalk:

## 1. Install Prerequisites

```powershell
# Install AWS CLI
winget install -e --id Amazon.AWSCLI

# Install EB CLI
pip install awsebcli --upgrade --user

# Verify
aws --version
eb --version
```

## 2. Configure AWS

```powershell
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `us-east-1` or `ap-southeast-2` for Sydney)
- Output format: `json`

## 3. Initialize Elastic Beanstalk

```powershell
cd "C:\Users\admin\Documents\[HED] AI Meeting Transcript"
eb init
```

Select:
- Region (closest to you)
- App name: `attio-meeting-formatter`
- Platform: `Node.js`
- Latest Node version

## 4. Prepare Environment Variables

```powershell
npm run prepare-aws-env
```

This will output commands like:
```powershell
eb setenv ATTIO_API_KEY="..." ANTHROPIC_API_KEY="..." GMAIL_CREDENTIALS='...' GMAIL_TOKEN='...'
```

Copy and run that command!

## 5. Create Environment and Deploy

```powershell
eb create attio-webhook-prod
```

⏱️ Wait 5-10 minutes for deployment...

## 6. Get Your Webhook URL

```powershell
eb status
```

Look for the `CNAME` line, e.g.:
```
CNAME: attio-webhook-prod.us-east-1.elasticbeanstalk.com
```

Your webhook URL is:
```
https://[YOUR-CNAME]/webhooks/attio/call-recording-created
```

## 7. Register with Attio

1. Go to Attio → Settings → Webhooks
2. Create new webhook
3. URL: Paste your webhook URL from step 6
4. Event: `call-recording.created`
5. Save!

## 8. Test It!

Record a meeting in Attio, then check your Gmail drafts! 📧

## Troubleshooting

**Check logs:**
```powershell
eb logs
```

**Redeploy after changes:**
```powershell
eb deploy
```

**Environment variables not set:**
```powershell
eb setenv KEY="value"
```

## Next Steps

- ✅ Test with real meetings
- ✅ Monitor logs for errors
- ✅ Set up custom domain (optional)
- ✅ Configure auto-scaling (if needed)

---

For detailed instructions, see `AWS-DEPLOYMENT-GUIDE.md`




