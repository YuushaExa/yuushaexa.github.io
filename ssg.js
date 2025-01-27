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
  await fs.mkdir(dirPath, { recursive: true });
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
    if (!partials.base) throw new Error('Base template not found in partials.');
  } catch (err) {
    throw new Error(`Error loading partials: ${err.message}`);
  }
  return partials;
}

// Function to wrap main content with base and partials
async function createFullPage(partials, mainContent) {
  try {
    return partials.base.replace(/\{\{(head|header|footer|aside|main)\}\}/g, (match, key) => {
      if (key === 'main') return mainContent;
      if (!partials[key]) throw new Error(`Partial '${key}' not found.`);
      return partials[key];
    });
  } catch (err) {
    throw new Error(`Error creating full page: ${err.message}`);
  }
}

// Process articles and generate pages
async function processArticles(partials) {
  console.time('processArticles');
  try {
    const mainFiles = (await fs.readdir(articlesDir)).filter(file => file.endsWith('.html'));
    await Promise.all(mainFiles.map(async file => {
      const mainContent = await readFile(path.join(articlesDir, file));
      const outputContent = await createFullPage(partials, mainContent);
      const outputPath = path.join(publicDir, file);
      await writeFile(outputPath, outputContent);
      console.log(`Generated: ${file}`);
    }));
  } catch (err) {
    throw new Error(`Error processing articles: ${err.message}`);
  } finally {
    console.timeEnd('processArticles');
  }
}

// Generate index.html
async function generateIndex(partials) {
  try {
    const indexContent = await createFullPage(partials, partials.index || '');
    await writeFile(path.join(publicDir, 'index.html'), indexContent);
    console.log('Generated: index.html');
  } catch (err) {
    throw new Error(`Error generating index.html: ${err.message}`);
  }
}

// Generate 404.html
async function generate404(partials) {
  try {
    const notFoundContent = await createFullPage(partials, partials['404'] || '');
    await writeFile(path.join(publicDir, '404.html'), notFoundContent);
    console.log('Generated: 404.html');
  } catch (err) {
    throw new Error(`Error generating 404.html: ${err.message}`);
  }
}

// Main function to run the SSG
async function runSSG() {
  console.time('runSSG');
  try {
    await ensureDirectoryExists(publicDir);
    const partials = await loadPartials();
    await processArticles(partials);
    await generateIndex(partials);
    await generate404(partials);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.message);
    process.exit(1);
  } finally {
    console.timeEnd('runSSG');
  }
}

// Run the SSG
runSSG();
