# AWS Console Deployment Guide

Deploy your Attio Meeting Notes webhook through the AWS web console (no CLI needed!)

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com
2. **Your Files Ready** - You'll upload a zip file of your code

## Step 1: Prepare Your Deployment Package

### 1.1 Get Environment Variables Ready

Run this to see your environment variables:
```powershell
npm run prepare-aws-env
```

**Save the output** - you'll need it in Step 3!

### 1.2 Create Deployment Zip File

**IMPORTANT**: Zip the **contents** of your project folder, not the folder itself!

1. Open your project folder: `C:\Users\admin\Documents\[HED] AI Meeting Transcript`
2. Select **ALL files and folders** EXCEPT:
   - `node_modules/` (AWS will install this)
   - `.git/`
   - `.env`
   - `credentials.json`
   - `gmail-token.json`
   - `test-*.js` files
   - `*.md` files (except README.md)
   - `attio-transcript-raw.txt`
   - `attio-output-formatted.txt`
3. **Right-click** → **Send to** → **Compressed (zipped) folder**
4. Name it: `attio-webhook.zip`

**What to include:**
- ✅ `package.json`
- ✅ `src/` folder (all .js files)
- ✅ `.ebextensions/` folder
- ✅ `.ebignore` file

**What to exclude:**
- ❌ `node_modules/`
- ❌ `.env`, `credentials.json`, `gmail-token.json`
- ❌ Test files
- ❌ Documentation files

## Step 2: Create Elastic Beanstalk Application

### 2.1 Go to AWS Console

1. Open https://console.aws.amazon.com
2. Sign in with your AWS account
3. In the search bar at top, type: **Elastic Beanstalk**
4. Click **Elastic Beanstalk**

### 2.2 Create Application

1. Click **Create Application** (big orange button)

2. **Application name**: `attio-meeting-formatter`

3. **Platform**:
   - Platform: **Node.js**
   - Platform branch: **Node.js 20 running on 64bit Amazon Linux 2023** (or latest)
   - Platform version: Keep default

4. **Application code**:
   - Select: **Upload your code**
   - Version label: `v1` or `initial`
   - Click **Choose file**
   - Select your `attio-webhook.zip` file

5. **Presets**:
   - Select: **Single instance (free tier eligible)**

6. Click **Next**

### 2.3 Configure Service Access

1. **Service role**: 
   - If first time: Select **Create and use new service role**
   - If exists: Select existing role

