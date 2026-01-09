# 🚀 Deploy to AWS Without EB CLI

Since EB CLI is not installed, here's how to deploy the JSON handling fixes to your AWS Elastic Beanstalk environment.

---

## ✅ Changes Already Committed

Your changes have been committed locally:
- ✅ Enhanced webhook server with JSON error handling
- ✅ AWS EB configuration files (.ebextensions)
- ✅ Testing and documentation

**Commit:** `c5e0931` - "Fix JSON payload handling and enhance webhook error logging"

---

## 🔧 Deployment Options

### **Option 1: AWS Console (Recommended - Easiest)**

#### Step 1: Create Deployment Package

```bash
# Create a zip file of the project (excluding node_modules)
git archive -o deploy.zip HEAD
```

Or manually:
1. Create a new folder: `HED-Meeting-Transcript-Deploy`
2. Copy these files/folders:
   - `src/` folder
   - `.ebextensions/` folder
   - `package.json`
   - `Procfile`
   - All `.js` files in root
3. Create a ZIP file of the folder

#### Step 2: Upload to AWS

1. Go to **AWS Elastic Beanstalk Console**
2. Navigate to your environment: `Attio-meeting-formatter-env-1`
3. Click **"Upload and deploy"**
4. Upload the `deploy.zip` file
5. Add version label: `v1.1-json-fixes`
6. Click **Deploy**

#### Step 3: Monitor Deployment

- Wait 3-5 minutes for deployment
- Check **Events** tab for progress
- Once complete, **Health** should be "Ok"

---

### **Option 2: Push to GitHub & Deploy from AWS**

If you have GitHub connected to AWS EB:

```bash
# Push to GitHub (you'll need to authenticate)
git push origin main
```

Then in AWS Console:
1. Go to your EB environment
2. Click **"Application versions"**
3. Select the latest version
4. Click **"Deploy"**

---

### **Option 3: Direct File Upload via SSH (Advanced)**

If you have SSH access to your EC2 instance:

```bash
# SSH into your instance
ssh ec2-user@your-instance-address

# Navigate to app directory
cd /var/app/current

# Pull changes (if git is configured)
git pull origin main

# Restart Node.js app
sudo systemctl restart web
```

---

## 🧪 After Deployment - Verify It's Working

### 1. Check Health
```bash
curl http://Attio-meeting-formatter-env-1.eba-zgrpwenp.ap-southeast-1.elasticbeanstalk.com/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "Attio Meeting Notes Automation",
  "timestamp": "2026-01-09T..."
}
```

### 2. Test JSON Handling
```bash
npm run test-json
```

### 3. Test with Real Meeting
```bash
npm run test-webhook 465a7c11-cc85-455e-b586-433dd8bb87e1 eec7b78d-1004-48a4-89f1-de8d0280a17e
```

### 4. Check AWS Logs

In AWS Console:
- Go to your EB environment
- Click **"Logs"**
- Click **"Request Logs"** → **"Last 100 Lines"**
- Look for new logging output

---

## 📦 Quick Deployment Package Creation

Run this PowerShell command to create a deployment ZIP:

```powershell
# Create deployment package (excludes node_modules, .git, etc.)
Compress-Archive -Path `
  src,`
  .ebextensions,`
  package.json,`
  Procfile,`
  *.js `
  -DestinationPath deploy.zip -Force

Write-Host "✅ deploy.zip created - Upload this to AWS EB Console"
```

---

## 🎯 What to Look For After Deployment

### In AWS Logs (EB Console → Logs):

**Before deployment:**
```
(No detailed logging)
```

**After deployment (success indicators):**
```
📥 Incoming Request
   Method: POST
   Path: /webhooks/attio/call-recording-created
   Content-Type: application/json

📨 Webhook Received: call-recording.created
   Payload: {...}

✅ Meeting retrieved: "Meeting Title"
✅ Gmail draft created successfully!
```

### Error Handling (should now work):                                                                                                                                                                                                                                                                                                                                                           
```
❌ JSON Parse Error
   Error: Unexpected token...
   
🔴 Invalid JSON payload
   Request body must be valid JSON
```

---

## 🔍 Troubleshooting Deployment

### Issue: Deployment Fails

**Check:**
1. **Environment Health**: Should be "Ok" or "Warning" before deploying
2. **Logs**: Check for errors in deployment logs
3. **Configuration**: Verify `.ebextensions/` files are included

### Issue: Can't Access AWS Console

**Alternative:** Use AWS CLI (if installed):

```bash
aws elasticbeanstalk create-application-version `
  --application-name Attio-meeting-formatter `
  --version-label v1.1-json-fixes `
  --source-bundle S3Bucket="your-bucket",S3Key="deploy.zip"

aws elasticbeanstalk update-environment `
  --environment-name Attio-meeting-formatter-env-1 `
  --version-label v1.1-json-fixes
```

### Issue: Webhook Still Shows JSON Error

**After deployment:**
1. Wait 2-3 minutes for full deployment
2. Test with: `npm run test-json`
3. Check AWS logs for the new error handling
4. Verify `.ebextensions/` folder was deployed (check logs for "executing config")

---

## 🆘 If You Need Help

**Current Status:**
- ✅ Code changes committed locally
- ✅ Ready to deploy
- ⏳ Waiting for AWS deployment

**What You Need:**
- Access to AWS Elastic Beanstalk Console
- OR: AWS CLI configured
- OR: SSH access to EC2 instance

---

## 📝 Quick Checklist

- [ ] Create deployment ZIP file
- [ ] Upload to AWS EB Console
- [ ] Wait for deployment (3-5 min)
- [ ] Check environment health
- [ ] Run `npm run test-json`
- [ ] Test with real meeting
- [ ] Verify logs show new error handling
- [ ] Check Gmail draft creation works

---

## 💡 Recommended: Install EB CLI for Future

To make future deployments easier:

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB in your project
eb init

# Configure your existing environment
eb use Attio-meeting-formatter-env-1

# Future deployments become one command:
eb deploy
```

---

**Ready to deploy!** Use Option 1 (AWS Console) - it's the easiest without EB CLI installed.

Let me know once deployed and I'll help you verify everything is working! 🚀

