const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

const modelDir = path.join(__dirname, 'model');
const templateFile = path.join(__dirname, 'template.html');

// 1. Read the Template
const template = fs.readFileSync(templateFile, 'utf-8');

// 2. Read Markdown Files
fs.readdir(modelDir, async (err, files) => {
  if (err) throw err;

  // Get the runner's temporary directory from environment variable
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) {
    throw new Error('RUNNER_TEMP environment variable not set.');
  }

  // Create the 'public' directory inside the runner's temporary directory
  const tempPublicDir = path.join(runnerTemp, 'public');
  fs.mkdirSync(tempPublicDir, { recursive: true }); // Use recursive for nested directories if needed

  for (const file of files.filter(file => path.extname(file) === '.md')) {
    const filePath = path.join(modelDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 3. Extract Front Matter and Parse Markdown
    const { attributes, body } = fm(fileContent);
    const htmlContent = marked.parse(body);

    // 4. Create HTML Output
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

    // 5. Write HTML to the 'public' directory inside the runner's temporary directory
    const outputFileName = path.basename(file, '.md') + '.html';
    const outputFilePath = path.join(tempPublicDir, outputFileName);
    fs.writeFileSync(outputFilePath, output);

    console.log(`Generated: ${outputFileName} in ${outputFilePath}`);
  }
});
