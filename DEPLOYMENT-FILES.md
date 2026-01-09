# Files to Include in AWS Deployment Zip

## ✅ INCLUDE These Files/Folders:

### Required Files:
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `Procfile`
- ✅ `.ebignore`
- ✅ `README.md` (optional but good to have)

### Source Code:
- ✅ `src/` folder (all files inside):
  - `attio-client.js`
  - `claude-formatter.js`
  - `gmail-auth-setup.js`
  - `gmail-auth.js`
  - `gmail-client.js`
  - `load-env.js`
  - `webhook-server.js`

### Utility Scripts (if you want them available):
- ✅ `check-missing-recordings.js`
- ✅ `list-meetings.js`
- ✅ `process-meeting.js`
- ✅ `process-all-meetings.js`
- ✅ `prepare-aws-env.js`

### Configuration (if exists):
- ✅ `.ebextensions/` folder (if you have one)

---

## ❌ EXCLUDE These Files/Folders:

### Never Include:
- ❌ `node_modules/` (AWS will install dependencies)
- ❌ `.env` (sensitive - use AWS environment variables instead)
- ❌ `credentials.json` (sensitive - use AWS environment variables)
- ❌ `gmail-token.json` (sensitive - use AWS environment variables)

### Documentation (not needed):
- ❌ `*.md` files (except README.md)
  - `AWS-CONSOLE-DEPLOYMENT.md`
  - `WEBHOOK-SETUP.md`
  - `GMAIL-SETUP-GUIDE.md`
  - `attio_api.md`
  - `december-2025-meetings-summary.md`

### Git/IDE:
- ❌ `.git/` folder
- ❌ `.gitignore`
- ❌ `.vscode/`
- ❌ `.idea/`

### Test/Output Files:
- ❌ `test-*.js` files
- ❌ `attio-transcript-raw.txt`
- ❌ `attio-output-formatted.txt`

### Other:
- ❌ `notification-client.js` (if not used by webhook server)

---

## 📦 Quick Checklist:

**Minimum Required:**
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `Procfile`
- [ ] `.ebignore`
- [ ] `src/` folder (all 7 files)

**Recommended:**
- [ ] `README.md`
- [ ] Utility scripts (if you want them)

---

## 🚀 How to Create the Zip:

### Windows (PowerShell):
1. Open your project folder
2. Select these files/folders:
   - `package.json`
   - `package-lock.json`
   - `Procfile`
   - `.ebignore`
   - `README.md` (optional)
   - `src/` folder
   - Utility scripts (optional)
3. Right-click → **Send to** → **Compressed (zipped) folder**
4. Name it: `attio-webhook.zip`

### Or use PowerShell command:
```powershell
# Navigate to your project folder first
Compress-Archive -Path package.json,package-lock.json,Procfile,.ebignore,src,README.md -DestinationPath attio-webhook.zip -Force
```

---

## ⚠️ Important Notes:

1. **Zip the files directly** - Don't zip the folder, zip the files inside
2. **No node_modules** - AWS will run `npm install` automatically
3. **No sensitive files** - `.env`, `credentials.json`, `gmail-token.json` go in AWS environment variables
4. **Check file size** - Should be < 10MB (without node_modules)

