const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

const modelDir = path.join(__dirname, 'model');
const outputDir = path.join(__dirname, ''); // Output to the root directory
const templateFile = path.join(__dirname, 'template.html');

// 1. Read the Template
const template = fs.readFileSync(templateFile, 'utf-8');

// 2. Read Markdown Files
fs.readdir(modelDir, (err, files) => {
  if (err) throw err;

  files
    .filter(file => path.extname(file) === '.md')
    .forEach(file => {
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

      // 5. Write HTML to Output Directory
      const outputFileName = path.basename(file, '.md') + '.html';
      const outputFilePath = path.join(outputDir, outputFileName);
      fs.writeFileSync(outputFilePath, output);

      console.log(`Generated: ${outputFileName}`);
    });
});
