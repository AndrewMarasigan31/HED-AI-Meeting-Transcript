import zipfile
import os

source_dir = 'deploy-temp'
output_zip = 'deploy.zip'

# Remove existing zip
if os.path.exists(output_zip):
    os.remove(output_zip)

# Create ZIP
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, source_dir).replace('\\', '/')
            zipf.write(file_path, arcname)

# Get size
size_kb = os.path.getsize(output_zip) / 1024
print(f'Created deploy.zip: {size_kb:.2f} KB')


