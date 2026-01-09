# AWS Lambda Setup (Manual - AWS Console Only)

## 🎯 Why Lambda > Elastic Beanstalk

- ✅ **No "code not updating" bugs** - Fresh deploy every time
- ✅ **Simpler** - Just upload ZIP, done
- ✅ **Cheaper** - $1/month vs $15-30/month
- ✅ **Faster** - Deploys in 10 seconds

---

## 📋 **Step-by-Step Setup**

---

## **STEP 1: Prepare Your Computer**

### **1.1 Install AWS SDK**

Open terminal in your project folder:
```bash
cd "C:\Users\admin\Documents\[HED] AI Meeting Transcript"
npm install @aws-sdk/client-s3
```

### **1.2 Create Lambda Package**

Run:
```bash
npm run package-lambda
```

This creates `lambda-package.zip` in your project folder (takes ~1 minute).

---

## **STEP 2: Create S3 Bucket (Gmail Storage)**

### **2.1 Create Bucket**

1. Go to **AWS Console** → Search "S3"
2. Click **"Create bucket"**
3. **Bucket name:** `attio-webhook-storage-YOUR-NAME` (must be globally unique)
4. **Region:** Asia Pacific (Singapore) `ap-southeast-1`
5. **Block all public access:** ✅ Keep checked
6. Click **"Create bucket"**

### **2.2 Upload Gmail Files**

1. Click on your new bucket
2. Click **"Upload"**
3. Click **"Add files"**
4. Select BOTH:
   - `credentials.json`
   - `gmail-token.json`
5. Click **"Upload"**
6. Wait for "Upload succeeded"

---

## **STEP 3: Create Lambda Function**

### **3.1 Create Function**

1. Go to **AWS Console** → Search "Lambda"
2. Click **"Create function"**
3. Select **"Author from scratch"**
4. **Function name:** `attio-webhook-handler`
5. **Runtime:** Node.js 20.x
6. **Architecture:** x86_64
7. Click **"Create function"**

### **3.2 Upload Your Code**

1. In Lambda function page → **"Code"** tab
2. Click **"Upload from"** → **".zip file"**
3. Click **"Upload"** button
4. Select `lambda-package.zip` from your computer
5. Click **"Save"**
6. Wait for "Successfully updated..."

### **3.3 Configure Timeout**

1. Click **"Configuration"** tab
2. Click **"General configuration"** → **"Edit"**
3. **Timeout:** Change to `5 min 0 sec`
4. **Memory:** `512 MB`
5. Click **"Save"**

### **3.4 Add Environment Variables**

1. Still in **"Configuration"** tab
2. Click **"Environment variables"** → **"Edit"**
3. Click **"Add environment variable"** (do this 4 times):

| Key | Value |
|-----|-------|
| `ATTIO_API_KEY` | (paste your Attio API key) |
| `ANTHROPIC_API_KEY` | (paste your Claude API key) |
| `S3_BUCKET_NAME` | `attio-webhook-storage-YOUR-NAME` |
| `AWS_REGION` | `ap-southeast-1` |

4. Click **"Save"**

### **3.5 Add S3 Permissions**