2. **EC2 key pair**: 
   - Optional - Select **Proceed without a key pair** (you won't need SSH)

3. **EC2 instance profile**:
   - If first time: Select **Create and use new instance profile**
   - If exists: Select existing profile

4. Click **Next**

### 2.4 Set Up Networking (Optional)

- Keep all defaults
- Click **Next**

### 2.5 Configure Instance

1. **EC2 instance types**: 
   - Select `t2.micro` (free tier) or `t3.micro` ($8/month, better performance)

2. **Monitoring interval**: 5 minutes (default)

3. Click **Next**

### 2.6 Configure Updates, Monitoring and Logging

- Keep all defaults
- Click **Next**

### 2.7 Review

- Review all settings
- Click **Submit**

⏱️ **Wait 5-10 minutes** while AWS creates your environment...

You'll see:
- ✅ Creating environment...
- ✅ Adding instance...
- ✅ Launching application...

## Step 3: Set Environment Variables

Once your environment is **✅ Ok** (green checkmark):

### 3.1 Navigate to Configuration

1. In Elastic Beanstalk dashboard, click your environment name
2. In left sidebar, click **Configuration**
3. Under **Software**, click **Edit**

### 3.2 Add Environment Properties

Scroll down to **Environment properties** section.

Add each key-value pair (use the output from `npm run prepare-aws-env`):

| Property name | Property value |
|---------------|----------------|
| `ATTIO_API_KEY` | Your Attio API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GMAIL_CREDENTIALS` | Your credentials.json (as single line JSON) |
| `GMAIL_TOKEN` | Your gmail-token.json (as single line JSON) |

**⚠️ IMPORTANT**: 
- Copy the ENTIRE JSON string for `GMAIL_CREDENTIALS` and `GMAIL_TOKEN`
- They must be on a **single line** with no extra spaces
- Include the quotes around the JSON

Example:
```
GMAIL_CREDENTIALS='{"installed":{"client_id":"123...","project_id":"myapp",...}}'
GMAIL_TOKEN='{"access_token":"ya29...","refresh_token":"1//...","scope":"...",...}}'
```

### 3.3 Save Configuration

1. Scroll to bottom
2. Click **Apply**
3. ⏱️ Wait 2-3 minutes for environment to update

## Step 4: Get Your Webhook URL

### 4.1 Find Your Application URL

1. Go to your environment dashboard
2. Look at the top - you'll see a URL like:
   ```
   http://attio-webhook-prod.us-east-1.elasticbeanstalk.com
   ```

3. **Change `http` to `https`** (Elastic Beanstalk supports HTTPS automatically)

### 4.2 Your Webhook URL

Your full webhook URL is:
```
https://[YOUR-APP-URL]/webhooks/attio/call-recording-created
```

Example:
```
https://attio-webhook-prod.us-east-1.elasticbeanstalk.com/webhooks/attio/call-recording-created
```

### 4.3 Test the Health Endpoint

Open in your browser:
```
https://[YOUR-APP-URL]/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-12-18T16:40:00.000Z"
}
```

✅ If you see this, your app is running!

## Step 5: Register Webhook with Attio

### 5.1 Go to Attio Webhooks

1. Open https://app.attio.com
2. Go to **Settings** (⚙️ icon bottom left)
3. Click **Webhooks** in left sidebar
4. Click **Create Webhook**

### 5.2 Configure Webhook

1. **Name**: `Meeting Notes to Gmail`
2. **URL**: Paste your webhook URL from Step 4.2
3. **Event types**: 
   - Check ✅ **Call recording created** (`call-recording.created`)
4. **Secret**: Leave blank for now (optional)
5. Click **Create**

## Step 6: Test with Real Meeting!

1. Go to Attio → Meetings
2. Open any existing meeting with a recording
3. Wait 1-2 minutes
4. Check your **Gmail drafts** 📧

You should see a new draft with:
- ✅ Subject: `[Meeting Code] Notes and Actions - DD.MM.YY`
- ✅ Meeting notes, campaign updates, key decisions
- ✅ Actions table
- ✅ Closing and signature

## Monitoring and Troubleshooting

### View Application Logs

1. Go to your Elastic Beanstalk environment
2. In left sidebar, click **Logs**
3. Click **Request Logs** → **Last 100 Lines**
4. Click **Download** when ready
5. Open the log file to see what happened

### Common Issues

**Issue: Environment variables not working**
- Solution: Make sure JSON strings are on a single line with no line breaks
- Re-enter them in Configuration → Software → Environment properties

**Issue: App not starting**
- Check logs for errors
- Verify all environment variables are set correctly
- Make sure `package.json` has `"start": "node src/webhook-server.js"`

**Issue: 502 Bad Gateway**
- App is crashing on startup
- Check logs for detailed error messages
- Verify Node.js version compatibility

**Issue: Gmail authentication fails**
- Verify `GMAIL_CREDENTIALS` and `GMAIL_TOKEN` are valid JSON
- Make sure they're properly formatted as single-line strings
- Test locally first to ensure tokens work

**Issue: Timeouts (504 Gateway Timeout)**
- This shouldn't happen - we configured 300s timeout in `.ebextensions/01_timeout.config`
- Check if the config file was included in your zip
- Verify Claude API is responding

## Updating Your Application

### Method 1: Upload New Version (Console)

1. Zip your updated code (same as Step 1.2)
2. Go to your environment in Elastic Beanstalk
3. Click **Upload and deploy**
4. Choose your new zip file
5. Version label: `v2`, `v3`, etc.
6. Click **Deploy**

### Method 2: Using EB CLI (Faster)

```powershell
eb deploy
```

## Cost Estimate

**Free Tier (12 months)**:
- t2.micro instance: Free
- 750 hours/month included

**After Free Tier**:
- t2.micro: ~$8/month
- t3.micro: ~$8/month (better performance)
- t3.small: ~$16/month (if you need more power)

## Clean Up (Delete Everything)

If you want to delete the app:

1. Go to Elastic Beanstalk
2. Select your environment
3. Click **Actions** → **Terminate environment**
4. Type the environment name to confirm
5. Click **Terminate**

This will delete everything and stop all charges.

## Next Steps

1. ✅ Test with multiple meetings
2. ✅ Monitor logs for any errors
3. ✅ Consider adding a custom domain (optional)
4. ✅ Set up CloudWatch alarms for monitoring (optional)
5. ✅ Configure auto-scaling if needed (optional)

## Support

- AWS Elastic Beanstalk Docs: https://docs.aws.amazon.com/elasticbeanstalk/
- Attio Webhooks Docs: https://docs.attio.com/rest-api/webhook-reference
- Issue? Check logs first: Elastic Beanstalk → Logs → Request Logs

---

🎉 **Congratulations!** Your Attio → Claude → Gmail automation is now live in the cloud!

