import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];
const TOKEN_PATH = join(__dirname, '..', 'gmail-token.json');
const CREDENTIALS_PATH = join(__dirname, '..', 'credentials.json');

function loadCredentials() {
  // In production (AWS), use environment variable
  if (process.env.GMAIL_CREDENTIALS) {
    try {
      return JSON.parse(process.env.GMAIL_CREDENTIALS);
    } catch (error) {
      throw new Error(`Error parsing GMAIL_CREDENTIALS env var: ${error.message}`);
    }
  }
  
  // In development, use credentials.json file
  try {
    const content = readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Error loading credentials.json: ${error.message}`);
  }
}

function loadToken() {
  // In production (AWS), use environment variable
  if (process.env.GMAIL_TOKEN) {
    try {
      return JSON.parse(process.env.GMAIL_TOKEN);
    } catch (error) {
      throw new Error(`Error parsing GMAIL_TOKEN env var: ${error.message}`);
    }
  }
  
  // In development, use gmail-token.json file
  if (existsSync(TOKEN_PATH)) {
    try {
      const content = readFileSync(TOKEN_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Error loading gmail-token.json: ${error.message}`);
    }
  }
  
  return null;
}

function saveToken(tokens) {
  // Don't save to file in production (AWS) - tokens are in env vars
  if (process.env.GMAIL_TOKEN) {
    console.log('⚠️  Production mode: Token not saved to file (using env var)');
    return;
  }
  
  // In development, save to file
  try {
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ Token saved to:', TOKEN_PATH);
  } catch (error) {
    console.error('⚠️  Warning: Could not save token to file:', error.message);
  }
}

export async function authorize() {
  const credentials = loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = loadToken();
  if (token) {
    oAuth2Client.setCredentials(token);
    
    if (oAuth2Client.isTokenExpiring()) {
      console.log('🔄 Token expiring, refreshing...');
      const { credentials: newTokens } = await oAuth2Client.refreshAccessToken();
      oAuth2Client.setCredentials(newTokens);
      saveToken(newTokens);
      console.log('✅ Token refreshed');
    }
    
    return oAuth2Client;
  }

  throw new Error('No token found. Please run: npm run gmail-auth');
}

export async function getNewToken() {
  const credentials = loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Gmail OAuth Authorization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Authorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        saveToken(tokens);
        console.log('✅ Gmail authentication complete!\n');
        
        resolve(oAuth2Client);
      } catch (error) {
        reject(new Error(`Error retrieving access token: ${error.message}`));
      }
    });
  });
}

export async function getGmailClient() {
  const auth = await authorize();
  return google.gmail({ version: 'v1', auth });
}
