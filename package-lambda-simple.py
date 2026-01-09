#!/usr/bin/env python3

import zipfile
import os
import shutil

print('\n📦 Creating Lambda package (simple & complete)...\n')

# Clean up
if os.path.exists('lambda-package.zip'):
    os.remove('lambda-package.zip')
    print('🧹 Removed old package')

# Files to exclude (keep minimal)
exclude_items = {
    'deploy.zip',
    'lambda-package.zip',
    '.env',
    'credentials.json',
    'gmail-token.json',
    '.git',
    'lambda-temp',
    '__pycache__'
}

print('📦 Creating ZIP (this will take 1-2 minutes)...\n')

with zipfile.ZipFile('lambda-package.zip', 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as zipf:
    file_count = 0
    
    # Add lambda-handler.js and lambda-worker.js
    zipf.write('lambda-handler.js', 'lambda-handler.js')
    print('   ✓ lambda-handler.js')
    file_count += 1
    
    zipf.write('lambda-worker.js', 'lambda-worker.js')
    print('   ✓ lambda-worker.js')
    file_count += 1
    
    # Add src folder (all .js files)
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.js'):
                file_path = os.path.join(root, file)
                zipf.write(file_path, file_path.replace('\\', '/'))
                file_count += 1
    print(f'   ✓ src/ ({file_count} files)')
    
    # Add package.json
    zipf.write('package.json', 'package.json')
    print('   ✓ package.json')
    file_count += 1
    
    # Add ALL of node_modules (no exclusions - this is important!)
    print('   ⏳ Adding node_modules (complete)...')
    nm_count = 0
    nm_start = file_count
    
    for root, dirs, files in os.walk('node_modules'):
        # Remove excluded dirs from dirs list (modifies walk behavior)
        dirs[:] = [d for d in dirs if d not in exclude_items]
        
        for file in files:
            file_path = os.path.join(root, file)
            arc_name = file_path.replace('\\', '/')
            
            # Skip our own excluded files
            if any(excl in arc_name for excl in exclude_items):
                continue
            
            try:
                zipf.write(file_path, arc_name)
                nm_count += 1
                if nm_count % 1000 == 0:
                    print(f'      {nm_count} files...')
            except Exception as e:
                # Skip problematic files but continue
                pass
    
    print(f'   ✓ node_modules/ ({nm_count} files)')
    file_count += nm_count

# Get size
size_mb = os.path.getsize('lambda-package.zip') / (1024 * 1024)

print(f'\n✅ Package complete: lambda-package.zip')
print(f'   Size: {size_mb:.2f} MB')
print(f'   Files: {file_count}')
print('\nReady to upload to Lambda!')

