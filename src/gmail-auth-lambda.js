/**
 * Gmail OAuth for AWS Lambda
 * Uses S3 for token storage instead of local files
 */

import { google } from 'googleapis';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'attio-webhook-storage';
const TOKEN_KEY = 'gmail-token.json';
const CREDENTIALS_KEY = 'credentials.json';

// Load credentials from S3
async function loadCredentials() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: CREDENTIALS_KEY
    });
    
    const response = await s3Client.send(command);
    const data = await response.Body.transformToString();
    const credentials = JSON.parse(data);
    
    return credentials.installed || credentials.web;
  } catch (error) {
    throw new Error(`Error loading credentials from S3: ${error.message}`);
  }
}

// Load token from S3
async function loadToken() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: TOKEN_KEY
    });
    
    const response = await s3Client.send(command);
    const data = await response.Body.transformToString();
    return JSON.parse(data);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new Error('Gmail token not found in S3. Please upload gmail-token.json to S3.');
    }
    throw new Error(`Error loading token from S3: ${error.message}`);
  }
}

// Save token to S3
async function saveToken(token) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: TOKEN_KEY,
      Body: JSON.stringify(token, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log(`✅ Token saved to S3: s3://${BUCKET_NAME}/${TOKEN_KEY}`);
  } catch (error) {
    console.error(`❌ Error saving token to S3: ${error.message}`);
    throw error;
  }
}

// Refresh token if expired
async function refreshToken(oauth2Client, token) {
  console.log('🔄 Token expiring, refreshing...');
  
  oauth2Client.setCredentials(token);
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await saveToken(credentials);
    console.log('✅ Token refreshed');
    return credentials;
  } catch (error) {
    throw new Error(`Error refreshing token: ${error.message}`);
  }
}

// Main authorization function
export async function authorize() {
  const credentials = await loadCredentials();
  
  const { client_secret, client_id, redirect_uris } = credentials;
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  let token = await loadToken();

  // Check if token is expired
  const expiryDate = token.expiry_date;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (!expiryDate || expiryDate - now < fiveMinutes) {
    token = await refreshToken(oauth2Client, token);
  }

  oauth2Client.setCredentials(token);
  return oauth2Client;
}

// Get Gmail client
export async function getGmailClient() {
  const auth = await authorize();
  return google.gmail({ version: 'v1', auth });
}

