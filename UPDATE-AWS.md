# 🔧 Quick Fix: Update AWS Deployment

## What Was Wrong?

The AWS Load Balancer does health checks on the **root path** (`/`), but your server was returning a **404 error**. AWS expects a **200 OK** response for health checks.

## What I Fixed?

Added a root path handler that returns 200 OK:

```javascript
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'Attio Meeting Notes Automation',
    version: '1.0.0',
    available_endpoints: [...]
  });
});
```

---

## 🚀 How to Deploy the Fix

### Step 1: Create Deployment ZIP

**Include these files:**
- ✅ `package.json`
- ✅ `src/` folder (all files)
- ✅ `Procfile`
- ✅ `.ebextensions/01_timeout.config`
- ✅ `.ebignore`

**Exclude:**
- ❌ `node_modules/`
- ❌ `.env`
- ❌ `credentials.json`, `gmail-token.json`
- ❌ Test files

### Step 2: Upload to AWS

1. Go to **AWS Elastic Beanstalk** → Your environment
2. Click **"Upload and deploy"** button (top right)
3. Choose your ZIP file
4. Click **"Deploy"**

### Step 3: Wait for Deployment

- Takes ~3-5 minutes
- Health should change from "Severe" → "Ok" (green)
- Check Events tab for "Successfully deployed"

### Step 4: Verify

Test the root endpoint:
```
https://attio-meeting-formatter-env-1.eba-zgrpwenp.ap-southeast-1.elasticbeanstalk.com/
```

Should return:
```json
{
  "status": "ok",
  "service": "Attio Meeting Notes Automation",
  "version": "1.0.0",
  "available_endpoints": [...]
}
```

---

## ✅ After This Fix

- Health checks will pass ✅
- HTTPS will work ✅
- Webhook will continue working ✅
- Notifications will be active (if notification code is included) ✅

---

## 📝 Summary of Changes

**File:** `src/webhook-server.js`

**Change:** Added `app.get('/')` route that returns 200 OK instead of 404

**Impact:** AWS Load Balancer health checks will now pass



