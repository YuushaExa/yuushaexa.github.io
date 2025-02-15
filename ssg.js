const fs = require('fs').promises;
const path = require('path');
const templates = require('./templates');
const baseurl = 'https://yuushaexa.github.io/'; // You can change this to any base URL

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

// Helper functions
async function readFile(filePath) {
  console.time(`readFile ${filePath}`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.timeEnd(`readFile ${filePath}`);
    return content;
  } catch (err) {
    console.timeEnd(`readFile ${filePath}`);
    throw new Error(`Error reading file ${filePath}: ${err.message}`);
  }
}

async function writeFile(filePath, content) {
  console.time(`writeFile ${filePath}`);
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.timeEnd(`writeFile ${filePath}`);
  } catch (err) {
    console.timeEnd(`writeFile ${filePath}`);
    throw new Error(`Error writing file ${filePath}: ${err.message}`);
  }
}

async function ensureDirectoryExists(dirPath) {
  console.time(`ensureDirectoryExists ${dirPath}`);
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.timeEnd(`ensureDirectoryExists ${dirPath}`);
  } catch (err) {
    console.timeEnd(`ensureDirectoryExists ${dirPath}`);
    if (err.code !== 'EEXIST') throw err;
  }
}

async function loadFilesFromDir(dirPath, fileType, transform = (data) => data) {
  console.time(`loadFilesFromDir ${dirPath}`);
  try {
    const files = await fs.readdir(dirPath);
    const matchingFiles = files.filter(file => file.endsWith(fileType));
    const fileContents = await Promise.all(matchingFiles.map(async file => {
      const content = await readFile(path.join(dirPath, file));
      return { key: path.basename(file, fileType), content: transform(content) };
    }));
    console.timeEnd(`loadFilesFromDir ${dirPath}`);
    return fileContents.reduce((acc, { key, content }) => ({ ...acc, [key]: content }), {});
  } catch (err) {
    console.timeEnd(`loadFilesFromDir ${dirPath}`);
    throw new Error(`Error loading files from ${dirPath}: ${err.message}`);
  }
}

async function loadSubforumData(subforum, subforumKey) {
  if (!subforum.data) return [];

  const dataFiles = Array.isArray(subforum.data) ? subforum.data : [subforum.data];
  const template = templates[subforum.template];

  const posts = await Promise.all(dataFiles.map(async (file) => {
    console.time(`loadSubforumData ${file}`);
    try {
      let content;
      if (file.startsWith('http://') || file.startsWith('https://')) {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
        content = await response.text();
      } else {
        const filePath = path.join(dirs.subforums, file);
        content = await readFile(filePath);
      }

      const parsedPosts = JSON.parse(content);

      console.timeEnd(`loadSubforumData ${file}`);
      return parsedPosts.map(post => ({
        ...post,
        title: post.title || 'Default Title',
        link: post.link || template.generatePostLink(subforumKey, post) 
      }));
    } catch (err) {
      console.timeEnd(`loadSubforumData ${file}`);
      console.error(`Error loading data from ${file}:`, err.message);
      return [];
    }
  }));

  return posts.flat();
}

async function createFullPage(partials, mainContent, canonicalUrl = '', title = 'Default Title', description = '', image = '') {
  console.time(`createFullPage ${title}`);
  // Replace placeholders in the head template
  const headContent = (partials.head || '')
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{image}}/g, image);

  // Replace placeholders in the base template
  const fullPage = partials.base
    .replace(/{{head}}/g, headContent)
    .replace(/{{header}}/g, partials.header || '')
    .replace(/{{main}}/g, mainContent)
    .replace(/{{footer}}/g, partials.footer || '')
    .replace(/{{aside}}/g, partials.aside || '')
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{title}}/g, title);

  console.timeEnd(`createFullPage ${title}`);
  return fullPage;
}

async function generateSpecialPages(partials) {
  console.time('generateSpecialPages');
  await Promise.all([
    writeFile(path.join(dirs.public, 'index.html'), partials.index),
    writeFile(path.join(dirs.public, '404.html'), partials['404']),
  ]);
  console.timeEnd('generateSpecialPages');
  console.log('Generated: index.html and 404.html');
}

async function generateSubforumPages(partials, subforums) {
  console.time('generateSubforumPages');
  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const template = templates[subforum.template];
    if (!template) {
      throw new Error(`Template ${subforum.template} not found for subforum ${key}`);
    }

    // Load posts with folder-based links
    const posts = await loadSubforumData(subforum, key);
    subforum.posts = posts;

    // Generate subforum page
    const subforumContent = template.generateSubforumPage(subforum, baseurl);
    const subforumOutputContent = await createFullPage(
      partials,
      subforumContent,
      `${baseurl}${key}`,
      subforum.title,
      subforum.description,
      subforum.banner
    );
    await writeFile(path.join(dirs.public, `${key}.html`), subforumOutputContent);
    console.log(`Generated: ${key}.html`);

    // Generate RSS feed
    const rssFeed = template.generateRSSFeed(subforum, baseurl);
    await writeFile(path.join(dirs.public, `${key}.rss`), rssFeed);
    console.log(`Generated: ${key}.rss`);

    // Generate individual post pages
    await Promise.all(subforum.posts.map(async post => {
      const postContent = template.generatePostPage(post, subforum, baseurl);

      const postOutputContent = await createFullPage(
        partials,
        postContent,
        `${baseurl}${post.link.replace(/^\//, '')}`,
        post.title,
        post.content || subforum.description,
        post.image || subforum.icon
      );

      const postOutputFilePath = path.join(dirs.public, `${post.link.replace(/^\//, '')}.html`);
      await ensureDirectoryExists(path.dirname(postOutputFilePath));
      await writeFile(postOutputFilePath, postOutputContent);
      console.log(`Generated: ${post.link.replace(/^\//, '')}.html`);
    }));
  }));
  console.timeEnd('generateSubforumPages');
}

async function runSSG() {
  console.time('runSSG');
  try {
    await ensureDirectoryExists(dirs.public);
    const [partials, subforums] = await Promise.all([
      loadFilesFromDir(dirs.partials, '.html'),
      loadFilesFromDir(dirs.subforums, '.json', JSON.parse),
    ]);
    await Promise.all([
      generateSpecialPages(partials),
      generateSubforumPages(partials, subforums),
    ]);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
  console.timeEnd('runSSG');
}

runSSG();
