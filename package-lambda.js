#!/usr/bin/env node

/**
 * Package application for AWS Lambda deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n📦 Packaging for AWS Lambda...\n');

try {
  // Clean up previous package
  console.log('🧹 Cleaning up previous package...');
  if (fs.existsSync('lambda-package.zip')) {
    fs.unlinkSync('lambda-package.zip');
  }
  if (fs.existsSync('lambda-temp')) {
    fs.rmSync('lambda-temp', { recursive: true, force: true });
  }

  // Create temp directory
  console.log('📁 Creating package directory...');
  fs.mkdirSync('lambda-temp');

  // Copy source files
  console.log('📄 Copying source files...');
  const filesToCopy = [
    'lambda-handler.js',
    'src',
    'package.json'
  ];

  for (const file of filesToCopy) {
    const src = path.join(__dirname, file);
    const dest = path.join(__dirname, 'lambda-temp', file);
    
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // Install production dependencies
  console.log('📦 Installing production dependencies...');
  console.log('   (This may take a minute...)\n');
  execSync('npm install --production --prefix lambda-temp', {
    stdio: 'inherit'
  });

  // Create ZIP (platform-specific)
  console.log('\n📦 Creating lambda-package.zip...');
  
  if (process.platform === 'win32') {
    // Windows: Use PowerShell with absolute path
    const tempPath = path.join(__dirname, 'lambda-temp', '*');
    const zipPath = path.join(__dirname, 'lambda-package.zip');
    execSync(
      `powershell -command "Compress-Archive -Path '${tempPath}' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit', cwd: __dirname }
    );
  } else {
    // Linux/Mac: Use zip
    execSync('cd lambda-temp && zip -r ../lambda-package.zip . -q', {
      stdio: 'inherit'
    });
  }

  // Check size
  const stats = fs.statSync('lambda-package.zip');
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n✅ Package created: lambda-package.zip (${sizeMB} MB)`);
  
  // Clean up temp directory
  console.log('🧹 Cleaning up temp files...');
  fs.rmSync('lambda-temp', { recursive: true, force: true });

  console.log('\n🎉 Done! Ready to upload to AWS Lambda.\n');
  console.log('📋 Next steps:');
  console.log('   1. Go to AWS Lambda console');
  console.log('   2. Upload lambda-package.zip');
  console.log('   3. Test your function\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

