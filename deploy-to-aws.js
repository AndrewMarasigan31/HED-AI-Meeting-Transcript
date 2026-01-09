#!/usr/bin/env node

/**
 * Deploy Script for AWS Elastic Beanstalk
 * 
 * This script helps deploy the updated webhook server with improved JSON handling
 * to AWS Elastic Beanstalk.
 * 
 * Prerequisites:
 * - AWS CLI installed and configured
 * - EB CLI installed (pip install awsebcli)
 * - Git repository initialized
 * 
 * Usage:
 *   node deploy-to-aws.js
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 AWS Elastic Beanstalk Deployment');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    if (output.trim()) {
      console.log(`   ✅ ${output.trim()}`);
    } else {
      console.log(`   ✅ Done`);
    }
    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

// Check prerequisites
console.log('🔍 Checking prerequisites...\n');

if (!existsSync('.git')) {
  console.error('❌ Error: Not a git repository');
  console.error('   Run: git init');
  process.exit(1);
}

if (!existsSync('.elasticbeanstalk/config.yml')) {
  console.error('❌ Error: EB not initialized');
  console.error('   Run: eb init');
  process.exit(1);
}

console.log('✅ Prerequisites met\n');

// Deployment steps
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📦 Preparing Deployment');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const steps = [
  {
    command: 'git add .',
    description: 'Staging changes'
  },
  {
    command: 'git status --short',
    description: 'Checking staged files'
  }
];

let allSuccess = true;
for (const step of steps) {
  if (!runCommand(step.command, step.description)) {
    allSuccess = false;
    break;
  }
}

if (!allSuccess) {
  console.error('\n❌ Preparation failed. Please fix the errors and try again.\n');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 Commit Message');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const commitMessage = 'Fix JSON payload handling and add comprehensive error logging';

console.log(`Commit message: "${commitMessage}"\n`);

if (!runCommand(`git commit -m "${commitMessage}"`, 'Creating commit')) {
  console.log('   ℹ️  No changes to commit or commit failed\n');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Deploying to AWS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📤 Running: eb deploy\n');
console.log('This may take 3-5 minutes...\n');

try {
  execSync('eb deploy', { encoding: 'utf8', stdio: 'inherit' });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Deployment Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Next Steps:');
  console.log('   1. Test the webhook: eb logs --stream');
  console.log('   2. Check health: eb health');
  console.log('   3. View logs: eb logs\n');
  
  console.log('🔗 The webhook URL should now handle JSON payloads correctly\n');
  
} catch (error) {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ Deployment Failed');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.error(`Error: ${error.message}\n`);
  console.error('💡 Troubleshooting:');
  console.error('   1. Check AWS credentials: aws sts get-caller-identity');
  console.error('   2. Verify EB environment: eb list');
  console.error('   3. Check EB status: eb status');
  console.error('   4. View recent logs: eb logs\n');
  process.exit(1);
}

