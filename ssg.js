const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

// Helper function to read file contents
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper function to write file contents
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Ensure the public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Load partials
const partials = {
  base: readFile(path.join(partialsDir, 'base.html')),
  head: readFile(path.join(partialsDir, 'head.html')),
  footer: readFile(path.join(partialsDir, 'footer.html')),
  aside: readFile(path.join(partialsDir, 'aside.html')),
  index: readFile(path.join(partialsDir, 'index.html')),
};

// Function to replace placeholders in content with partials
function replacePartials(content, modelContent = '') {
    let replacedContent = content
      .replace('{{head}}', partials.head)
      .replace('{{footer}}', partials.footer)
      .replace('{{aside}}', partials.aside);
  
    if (modelContent) {
      replacedContent = replacedContent.replace('{{content}}', modelContent);
    }
  
    return replacedContent;
  }
  

// 1. Process models and generate pages
fs.readdir(modelsDir, (err, modelFiles) => {
  if (err) {
    console.error('Error reading models directory:', err);
    return;
  }

  modelFiles.forEach(modelFile => {
    const modelFilePath = path.join(modelsDir, modelFile);
    const modelContent = readFile(modelFilePath);

    // Combine base template with model content and partials
    const outputContent = replacePartials(partials.base, modelContent);

    // Write the generated HTML to the public directory
    const outputFileName = modelFile; // Keep the same name as the model file
    const outputFilePath = path.join(publicDir, outputFileName);
    writeFile(outputFilePath, outputContent);

    console.log(`Generated: ${outputFileName}`);
  });
});

// 2. Generate index.html (using the 'index' partial)
const indexOutputContent = replacePartials(partials.index);
const indexOutputFilePath = path.join(publicDir, 'index.html');
writeFile(indexOutputFilePath, indexOutputContent);
console.log('Generated: index.html');
