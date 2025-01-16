const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

const modelDir = path.join(__dirname, 'model');
const templateFile = path.join(__dirname, 'template.html');

// Function to ensure directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// 1. Read the Template
const template = fs.readFileSync(templateFile, 'utf-8');

// 2. Determine Output Directory
let outputDir;
if (process.env.GITHUB_WORKSPACE) {
  // GitHub Actions: Use a subdirectory within GITHUB_WORKSPACE
  outputDir = path.join(process.env.GITHUB_WORKSPACE, 'public');
} else if (process.env.RUNNER_TEMP) {
  // Other CI/CD or local environment with RUNNER_TEMP set (e.g. Azure DevOps, GitHub Self-hosted Runners)
  outputDir = path.join(process.env.RUNNER_TEMP, 'public'); 
}
else {
  // Fallback: Local 'public' directory
  outputDir = path.join(__dirname, 'public');
}

ensureDirectoryExists(outputDir);

// 3. Read and Process Markdown Files
fs.readdir(modelDir, (err, files) => {
  if (err) {
    console.error('Error reading model directory:', err);
    process.exit(1);
  }

  for (const file of files.filter(file => path.extname(file) === '.md')) {
    const filePath = path.join(modelDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 4. Extract Front Matter and Parse Markdown
    const { attributes, body } = fm(fileContent);
    const htmlContent = marked.parse(body);

    // 5. Create HTML Output
    let output = template.replace(
      '<!-- Add header content like logo, navigation, etc. -->',
      attributes.title ? `<h1>${attributes.title}</h1>` : '<h1>Page Title'
    );
    output = output.replace(
      '<h2>Main Content Heading</h2>',
      `<h2>${attributes.title || 'Main Content'}</h2>`
    );
    output = output.replace(
      '<p>This is the main content of the page. You can add paragraphs, images, and other elements here.</p>',
      htmlContent
    );

    // 6. Write HTML to the output directory
    const outputFileName = path.basename(file, '.md') + '.html';
    const outputFilePath = path.join(outputDir, outputFileName);
    fs.writeFileSync(outputFilePath, output);

    console.log(`Generated: ${outputFileName} in ${outputFilePath}`);
  }
});
