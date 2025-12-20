# 📱 Telegram Notification Setup Guide

## Overview

Get instant Telegram notifications when new meeting recordings are detected!

---

## 🤖 Step 1: Create a Telegram Bot

### 1.1 Open Telegram

- Open Telegram app (mobile or desktop)
- Search for **@BotFather**
- Start a chat with BotFather

### 1.2 Create New Bot

Send this command to BotFather:
```
/newbot
```

### 1.3 Follow the Prompts

1. **Bot Name:** Enter a display name (e.g., "Meeting Notes Bot")
2. **Bot Username:** Enter a unique username ending in "bot" (e.g., "attio_meeting_notes_bot")

### 1.4 Get Your Bot Token

BotFather will reply with a message containing your **bot token**:

```
Done! Congratulations on your new bot...

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

Keep your token secure and store it safely...
```

**Copy this token** - you'll need it later!

---

## 💬 Step 2: Get Your Chat ID

### 2.1 Start a Chat with Your Bot

1. Search for your bot's username in Telegram (e.g., `@attio_meeting_notes_bot`)
2. Click **Start** or send `/start`
3. Send any message to the bot (e.g., "Hello")

### 2.2 Get Your Chat ID

Open this URL in your browser (replace `YOUR_BOT_TOKEN` with your actual token):

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

**Example:**
```
https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyz/getUpdates
```

### 2.3 Find Your Chat ID

Look for the `"chat":{"id":` field in the response:

```json
{
  "ok": true,
  "result": [
    {
      "message": {
        "chat": {
          "id": 123456789,  ← THIS IS YOUR CHAT ID
          "first_name": "Your Name",
          "type": "private"
        }
      }
    }
  ]
}
```

**Copy the chat ID number** (e.g., `123456789`)

---

## ⚙️ Step 3: Add to AWS Environment Variables

### 3.1 Go to AWS Elastic Beanstalk

1. Navigate to your environment
2. Click **Configuration** tab
3. Find **Software** → Click **Edit**
4. Scroll to **Environment properties**

### 3.2 Add Two New Variables

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | Your bot token (e.g., `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`) |
| `TELEGRAM_CHAT_ID` | Your chat ID (e.g., `123456789`) |

### 3.3 Save and Apply

1. Click **Apply** at the bottom
2. Wait ~2-3 minutes for environment to update

---

## 🧪 Step 4: Test the Notification

### Option 1: Test Locally

Create a test file `test-telegram.js`:

```javascript
import { notifyNewRecording } from './notification-client.js';

// Test notification
await notifyNewRecording('test-meeting-123', 'test-recording-456');
console.log('Test complete!');
```

Run:
```bash
node test-telegram.js
```

You should receive a Telegram message instantly!

### Option 2: Wait for Real Meeting

Once deployed to AWS, the notification will automatically fire when a new recording webhook is received.

---

## 📬 What You'll Receive

When a new recording is detected, you'll get an instant Telegram message:

```
🔔 New Meeting Recording

A new meeting recording has been detected and is being processed automatically.

📋 Meeting ID: `meeting-abc-123`
🎙️ Recording ID: `recording-xyz-456`
⏰ Time: 12/19/2025, 3:45:30 PM

📧 Your formatted meeting notes will appear as a Gmail draft in approximately 30-60 seconds.

_Automated notification from Attio Meeting Notes Automation_
```

---

## ✅ Benefits of Telegram vs Email

| Feature | Telegram | Email |
|---------|----------|-------|
| **Speed** | Instant (< 1 sec) | Slower (3-10 sec) |
| **Setup** | Super simple | OAuth2 complexity |
| **Mobile** | Built-in push | Depends on email app |
| **Reliable** | Very high | Can be filtered |
| **Deployment** | Just 2 env vars | Needs credentials JSON |

---

## 🔧 Troubleshooting

### "Telegram not configured" in logs

**Solution:** Make sure you added both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to AWS environment variables.

### "Chat not found" error

**Solution:** Make sure you started a chat with your bot and sent at least one message before testing.

### "Unauthorized" error

**Solution:** Double-check your bot token is correct and hasn't been revoked.

---

## 🚀 Ready to Deploy

Once you've:
1. ✅ Created your Telegram bot
2. ✅ Got your bot token
3. ✅ Got your chat ID
4. ✅ Added environment variables to AWS

You're ready to deploy with Telegram notifications enabled! 📱

