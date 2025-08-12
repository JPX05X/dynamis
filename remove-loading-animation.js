import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to the CSS and JS files (absolute paths from the root)
const cssPath = '/css/remove-loading-animation.css';
const jsPath = '/js/remove-loading.js';

// Find all HTML files in the project directory
function findHTMLFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      // Skip node_modules and other hidden directories
      findHTMLFiles(filePath, fileList);
    } else if (file.endsWith('.html') && !file.includes('node_modules')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Add CSS and JS to HTML files
function addLoadingRemovalFiles(filePath) {
  let content = readFileSync(filePath, 'utf8');
  
  // Remove any existing CSS/JS to prevent duplicates
  content = content.replace(/<link[^>]*remove-loading-animation\.css[^>]*>\s*/g, '');
  content = content.replace(/<script[^>]*remove-loading\.js[^>]*>[\s\S]*?<\/script>\s*/g, '');
  
  let modified = false;
  
  // Find the head tag and insert our CSS link right after the opening head tag
  const headOpenTag = '<head>';
  if (content.includes(headOpenTag)) {
    const cssLink = `\n  <!-- Remove SquareSpace loading animation -->\n  <link rel="stylesheet" href="${cssPath}" />`;
    content = content.replace(headOpenTag, `${headOpenTag}${cssLink}`);
    modified = true;
  }
  
  // Find the closing head tag and insert our JS right before it
  const headCloseTag = '</head>';
  if (content.includes(headCloseTag)) {
    const jsScript = `
    <script>
      // Remove SquareSpace loading animation script injection
      document.addEventListener('DOMContentLoaded', function() {
        // Add the main loading removal script
        const mainScript = document.createElement('script');
        mainScript.src = '/js/remove-loading.js';
        mainScript.defer = true;
        document.head.appendChild(mainScript);
        
        // Add the targeted DynamisLLP loader removal script
        const dynamisScript = document.createElement('script');
        dynamisScript.src = '/js/remove-dynamis-loader.js';
        dynamisScript.defer = true;
        document.head.appendChild(dynamisScript);
      });
    </script>
    `;
    content = content.replace(headCloseTag, `${jsScript}${headCloseTag}`);
    modified = true;
  }
  
  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No <head> or </head> tag found in: ${filePath}`);
  }
}

// Main execution
const projectDir = __dirname;
const htmlFiles = findHTMLFiles(projectDir);

console.log(`Found ${htmlFiles.length} HTML files`);
for (const file of htmlFiles) {
  try {
    addLoadingRemovalFiles(file);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log('\nProcessing complete!');
