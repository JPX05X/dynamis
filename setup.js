import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { copyFile, mkdir, readdir } = fs;

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function setup() {
  try {
    // Create public directory if it doesn't exist
    const publicDir = path.join(__dirname, 'public');
    await mkdir(publicDir, { recursive: true });

    // Copy client files to public directory
    await copyDir(path.join(__dirname, 'src/client'), publicDir);

    // Create js directory if it doesn't exist
    const jsDir = path.join(publicDir, 'js');
    await mkdir(jsDir, { recursive: true });

    // Copy form handler to js directory
    await copyFile(
      path.join(__dirname, 'src/client/js/form-handler.js'),
      path.join(jsDir, 'form-handler.js')
    );

    console.log('Setup completed successfully!');
    console.log('You can now run the server with: npm start');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

setup();
