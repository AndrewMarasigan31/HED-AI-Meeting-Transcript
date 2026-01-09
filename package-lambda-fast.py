#!/usr/bin/env python3

import zipfile
import os
import shutil
from pathlib import Path

print('\n📦 Packaging for AWS Lambda (Fast)...\n')

# Clean up
print('🧹 Cleaning up...')
if os.path.exists('lambda-package.zip'):
    os.remove('lambda-package.zip')

print('📦 Creating lambda-package.zip directly...')

# Files/folders to exclude
exclude_dirs = {
    'node_modules/.cache',
    'lambda-temp',
    '.git',
    '__pycache__',
    'test',
    'tests'
}

exclude_files = {
    'deploy.zip',
    'deploy-base.zip',
    'lambda-package.zip',
    '.env',
    'credentials.json',  # Don't include - will be in S3
    'gmail-token.json',   # Don't include - will be in S3
}

def should_include(path):
    """Check if path should be included in ZIP"""
    path_str = str(path)
    
    # Check excluded directories
    for exc in exclude_dirs:
        if exc in path_str:
            return False
    
    # Check excluded files
    for exc in exclude_files:
        if path_str.endswith(exc):
            return False
    
    return True

# Create ZIP directly from current directory
print('   Adding files...')
file_count = 0

with zipfile.ZipFile('lambda-package.zip', 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as zipf:
    # Add handler
    if os.path.exists('lambda-handler.js'):
        zipf.write('lambda-handler.js', 'lambda-handler.js')
        file_count += 1
        print('   ✓ lambda-handler.js')
    
    # Add src folder
    if os.path.exists('src'):
        for root, dirs, files in os.walk('src'):
            for file in files:
                if file.endswith('.js'):
                    file_path = os.path.join(root, file)
                    arcname = file_path.replace('\\', '/')
                    zipf.write(file_path, arcname)
                    file_count += 1
        print(f'   ✓ src/ ({file_count} files)')
    
    # Add package.json
    if os.path.exists('package.json'):
        zipf.write('package.json', 'package.json')
        file_count += 1
        print('   ✓ package.json')
    
    # Add node_modules (this is the big one)
    print('   ⏳ Adding node_modules (this may take 30 seconds)...')
    nm_count = 0
    if os.path.exists('node_modules'):
        for root, dirs, files in os.walk('node_modules'):
            # Skip excluded dirs
            if not should_include(root):
                continue
                
            for file in files:
                file_path = os.path.join(root, file)
                if should_include(file_path):
                    arcname = file_path.replace('\\', '/')
                    try:
                        zipf.write(file_path, arcname)
                        nm_count += 1
                        if nm_count % 500 == 0:
                            print(f'      {nm_count} files...')
                    except Exception as e:
                        # Skip problematic files
                        pass
        print(f'   ✓ node_modules/ ({nm_count} files)')

# Get size
size_mb = os.path.getsize('lambda-package.zip') / (1024 * 1024)

print(f'\n✅ Package created: lambda-package.zip ({size_mb:.2f} MB)')
print(f'   Total files: {file_count + nm_count}')
print('\nReady to upload to AWS Lambda!')

