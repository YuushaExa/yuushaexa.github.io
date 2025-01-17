import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = path.join(__dirname);

const modelsDir = path.join(__dirname, 'models');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');
const srcDir = path.join(__dirname, 'src');

// Helper functions
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Error reading file ${filePath}: ${err.message}`);
  }
}

async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (err) {
    throw new Error(`Error writing file ${filePath}: ${err.message}`);
  }
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw new Error(`Error creating directory ${dirPath}: ${err.message}`);
    }
  }
}

// Load partials
async function loadPartials() {
  const partialFiles = {
    base: 'base.html',
    head: 'head.html',
    header: 'header.html',
    footer: 'footer.html',
    aside: 'aside.html',
    index: 'index.html',
    404: '404.html',
  };
  const partials = {};

  const promises = Object.entries(partialFiles).map(
    async ([key, fileName]) => {
      const filePath = path.join(partialsDir, fileName);
      try {
        partials[key] = await readFile(filePath);
      } catch (err) {
        throw new Error(`Error loading partial ${fileName}: ${err.message}`);
      }
    }
  );

  await Promise.all(promises);
  return partials;
}

// Function to wrap model content with base and partials
async function createFullPage(partials, modelContent) {
  const baseTemplate = partials.base;
  try {
    return baseTemplate
      .replace('{{head}}', partials.head)
      .replace('{{header}}', partials.header)
      .replace('{{main}}', modelContent)
      .replace('{{footer}}', partials.footer)
      .replace('{{aside}}', partials.aside);
  } catch (err) {
    throw new Error(`Error creating full page: ${err.message}`);
  }
}

// Process models and generate pages
async function processModels(partials) {
  try {
    const modelFiles = await fs.readdir(modelsDir);

    const promises = modelFiles.map(async modelFile => {
      const modelFilePath = path.join(modelsDir, modelFile);
      const modelContent = await readFile(modelFilePath);

      const outputContent = await createFullPage(partials, modelContent);

      const outputFileName = modelFile;
      const outputFilePath = path.join(publicDir, outputFileName);
      await writeFile(outputFilePath, outputContent);

      console.log(`Generated: ${outputFileName}`);
    });

    await Promise.all(promises);
  } catch (err) {
    throw new Error(`Error processing models: ${err.message}`);
  }
}

// Generate index.html
async function generateIndex(partials) {
  try {
    const indexOutputContent = await createFullPage(partials, partials.index);
    const indexOutputFilePath = path.join(publicDir, 'index.html');
    await writeFile(indexOutputFilePath, indexOutputContent);
    console.log('Generated: index.html');
  } catch (err) {
    throw new Error(`Error generating index.html: ${err.message}`);
  }
}

// Generate 404.html
async function generate404(partials) {
  try {
    const notFoundContent = partials['404'];
    const notFoundFilePath = path.join(publicDir, '404.html');
    await writeFile(notFoundFilePath, notFoundContent);
    console.log('Generated: 404.html');
  } catch (err) {
    throw new Error(`Error generating 404.html: ${err.message}`);
  }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Main function to run the SSG
async function runSSG() {
  try {
    await ensureDirectoryExists(publicDir);

    console.log('Building CodeMirror bundle...');
    await runCommand('npm run build:codeMirror');
    console.log('CodeMirror bundle built successfully!');

    const partials = await loadPartials();
    await processModels(partials);
    await generateIndex(partials);
    await generate404(partials);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.message);
    process.exit(1);
  }
}

// Run the SSG
runSSG();
