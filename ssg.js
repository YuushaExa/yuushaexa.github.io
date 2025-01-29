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
async function createFullPage(partials, mainContent, canonicalUrl, title) {
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
    const indexOutputContent = partials['index'];
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
  // Helper function to create standardized page paths
  const resolvePagePath = (basePath, urlPath) => 
    path.join(basePath, ...urlPath.split('/').filter(Boolean)) + '.html';

  // HTML content generators
  const createSubforumContent = (subforum) => `
    <h1>${subforum.title}</h1>
    <p>${subforum.description}</p>
    <ul>
      ${subforum.posts.map(post => `
        <li>
          <a href="${post.link}.html">${post.title}</a> 
          by ${post.author} on ${post.date}
        </li>
      `).join('')}
    </ul>
  `;

  const createPostContent = (post) => `
    <h1>${post.title}</h1>
    <p>By ${post.author} on ${post.date}</p>
    <div>${post.content}</div>
  `;

  // Unified page generation function
  const generatePage = async (content, canonicalUrl, title) => 
    createFullPage(partials, content, canonicalUrl, title);

  try {
    await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
      try {
        // Generate subforum page
        const subforumCanonical = `https://yuushaexa.github.io/${key}.html`;
        const subforumContent = createSubforumContent(subforum);
        const subforumPage = await generatePage(subforumContent, subforumCanonical, subforum.title);
        const subforumPath = path.join(publicDir, `${key}.html`);
        await fs.promises.writeFile(subforumPath, subforumPage);
        console.log(`Generated subforum: ${key}.html`);

        // Generate post pages
        await Promise.all(subforum.posts.map(async post => {
          try {
            const postCanonical = `https://yuushaexa.github.io${post.link}.html`;
            const postContent = createPostContent(post);
            const postPage = await generatePage(postContent, postCanonical, post.title);
            const postPath = resolvePagePath(publicDir, post.link);
            
            await fs.promises.mkdir(path.dirname(postPath), { recursive: true });
            await fs.promises.writeFile(postPath, postPage);
            console.log(`Generated post: ${path.relative(publicDir, postPath)}`);
          } catch (err) {
            throw new Error(`Failed to generate post ${post.title}: ${err.message}`);
          }
        }));
      } catch (err) {
        throw new Error(`Failed to process subforum ${key}: ${err.message}`);
      }
    }));
  } catch (err) {
    throw new Error(`Page generation error: ${err.message}`);
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
