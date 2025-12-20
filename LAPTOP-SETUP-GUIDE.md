# 💻 Laptop Setup Guide

## Quick Overview

This guide will help you set up this project on your laptop after cloning from GitHub.

**Total Time**: ~10-15 minutes

---

## ✅ Prerequisites

Before starting, make sure you have:
- [ ] Node.js installed (v18 or higher)
- [ ] Git installed
- [ ] GitHub account access
- [ ] The following files transferred from your main PC:
  - `credentials.json`
  - `gmail-token.json`
  - `.env` file (or API keys ready to paste)

---

## 📦 Step 1: Clone the Repository

Open your terminal/PowerShell and run:

```bash
# Clone the repository
git clone https://github.com/AndrewMarasigan31/[repo-name].git

# Navigate into the project
cd [repo-name]
```

Replace `[repo-name]` with your actual repository name.

---

## 🔧 Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages from `package.json`.

---

## 🔐 Step 3: Set Up Credentials

You need to add 3 files to the project root (these are gitignored for security):

### 3.1 Create `.env` file

Create a new file named `.env` in the project root:

```bash
# .env
ATTIO_API_KEY=your_attio_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Telegram notifications
# TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
# TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Optional: Webhook configuration
# WEBHOOK_SECRET=your_webhook_secret_here
# PORT=3000
```

**Where to get these values:**
- Copy from your main PC's `.env` file
- Or retrieve from your password manager
- Or check the original setup emails/documentation

### 3.2 Copy `credentials.json`

Copy the `credentials.json` file from your main PC to the project root.

**Transfer methods:**
- USB drive (most secure)
- Encrypted cloud storage (Google Drive, OneDrive)
- Secure messaging app (Signal, WhatsApp - send to yourself)

```
Project Root/
├── credentials.json  ← Place here
├── .env
└── ...
```

### 3.3 Copy `gmail-token.json`

Copy the `gmail-token.json` file from your main PC to the project root.

```
Project Root/
├── credentials.json
├── gmail-token.json  ← Place here
├── .env
└── ...
```

**Alternative:** If you don't want to transfer the token, you can regenerate it:

```bash
npm run gmail-auth
```

This will open a browser window to authenticate with Google and create a new token.

---

## ✅ Step 4: Verify Setup

Run these tests to make sure everything works:

### Test 1: Check Environment Variables

```bash
node -e "require('./src/load-env.js'); console.log('✅ Environment loaded successfully')"
```

### Test 2: Test Gmail Connection

```bash
node test-gmail-format.js
```

Expected output: Should send a test email successfully.

### Test 3: Test Webhook Server

```bash
node test-webhook.js
```

Expected output: Should start the server and show a webhook URL.

---

## 🚀 Step 5: Start Development

You're all set! Here are the common commands:

### Start the webhook server

```bash
npm start
```

Or with auto-restart on file changes:

```bash
npm run dev
```

### Test components individually

```bash
# Test Gmail
node test-gmail-format.js

# Test Attio API
node test-attio-api.js

# Test Telegram notifications
node test-telegram.js

# Test webhook
node test-webhook.js
```

---

## 🔄 Keeping Both Machines in Sync

### On Main PC (after making changes):

```bash
git add .
git commit -m "Your commit message"
git push
```

### On Laptop (to get latest changes):

```bash
git pull
```

**Important:** Your credentials (`.env`, `credentials.json`, `gmail-token.json`) are NOT synced via git. You only need to set them up once on each machine.

---

## 🐛 Troubleshooting

### Problem: `Module not found` errors

**Solution:** Run `npm install` again.

### Problem: `ANTHROPIC_API_KEY is required`

**Solution:** Make sure your `.env` file exists and has all required keys.

### Problem: `Error loading credentials.json`

**Solution:** Verify `credentials.json` is in the project root (same folder as `package.json`).

### Problem: `No token found. Please run: npm run gmail-auth`

**Solution:** Either:
- Copy `gmail-token.json` from your main PC
- Or run `npm run gmail-auth` to generate a new token

### Problem: Gmail authentication fails

**Solution:** 
1. Delete `gmail-token.json`
2. Run `npm run gmail-auth` again
3. Follow the browser authentication flow

---

## 📂 Project Structure (for reference)

```
Project Root/
├── src/
│   ├── webhook-server.js       # Main webhook server
│   ├── gmail-client.js         # Gmail integration
│   ├── attio-client.js         # Attio API client
│   ├── claude-formatter.js     # AI formatting
│   └── ...
├── credentials.json            # Gmail OAuth credentials (gitignored)
├── gmail-token.json            # Gmail OAuth token (gitignored)
├── .env                        # Environment variables (gitignored)
├── package.json                # Dependencies
└── README.md                   # Main documentation
```

---

## 🎯 Quick Checklist

Before you start coding, verify:

- [ ] Repository cloned
- [ ] `npm install` completed
- [ ] `.env` file created with API keys
- [ ] `credentials.json` in project root
- [ ] `gmail-token.json` in project root
- [ ] Test scripts pass successfully
- [ ] Server starts without errors

---

## 📚 Additional Resources

- **Main README**: See `README.md` for project overview
- **AWS Deployment**: See `AWS-DEPLOYMENT-GUIDE.md` if deploying to cloud
- **Gmail Setup**: See `GMAIL-SETUP-GUIDE.md` for detailed Gmail configuration
- **Telegram Setup**: See `TELEGRAM-SETUP-GUIDE.md` for notifications setup

---

## 💡 Pro Tips

1. **Use the same Node version** on both machines (check with `node --version`)
2. **Keep credentials backed up** securely (password manager or encrypted storage)
3. **Test after pulling** changes from git to catch issues early
4. **Don't commit** the `.env` or credential files (they're already in `.gitignore`)

---

## 🆘 Still Having Issues?

If you encounter problems:

1. Check that all files are in the correct locations
2. Verify API keys are valid and not expired
3. Check the terminal output for specific error messages
4. Compare your setup with the main PC to spot differences

---

**Happy Coding!** 🚀

