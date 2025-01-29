const fs = require('fs').promises;
const path = require('path');

const articlesDir = path.join(__dirname, 'articles');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');
const subforumsDir = path.join(__dirname, 'subforums');

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
async function createFullPage(partials, mainContent, canonicalUrl) {
  const baseTemplate = partials.base;
  try {
    return baseTemplate
      .replace('{{head}}', partials.head)
      .replace('{{header}}', partials.header)
      .replace('{{main}}', mainContent)
      .replace('{{footer}}', partials.footer)
      .replace('{{aside}}', partials.aside)
      .replace('{{canonicalUrl}}', canonicalUrl || '')
      .replace('{{title}}', title || 'Default Title');
  } catch (err) {
    throw new Error(`Error creating full page: ${err.message}`);
  }
}

// Process articles and generate pages
async function processarticles(partials) {
  try {
    const mainFiles = await fs.readdir(articlesDir);

    const promises = mainFiles.map(async mainFile => {
      const mainFilePath = path.join(articlesDir, mainFile);
      const mainContent = await readFile(mainFilePath);

      const outputContent = await createFullPage(partials, mainContent);

      const outputFileName = mainFile;
      const outputFilePath = path.join(publicDir, outputFileName);
      await writeFile(outputFilePath, outputContent);

      console.log(`Generated: ${outputFileName}`);
    });

    await Promise.all(promises);
  } catch (err) {
    throw new Error(`Error processing articles: ${err.message}`);
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

// Load subforums
async function loadSubforums() {
  const subforums = {};
  try {
    const files = await fs.readdir(subforumsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    await Promise.all(jsonFiles.map(async file => {
      const key = path.basename(file, '.json');
      const filePath = path.join(subforumsDir, file);
      const content = await readFile(filePath);
      subforums[key] = JSON.parse(content);
    }));
  } catch (err) {
    throw new Error(`Error loading subforums: ${err.message}`);
  }
  return subforums;
}

// Generate subforum and post pages
async function generateSubforumPages(partials, subforums) {
  try {
    await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
      // Generate the subforum page
      const subforumContent = `
        <h1>${subforum.title}</h1>
        <p>${subforum.description}</p>
        <ul>
          ${subforum.posts.map(post => `
            <li>
              <a href="${post.link}">${post.title}</a> by ${post.author} on ${post.date}
            </li>
          `).join('')}
        </ul>
      `;
      const subforumCanonicalUrl = `https://yuushaexa.github.io/${key}`;
      const subforumOutputContent = await createFullPage(
        partials,
        subforumContent,
        subforumCanonicalUrl,
        subforum.title // Pass the subforum title
      );
      const subforumOutputFilePath = path.join(publicDir, key, 'index.html');
      await writeFile(subforumOutputFilePath, subforumOutputContent);
      console.log(`Generated: ${key}/index.html`);

      // Generate individual post pages
      await Promise.all(subforum.posts.map(async post => {
        const postContent = `
          <h1>${post.title}</h1>
          <p>By ${post.author} on ${post.date}</p>
          <div>${post.content}</div>
        `;
        const postCanonicalUrl = `https://yuushaexa.github.io${post.link}`;
        const postOutputContent = await createFullPage(
          partials,
          postContent,
          postCanonicalUrl,
          post.title // Pass the post title
        );
        const postOutputFilePath = path.join(publicDir, post.link.replace(/^\//, ''), 'index.html');
        await writeFile(postOutputFilePath, postOutputContent);
        console.log(`Generated: ${post.link.replace(/^\//, '')}/index.html`);
      }));
    }));
  } catch (err) {
    throw new Error(`Error generating subforum pages: ${err.message}`);
  }
}

// Main function to run the SSG
async function runSSG() {
  try {
    await ensureDirectoryExists(publicDir);
    const partials = await loadPartials();
    const subforums = await loadSubforums();
    await Promise.all([
      processarticles(partials),
      generateIndex(partials),
      generate404(partials),
      generateSubforumPages(partials, subforums),
    ]);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}

// Run the SSG
runSSG();
