const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'model');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

// Helper functions
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Ensure the public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Load partials (excluding main.html)
const partials = {
  base: readFile(path.join(partialsDir, 'base.html')),
  head: readFile(path.join(partialsDir, 'head.html')),
  footer: readFile(path.join(partialsDir, 'footer.html')),
  aside: readFile(path.join(partialsDir, 'aside.html')),
  index: readFile(path.join(partialsDir, 'index.html')),
};

// Function to wrap model content with base and partials
function createFullPage(modelContent) {
  const baseTemplate = partials.base;
  const fullPage = baseTemplate
    .replace('{{head}}', partials.head)
    .replace('{{main}}', modelContent) // Treat model content as main
    .replace('{{footer}}', partials.footer)
    .replace('{{aside}}', partials.aside);

  return fullPage;
}

// Process models and generate pages
fs.readdir(modelsDir, (err, modelFiles) => {
  if (err) {
    console.error('Error reading models directory:', err);
    return;
  }

  modelFiles.forEach(modelFile => {
    const modelFilePath = path.join(modelsDir, modelFile);
    const modelContent = readFile(modelFilePath);

    // Create a full page using the model content
    const outputContent = createFullPage(modelContent);

    // Write the generated HTML to the public directory
    const outputFileName = modelFile;
    const outputFilePath = path.join(publicDir, outputFileName);
    writeFile(outputFilePath, outputContent);

    console.log(`Generated: ${outputFileName}`);
  });
});

// Generate index.html (using the 'index' partial)
const indexOutputContent = createFullPage(partials.index); // Wrap index partial as a full page
const indexOutputFilePath = path.join(publicDir, 'index.html');
writeFile(indexOutputFilePath, indexOutputContent);
console.log('Generated: index.html');
