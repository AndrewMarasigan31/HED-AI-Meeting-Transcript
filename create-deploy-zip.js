#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const sourceDir = 'deploy-temp';
const outputZip = 'deploy.zip';

// Remove existing zip
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

// Create output stream
const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for events
output.on('close', () => {
  console.log('✅ deploy.zip created successfully!');
  console.log(`   Total size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log('   Path separators: forward slashes (Linux-compatible)');
  console.log('   Includes: credentials.json + gmail-token.json');
});

archive.on('error', (err) => {
  console.error('❌ Error creating ZIP:', err);
  process.exit(1);
});

// Pipe archive to output file
archive.pipe(output);

// Add directory contents with forward slashes
archive.directory(sourceDir, false);

// Finalize the archive
archive.finalize();

