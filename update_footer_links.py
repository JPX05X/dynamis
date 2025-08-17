#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_footer_links(html_content):
    """Update footer links in HTML content to use .html extensions."""
    # Pattern to match the Quick Links section in the footer
    quick_links_pattern = r'(<div[^>]*class=[\"\']footer-section[\"\'][^>]*>\s*<h4[^>]*>Quick Links</h4>\s*<ul>\s*<li><a href=\")([^\"]*)(\">Home</a></li>\s*<li><a href=\")([^\"]*)(\">Practice Areas</a></li>\s*<li><a href=\")([^\"]*)(\">Knowledge</a></li>\s*<li><a href=\")([^\"]*)(\">Careers</a></li>\s*<li><a href=\")([^\"]*)(\">Contact</a></li>)'
    
    # Replacement with updated links
    replacement = r'\1index.html\3practice.html\5knowledge.html\7careers.html\9contact.html\10'
    
    # Replace the Quick Links section
    updated_content = re.sub(quick_links_pattern, replacement, html_content, flags=re.IGNORECASE | re.DOTALL)
    
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
                    
                    # Only process files with a footer section
                    if 'footer-section' in content and 'Quick Links' in content:
                        updated_content = update_footer_links(content)
                        
                        # Write back only if changes were made
                        if updated_content != content:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(updated_content)
                            print(f"Updated: {file_path}")
                        else:
                            print(f"No changes needed: {file_path}")
                    else:
                        print(f"Skipped (no footer section found): {file_path}")
                        
                except Exception as e:
                    print(f"Error processing {file_path}: {str(e)}")

def main():
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Starting to update footer links...")
    process_html_files(script_dir)
    print("Update completed!")

if __name__ == "__main__":
    main()
