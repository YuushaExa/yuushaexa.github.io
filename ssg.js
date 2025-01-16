const fs = require('fs').promises; // Use fs.promises for async/await
const path = require('path');

const modelsDir = path.join(__dirname, 'model');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

// Helper functions (now asynchronous)
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
      await fs.mkdir(dirPath, { recursive: true }); // Create directory if it doesn't exist
    } catch (err) {
      if (err.code !== 'EEXIST') {
        // Ignore error if directory already exists
        throw new Error(`Error creating directory ${dirPath}: ${err.message}`);
      }
    }
  }

// Load partials (now asynchronous)
async function loadPartials() {
  const partialFiles = {
    base: 'base.html',
    head: 'head.html',
    footer: 'footer.html',
    aside: 'aside.html',
    index: 'index.html',
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

// Function to wrap model content with base and partials (now asynchronous)
async function createFullPage(partials, modelContent) {
  const baseTemplate = partials.base;
  try {
    return baseTemplate
      .replace('{{head}}', partials.head)
      .replace('{{main}}', modelContent)
      .replace('{{footer}}', partials.footer)
      .replace('{{aside}}', partials.aside);
  } catch (err) {
    throw new Error(`Error creating full page: ${err.message}`);
  }
}

// Process models and generate pages (now asynchronous)
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

// Generate index.html (now asynchronous)
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

// Main function to run the SSG (now asynchronous)
async function runSSG() {
  try {
    await ensureDirectoryExists(publicDir); // Create public directory if it doesn't exist
    const partials = await loadPartials();
    await processModels(partials);
    await generateIndex(partials);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.message);
    process.exit(1); // Exit with a non-zero code to indicate failure
  }
}

// Run the SSG
runSSG();