1. Still in **"Configuration"** tab
2. Click **"Permissions"**
3. Under **"Execution role"**, click the role name (opens new tab)
4. Click **"Add permissions"** → **"Create inline policy"**
5. Click **"JSON"** tab
6. Paste this (replace YOUR-NAME with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::attio-webhook-storage-YOUR-NAME/*"
    }
  ]
}
```

7. Click **"Next"**
8. **Policy name:** `S3GmailTokenAccess`
9. Click **"Create policy"**

---

## **STEP 4: Create API Gateway (Public URL)**

### **4.1 Create API**

1. Go to **AWS Console** → Search "API Gateway"
2. Click **"Create API"**
3. Find **"REST API"** (NOT Private) → Click **"Build"**
4. Select **"New API"**
5. **API name:** `attio-webhook-api`
6. **Endpoint Type:** Regional
7. Click **"Create API"**

### **4.2 Create Webhook Endpoint**

1. Click **"Actions"** → **"Create Resource"**
2. **Resource Name:** `webhook`
3. Click **"Create Resource"**

### **4.3 Add POST Method**

1. Select the `/webhook` resource you just created
2. Click **"Actions"** → **"Create Method"**
3. Select **"POST"** from dropdown → Click checkmark ✓
4. **Integration type:** Lambda Function
5. ✅ Check **"Use Lambda Proxy integration"**
6. **Lambda Function:** Type `attio-webhook-handler` (should autocomplete)
7. Click **"Save"**
8. Click **"OK"** on the popup (give permission)

### **4.4 Enable CORS**

1. Select `/webhook` resource
2. Click **"Actions"** → **"Enable CORS"**
3. Keep defaults
4. Click **"Enable CORS and replace existing CORS headers"**
5. Click **"Yes, replace existing values"**

### **4.5 Deploy API**

1. Click **"Actions"** → **"Deploy API"**
2. **Deployment stage:** `[New Stage]`
3. **Stage name:** `prod`
4. Click **"Deploy"**
5. **COPY THE INVOKE URL** at the top (looks like: `https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod`)

---

## **STEP 5: Update Attio Webhook**

1. Go to **Attio** → Settings → Developers → Webhooks
2. Find your `call-recording.created` webhook
3. **Update URL to:** `https://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod/webhook`
4. Click **"Save"**
5. Click **"Test"**
6. ✅ **Should see success!**

---

## **STEP 6: Test Everything**

### **6.1 Test in Attio (Easiest)**

1. Go to Attio webhook settings
2. Click **"Test"** button  
3. ✅ Should see "Test successful"!

### **6.2 View Logs (If Test Fails)**

1. Go back to **Lambda** console
2. Click **"Monitor"** tab
3. Click **"View CloudWatch logs"**
4. Click the latest log stream
5. Look for errors

Common issues:
- "S3 bucket not found" → Check bucket name in environment variables
- "Credentials not found" → Check you uploaded both JSON files to S3
- "API key invalid" → Check environment variables

---

## 🔄 **How to Update Your Code Later**

**When you need to make changes:**

1. Edit your code locally
2. Run in terminal:
   ```bash
   npm run package-lambda
   ```
3. Go to Lambda console → **Code** tab
4. **Upload from** → **.zip file**
5. Select new `lambda-package.zip`
6. Click **"Save"**
7. Done! (Takes 10 seconds vs EB's 10 minutes!)

---

## 📊 **Viewing Logs & Monitoring**

### **See What's Happening:**

1. Lambda console → **"Monitor"** tab
2. **"View CloudWatch logs"** → See all webhook requests
3. Click any log stream → See detailed output

### **Check Performance:**

- **Invocations** → How many webhooks received
- **Duration** → How long each took (should be ~50 seconds)
- **Errors** → Any failures

---

## 💰 **Cost Estimate**

**Assumptions:**
- 100 webhooks/month
- 50 seconds each
- 512 MB memory

**Cost breakdown:**
- **Lambda:** $0.30/month
- **API Gateway:** $0.35/month
- **S3:** $0.02/month
- **CloudWatch Logs:** $0.50/month

**Total: ~$1.17/month** 🎉

vs. Elastic Beanstalk: $15-30/month

---

## ✅ **Advantages Summary**

| Feature | Lambda | Elastic Beanstalk |
|---------|--------|-------------------|
| Deploy Time | 10 seconds | 5-10 minutes |
| "Code not updating" | Never happens | Constant issue |
| Cost | $1/month | $15-30/month |
| Scaling | Automatic | Manual |
| Debugging | CloudWatch logs | Complex |
| Updates | ZIP upload | ZIP + pray |

---

## 🎯 **You're Done!**

After setup:
- ✅ Webhooks work instantly
- ✅ No server management
- ✅ Costs almost nothing
- ✅ Simple updates (just upload ZIP)
- ✅ Never breaks like EB!

**No more Elastic Beanstalk nightmares!** 🎉

