const fs = require('fs').promises;
const path = require('path');

const baseurl = 'https://yuushaexa.github.io/';

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

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
  const headContent = (partials.head || '')
    .replace(/{{title}}/g, title)
    .replace(/{{description}}/g, description)
    .replace(/{{canonicalUrl}}/g, canonicalUrl)
    .replace(/{{image}}/g, image);

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
}

async function generateSubforumPages(partials) {
  const subforumDirs = await fs.readdir(dirs.subforums, { withFileTypes: true });
  const subforumFolders = subforumDirs.filter(dir => dir.isDirectory()).map(dir => dir.name);

  await Promise.all(subforumFolders.map(async folder => {
    const subforumPath = path.join(dirs.subforums, folder);
    const templatePath = path.join(subforumPath, 'template.html');
    const templateContent = await readFile(templatePath);

    const jsonFiles = (await fs.readdir(subforumPath)).filter(file => file.endsWith('.json'));
    await Promise.all(jsonFiles.map(async jsonFile => {
      const jsonFilePath = path.join(subforumPath, jsonFile);
      const subforumData = JSON.parse(await readFile(jsonFilePath));

      // Generate subforum page
      const subforumContent = templateContent
        .replace(/\${subforum\.posts}/g, subforumData.posts.map(post => `
          <li>
            <img src="${post.image}" alt="${post.title}" width="50">
            <a href="${post.link}">${post.title}</a>
            <span>(${post.flair})</span>
            <br>By ${post.author} on ${post.date}
          </li>
        `).join(''));

      const subforumOutputContent = await createFullPage(
        partials,
        subforumContent,
        `${baseurl}${folder}`,
        folder, // Use folder name as title
        `Discussions about ${folder}` // Use folder name as description
      );
      const outputFilePath = path.join(dirs.public, `${folder}.html`);
      await ensureDirectoryExists(path.dirname(outputFilePath));
      await writeFile(outputFilePath, subforumOutputContent);
      console.log(`Generated: ${folder}.html`);

      // Generate RSS feed
      const rssFeed = generateRSSFeed({
        title: folder,
        link: `/${folder}`,
        description: `Discussions about ${folder}`,
        posts: subforumData.posts,
      }, baseurl);
      const rssFilePath = path.join(dirs.public, `${folder}.rss`);
      await writeFile(rssFilePath, rssFeed);
      console.log(`Generated: ${folder}.rss`);

      // Generate individual post pages
      await Promise.all(subforumData.posts.map(async post => {
        const postContent = `
          <h1>${post.title}</h1>
          <p>By ${post.author} on ${post.date}</p>
          <img src="${post.image}" alt="${post.title}" width="200">
          <p>${post.content}</p>
          <p><a href="${post.url}" target="_blank">Read more</a></p>
        `;

        const postOutputContent = await createFullPage(
          partials,
          postContent,
          `${baseurl}${post.link.replace(/^\//, '')}`,
          post.title,
          post.content || `Discussions about ${folder}`,
          post.image
        );
        const postOutputFilePath = path.join(dirs.public, post.link.replace(/^\//, '') + '.html');
        await ensureDirectoryExists(path.dirname(postOutputFilePath));
        await writeFile(postOutputFilePath, postOutputContent);
        console.log(`Generated: ${post.link.replace(/^\//, '')}.html`);
      }));
    }));
  }));
}

async function runSSG() {
  try {
    await ensureDirectoryExists(dirs.public);
    const partials = await loadFilesFromDir(dirs.partials, '.html');
    await Promise.all([
      generateSpecialPages(partials),
      generateSubforumPages(partials),
    ]);
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}

runSSG();
