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

async function loadSubforumData(subforum) {
  if (!subforum.data) return []; // If no data files are specified, return an empty array

  const dataFiles = Array.isArray(subforum.data) ? subforum.data : [subforum.data];
  const posts = await Promise.all(dataFiles.map(async file => {
    const filePath = path.join(dirs.subforums, file);
    const content = await readFile(filePath);
    return JSON.parse(content);
  }));

  return posts.flat(); // Flatten the array of posts
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

// Define templates
const templates = {
  gamesTemplate: {
    generateSubforumPage: (subforum, baseurl) => `
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
    `,

    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <p>By ${post.author} on ${post.date}</p>
      <img src="${post.image}" alt="${post.title}" width="200">
      <p>${post.content}</p>
      <p><a href="${post.url}" target="_blank">Read more</a></p>
    `,

    generateRSSFeed: (subforum, baseurl) => {
      const feedUrl = `${baseurl}${subforum.link.replace(/^\//, '')}.rss`;
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
    <link>${baseurl}${subforum.link.replace(/^\//, '')}.html</link>
    <description>${subforum.description}</description>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
    },
  },

  programmingTemplate: {
    generateSubforumPage: (subforum, baseurl) => `
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
          <p>${post.content}</p>
        </li>
      `).join('')}</ul>
    `,

    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <p>By ${post.author} on ${post.date}</p>
      <img src="${post.image}" alt="${post.title}" width="200">
      <p>${post.content}</p>
      <p><a href="${post.url}" target="_blank">Read more</a></p>
      <p><strong>Related to:</strong> ${subforum.title}</p>
    `,

    generateRSSFeed: (subforum, baseurl) => {
      const feedUrl = `${baseurl}${subforum.link.replace(/^\//, '')}.rss`;
      const items = subforum.posts.map(post => `
        <item>
          <title>${post.title}</title>
          <link>${baseurl}${post.link.replace(/^\//, '')}.html</link>
          <description>${post.content || ''}</description>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          <guid>${baseurl}${post.link.replace(/^\//, '')}.html</guid>
          <category>${post.flair}</category>
        </item>
      `).join('');

      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${subforum.title}</title>
    <link>${baseurl}${subforum.link.replace(/^\//, '')}.html</link>
    <description>${subforum.description}</description>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
    },
  },
};

async function generateSubforumPages(partials, subforums) {
  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const template = templates[subforum.template];
    if (!template) {
      throw new Error(`Template ${subforum.template} not found for subforum ${key}`);
    }

    // Load posts from data files
    const posts = await loadSubforumData(subforum);
    subforum.posts = posts; // Attach posts to the subforum object

    // Generate subforum page
    const subforumContent = template.generateSubforumPage(subforum, baseurl);
    const subforumOutputContent = await createFullPage(
      partials,
      subforumContent,
      `${baseurl}${key}`,
      subforum.title,
      subforum.description,
      subforum.banner,
      subforum.link
    );
    await writeFile(path.join(dirs.public, `${key}.html`), subforumOutputContent);
    console.log(`Generated: ${key}.html`);

    // Generate RSS feed for the subforum
    const rssFeed = template.generateRSSFeed(subforum, baseurl);
    const rssFilePath = path.join(dirs.public, `${key}.rss`);
    await writeFile(rssFilePath, rssFeed);
    console.log(`Generated: ${key}.rss`);

    // Generate individual post pages
    await Promise.all(subforum.posts.map(async post => {
      const postContent = template.generatePostPage(post, subforum, baseurl);

      // Generate post page with fallbacks
      const postOutputContent = await createFullPage(
        partials,
        postContent,
        `${baseurl}${post.link.replace(/^\//, '')}`,
        post.title,
        post.content || subforum.description,
        post.image || subforum.icon
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
