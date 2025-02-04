const fs = require('fs').promises;
const path = require('path');

// Define the base URL
const baseurl = 'https://yuushaexa.github.io/'; // You can change this to any base URL

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

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
    if (err.code !== 'EEXIST') throw err;
  }
}

async function loadFilesFromDir(dirPath, fileType, transform = (data) => data) {
  try {
    const files = await fs.readdir(dirPath);
    const matchingFiles = files.filter(file => file.endsWith(fileType));
    const fileContents = await Promise.all(matchingFiles.map(async file => {
      const content = await readFile(path.join(dirPath, file));
      return { key: path.basename(file, fileType), content: transform(content) };
    }));
    return fileContents.reduce((acc, { key, content }) => ({ ...acc, [key]: content }), {});
  } catch (err) {
    throw new Error(`Error loading files from ${dirPath}: ${err.message}`);
  }
}

async function createFullPage(partials, mainContent, canonicalUrl = '', title = 'Default Title', description = '', image = '') {
  // Replace placeholders in the head template
  const headContent = (partials.head || '')
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{image}}/g, image);

  // Replace placeholders in the base template
  return partials.base
    .replace(/{{head}}/g, headContent)
    .replace(/{{header}}/g, partials.header || '')
    .replace(/{{main}}/g, mainContent)
    .replace(/{{footer}}/g, partials.footer || '')
    .replace(/{{aside}}/g, partials.aside || '')
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{title}}/g, title);
}

async function generateSpecialPages(partials) {
  await Promise.all([
    writeFile(path.join(dirs.public, 'index.html'), partials.index),
    writeFile(path.join(dirs.public, '404.html'), partials['404']),
  ]);
  console.log('Generated: index.html and 404.html');
}

function generateRSSFeed(subforum, baseurl) {
  const feedUrl = `${baseurl}${subforum.key}.rss`; // URL of the RSS feed itself
  const items = subforum.posts.map(post => `
    <item>
      <title>${post.title}</title>
      <link>${baseurl}${post.link.replace(/^\//, '')}.html</link>
      <description>${post.content || ''}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${baseurl}${post.link.replace(/^\//, '')}.html</guid>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${subforum.title}</title>
    <link>${baseurl}${subforum.key}.html</link>
    <description>${subforum.description}</description>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

async function generateSubforumPages(partials, subforums) {
  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const subforumContent = `
      <h1>${subforum.title}</h1>
      <p>${subforum.description}</p>
      <p>${subforum.created_at}</p>
      <img src="${subforum.banner}" alt="${subforum.title}">
      <img src="${subforum.icon}" alt="${subforum.title}">
      <ul>${subforum.posts.map(post => `
        <li>
          <img src="${post.image}" alt="${post.title}" width="50">
          <a href="${post.link}">${post.title}</a>
          <span>(${post.flair})</span>
          <br>By ${post.author} on ${post.date}
        </li>
      `).join('')}</ul>
    `;

    // Generate subforum page with fallbacks
    const subforumOutputContent = await createFullPage(
      partials,
      subforumContent,
      `${baseurl}${key}`, // Use baseurl here
      subforum.title,
      subforum.description, // Description for subforum page
      subforum.banner       // Image for subforum page
    );
    await writeFile(path.join(dirs.public, `${key}.html`), subforumOutputContent);
    console.log(`Generated: ${key}.html`);

// Generate RSS feed for the subforum
    const rssFeed = generateRSSFeed(subforum, baseurl);
    const rssFilePath = path.join(dirs.public, `${key}.rss`);
    await writeFile(rssFilePath, rssFeed);
    console.log(`Generated: ${key}.rss`);
    
    // Generate individual post pages
    await Promise.all(subforum.posts.map(async post => {
      const postContent = `
        <h1>${post.title}</h1>
        <p>By ${post.author} on ${post.date}</p>
        <img src="${post.image}" alt="${post.title}" width="200">
        <p>${post.content}</p>
        <p><a href="${post.url}" target="_blank">Read more</a></p>
      `;

      // Generate post page with fallbacks
      const postOutputContent = await createFullPage(
        partials,
        postContent,
        `${baseurl}${post.link.replace(/^\//, '')}`, // Use baseurl here
        post.title,
        post.content || subforum.description, // Fallback to subforum description if post.content is missing
        post.image || subforum.icon           // Fallback to subforum icon if post.image is missing
      );
      const postOutputFilePath = path.join(dirs.public, post.link.replace(/^\//, '') + '.html');
      await ensureDirectoryExists(path.dirname(postOutputFilePath));
      await writeFile(postOutputFilePath, postOutputContent);
      console.log(`Generated: ${post.link.replace(/^\//, '')}.html`);
    }));
  }));
}

async function runSSG() {
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
}

runSSG();
