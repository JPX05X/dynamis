import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of HTML files to update
const htmlFiles = [
  'careers.html',
  'contact.html',
  'home.html',
  'knowledge.html',
  'legal.html',
  'media.html',
  'practice.html',
  'practiceArea/business.html',
  'practiceArea/class.html',
  'practiceArea/crypto.html',
  'practiceArea/finance.html',
  'practiceArea/fintech.html',
  'practiceArea/gov.html',
  'practiceArea/inter.html',
  'practiceArea/real.html',
  'practiceArea/white.html',
  'practiceArea/whiz.html',
  'results.html',
  'talents.html'
];

// CSS link to add
const cssLink = '  <link rel="stylesheet" href="/css/header-styles.css">';

// Function to update a single HTML file
function updateHtmlFile(filePath) {
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already has the CSS link
    if (content.includes('header-styles.css')) {
      console.log(`Skipping ${filePath} - already updated`);
      return;
    }
    
    // Add the CSS link before the closing head tag
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${cssLink}\n  </head>`);
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    } else {
      console.log(`Skipping ${filePath} - no </head> tag found`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process all HTML files
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    updateHtmlFile(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Header update process completed.');
