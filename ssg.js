const fs = require('fs').promises;
const path = require('path');

const articlesDir = path.join(__dirname, 'articles');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

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
  const partials = {};
  try {
    const files = await fs.readdir(partialsDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    await Promise.all(htmlFiles.map(async file => {
      const key = path.basename(file, '.html');
      partials[key] = await readFile(path.join(partialsDir, file));
    }));
  } catch (err) {
    throw new Error(`Error loading partials: ${err.message}`);
  }
  return partials;
}

// Function to wrap main content with base and partials
async function createFullPage(partials, mainContent) {
  const baseTemplate = partials.base;
  try {
    return baseTemplate
      .replace('{{head}}', partials.head)
      .replace('{{header}}', partials.header)
      .replace('{{main}}', mainContent)
      .replace('{{footer}}', partials.footer)
      .replace('{{aside}}', partials.aside);
  } catch (err) {
    throw new Error(`Error creating full page: ${err.message}`);
  }
}

// Process articles and generate pages
async function processArticles(partials) {
  console.time('processArticles'); // Start the timer

  try {
    const mainFiles = await fs.readdir(articlesDir);

    await Promise.all(mainFiles.map(async mainFile => {
      const mainFilePath = path.join(articlesDir, mainFile);
      const mainContent = await readFile(mainFilePath);

      const outputContent = await createFullPage(partials, mainContent);

      const outputFileName = mainFile;
      const outputFilePath = path.join(publicDir, outputFileName);
      await writeFile(outputFilePath, outputContent);

      console.log(`Generated: ${outputFileName}`);
    }));
  } catch (err) {
    throw new Error(`Error processing articles: ${err.message}`);
  } finally {
    console.timeEnd('processArticles'); // End the timer and log the duration
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
    const notFoundContent = partials['404']; // Get content from partials
    const notFoundFilePath = path.join(publicDir, '404.html');
    await writeFile(notFoundFilePath, notFoundContent);
    console.log('Generated: 404.html');
  } catch (err) {
    throw new Error(`Error generating 404.html: ${err.message}`);
  }
}

// Main function to run the SSG
async function runSSG() {
  console.time('runSSG'); // Start the timer for the entire SSG process

  try {
    await ensureDirectoryExists(publicDir);
    const partials = await loadPartials();
    await Promise.all([
      processArticles(partials),
      generateIndex(partials),
      generate404(partials)
    ]);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.message);
    process.exit(1);
  } finally {
    console.timeEnd('runSSG'); // End the timer and log the total duration
  }
}

// Run the SSG
runSSG();
