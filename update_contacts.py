#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_contact_info(html_content):
    """Update contact information in HTML content."""
    # Pattern to match the contact section
    contact_pattern = (
        r'(<div[^>]*class=["\']footer-section["\'][^>]*>\s*<h4[^>]*>Contact Us</h4>\s*)'
        r'(<p[^>]*>Email:[^<]*</p>\s*)'
        r'(<p[^>]*>Phone:[^<]*</p>\s*'
        r'(?:<p[^>]*>Phone:[^<]*</p>\s*)*)'
    )
    
    # Replacement with new contact info
    replacement = (
        r'\1'
        r'<p>Email: <a href="mailto:info@thegreatrecovery.it.com">info@thegreatrecovery.it.com</a></p>\n'
        r'        <p>Phone: <a href="tel:+13604214139">+1 360-421-4139</a></p>\n'
        r'        <p>Phone: <a href="tel:+13372594088">+1 (337) 259-4088</a></p>\n'
        r'        <p>Phone: <a href="tel:+17702829550">+1 (770) 282-9550</a></p>\n'
    )
    
    # Replace the contact section
    updated_content = re.sub(contact_pattern, replacement, html_content, flags=re.IGNORECASE | re.DOTALL)
    
    return updated_content

def process_html_files(directory):
    """Process all HTML files in the given directory and its subdirectories."""
    # Skip node_modules and other non-essential directories
    skip_dirs = {'node_modules', '.git', '__pycache__', 'server'}
    
    # Get all HTML files in the directory and subdirectories
    for root, dirs, files in os.walk(directory):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Skip if no contact section found
                    if 'Contact Us' in content and 'footer-section' in content:
                        updated_content = update_contact_info(content)
                        
                        # Write back only if changes were made
                        if updated_content != content:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(updated_content)
                            print(f"Updated: {file_path}")
                        else:
                            print(f"No changes needed: {file_path}")
                    else:
                        print(f"Skipped (no contact section found): {file_path}")
                        
                except Exception as e:
                    print(f"Error processing {file_path}: {str(e)}")

def main():
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Starting to update contact information...")
    process_html_files(script_dir)
    print("Update completed!")

if __name__ == "__main__":
    main()
