# Gmail API Setup Guide

This guide walks you through setting up Gmail API access for automatic draft creation.

## ✅ Prerequisites

- [x] Google Cloud project created
- [x] Gmail API enabled
- [x] OAuth 2.0 credentials created
- [x] `credentials.json` file in project root

## 🚀 Quick Start

### Step 1: Authorize the Application

Run the authorization script:

```bash
npm run gmail-auth
```

This will:
1. Display a URL in your terminal
2. Open that URL in your browser
3. Ask you to sign in to Google
4. Ask you to authorize the app
5. Give you an authorization code
6. Save the token for future use

### Step 2: Copy the Authorization Code

1. After authorizing, Google will show you a code
2. Copy the entire code
3. Paste it into the terminal when prompted
4. Press Enter

### Step 3: Test Gmail Draft Creation

```bash
npm run test-gmail
```

This will create a test draft in your Gmail. Check your Gmail drafts folder!

## 📁 Files Created

After successful authorization:

- `gmail-token.json` - Your OAuth refresh token (kept secure by .gitignore)

## 🔧 Troubleshooting

### "No token found" error

**Solution**: Run `npm run gmail-auth` first to authorize the app.

### "Error loading credentials.json"

**Solution**: Make sure `credentials.json` exists in the project root.

### "Invalid grant" error

**Solution**: Your token may have expired. Delete `gmail-token.json` and run `npm run gmail-auth` again.

### Authorization code doesn't work

**Solution**: 
- Make sure you copied the ENTIRE code
- Try the authorization process again
- Check that you're using the correct Google account

## 🔐 Security Notes

- `credentials.json` and `gmail-token.json` are in `.gitignore`
- Never commit these files to version control
- The token is automatically refreshed when it expires
- Only the "compose" scope is requested (can only create drafts, not read emails)

## 📚 API Documentation

- [Gmail API - Drafts](https://developers.google.com/gmail/api/guides/drafts)
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)

## ✨ What's Next?

Once Gmail is set up, you can:
1. Test creating drafts with real meeting notes
2. Integrate with the Attio webhook
3. Deploy to cloud for automation

See the main [README.md](README.md) for the complete integration guide.






