#!/usr/bin/env python3

import zipfile
import os
import shutil
from pathlib import Path

print('\n📦 Packaging for AWS Lambda...\n')

# Clean up
print('🧹 Cleaning up previous package...')
if os.path.exists('lambda-package.zip'):
    os.remove('lambda-package.zip')
if os.path.exists('lambda-temp'):
    shutil.rmtree('lambda-temp')

# Create temp directory
print('📁 Creating package directory...')
os.makedirs('lambda-temp')

# Copy files
print('📄 Copying source files...')
files_to_copy = [
    ('lambda-handler.js', 'lambda-handler.js'),
    ('src', 'src'),
    ('package.json', 'package.json')
]

for src, dest in files_to_copy:
    src_path = Path(src)
    dest_path = Path('lambda-temp') / dest
    
    if src_path.is_dir():
        shutil.copytree(src_path, dest_path)
    else:
        shutil.copy2(src_path, dest_path)

# Install dependencies
print('📦 Installing production dependencies...')
print('   (This may take a minute...)\n')
os.system('npm install --production --prefix lambda-temp')

# Files to exclude (reduce size)
exclude_patterns = [
    '__pycache__',
    '.pytest_cache',
    '*.pyc',
    'test',
    'tests',
    'examples',
    'docs',
    '.git',
    '*.md',
    'LICENSE',
    'CHANGELOG',
]

def should_exclude(path):
    """Check if file should be excluded"""
    path_str = path.lower()
    for pattern in exclude_patterns:
        if pattern in path_str:
            return True
    return False

# Create ZIP with ZIP64 support (for large files)
print('\n📦 Creating lambda-package.zip...')
with zipfile.ZipFile('lambda-package.zip', 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as zipf:
    file_count = 0
    for root, dirs, files in os.walk('lambda-temp'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, 'lambda-temp').replace('\\', '/')
            
            # Skip excluded files
            if not should_exclude(arcname):
                zipf.write(file_path, arcname)
                file_count += 1
    
    print(f'   Added {file_count} files')

# Get size
size_mb = os.path.getsize('lambda-package.zip') / (1024 * 1024)

print(f'Package created: lambda-package.zip ({size_mb:.2f} MB)')

# Clean up
print('Cleaning up temp files...')
shutil.rmtree('lambda-temp')

print('\nDone! Ready to upload to AWS Lambda.\n')
print('Next steps:')
print('   1. Go to AWS Lambda console')
print('   2. Upload lambda-package.zip')
print('   3. Test your function\n')

