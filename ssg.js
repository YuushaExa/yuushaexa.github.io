const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process'); // Import child_process.exec

const modelsDir = path.join(__dirname, 'models');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');
const srcDir = path.join(__dirname, 'src'); // Path to your source directory

// Helper functions (same as before)
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

// Load partials (including header.html)
async function loadPartials() {
  const partialFiles = {
    base: 'base.html',
    head: 'head.html',
    header: 'header.html',
    footer: 'footer.html',
    aside: 'aside.html',
    index: 'index.html',
    404: '404.html', // Add 404.html to be loaded
  };
  const partials = {};

  const promises = Object.entries(partialFiles).map(async ([key, fileName]) => {
    const filePath = path.join(partialsDir, fileName);
    try {
      partials[key] = await readFile(filePath);
    } catch (err) {
      throw new Error(`Error loading partial ${fileName}: ${err.message}`);
    }
  });

  await Promise.all(promises);
  return partials;
}

// Function to wrap model content with base and partials (same as before)
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

// Process models and generate pages (same as before)
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

// Generate index.html (same as before)
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
    const notFoundContent = partials['404']; // Get content from partials
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

// Main function to run the SSG (updated to build and copy CodeMirror bundle)
async function runSSG() {
  try {
    await ensureDirectoryExists(publicDir);

    // Build CodeMirror bundle using the npm script
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
