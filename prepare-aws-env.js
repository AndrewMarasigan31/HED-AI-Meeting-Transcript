import { readFileSync } from 'fs';

console.log('📋 Preparing Environment Variables for AWS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  // Read credentials.json
  const credentials = readFileSync('./credentials.json', 'utf-8');
  const credentialsMinified = JSON.stringify(JSON.parse(credentials));
  
  // Read gmail-token.json
  const token = readFileSync('./gmail-token.json', 'utf-8');
  const tokenMinified = JSON.stringify(JSON.parse(token));
  
  // Read .env file for API keys
  const env = readFileSync('./.env', 'utf-8');
  const attioKey = env.match(/ATTIO_API_KEY=(.+)/)?.[1];
  const anthropicKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1];
  const webhookSecret = env.match(/WEBHOOK_SECRET=(.+)/)?.[1];
  
  console.log('✅ Files loaded successfully\n');
  console.log('Copy and paste these commands to set your AWS environment variables:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('# For EB CLI:');
  let ebCommand = 'eb setenv \\\n';
  ebCommand += `  ATTIO_API_KEY="${attioKey}" \\\n`;
  ebCommand += `  ANTHROPIC_API_KEY="${anthropicKey}" \\\n`;
  ebCommand += `  GMAIL_CREDENTIALS='${credentialsMinified}' \\\n`;
  ebCommand += `  GMAIL_TOKEN='${tokenMinified}'`;
  
  if (webhookSecret) {
    ebCommand += ` \\\n  WEBHOOK_SECRET="${webhookSecret}"`;
  }
  
  console.log(ebCommand);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('# Or set them individually:');
  console.log(`eb setenv ATTIO_API_KEY="${attioKey}"`);
  console.log(`eb setenv ANTHROPIC_API_KEY="${anthropicKey}"`);
  console.log(`eb setenv GMAIL_CREDENTIALS='${credentialsMinified}'`);
  console.log(`eb setenv GMAIL_TOKEN='${tokenMinified}'`);
  
  if (webhookSecret) {
    console.log(`eb setenv WEBHOOK_SECRET="${webhookSecret}"`);
    console.log('\n💡 WEBHOOK_SECRET is optional but recommended for security');
  } else {
    console.log('\n💡 WEBHOOK_SECRET not found in .env (optional - webhook signature verification will be disabled)');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Ready to deploy to AWS!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure you have:');
  console.error('  - credentials.json');
  console.error('  - gmail-token.json');
  console.error('  - .env with ATTIO_API_KEY and ANTHROPIC_API_KEY');
  process.exit(1);
}




