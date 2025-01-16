const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

// Helper functions (same as before)
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

// Load partials (including main.html)
const partials = {
  base: readFile(path.join(partialsDir, 'base.html')),
  head: readFile(path.join(partialsDir, 'head.html')),
  footer: readFile(path.join(partialsDir, 'footer.html')),
  aside: readFile(path.join(partialsDir, 'aside.html')),
  main: readFile(path.join(partialsDir, 'main.html')), // Load main.html
  index: readFile(path.join(partialsDir, 'index.html')),
};

// Updated function to replace placeholders, now using main.html
function replacePartials(content, modelContent = '') {
  let replacedContent = content
    .replace('{{head}}', partials.head)
    .replace('{{footer}}', partials.footer)
    .replace('{{aside}}', partials.aside);

  // Replace {{content}} in main.html with model content 
  if (modelContent) {
    const mainContent = partials.main.replace('{{content}}', modelContent);
    replacedContent = replacedContent.replace('{{main}}', mainContent);
  } else {
    replacedContent = replacedContent.replace('{{main}}', '');
  }

  return replacedContent;
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

    // Combine base, main (with model content), and other partials
    const outputContent = replacePartials(partials.base, modelContent);

    // Write the generated HTML to the public directory
    const outputFileName = modelFile;
    const outputFilePath = path.join(publicDir, outputFileName);
    writeFile(outputFilePath, outputContent);

    console.log(`Generated: ${outputFileName}`);
  });
});

// Generate index.html (using the 'index' partial)
const indexOutputContent = replacePartials(partials.index);
const indexOutputFilePath = path.join(publicDir, 'index.html');
writeFile(indexOutputFilePath, indexOutputContent);
console.log('Generated: index.html');
