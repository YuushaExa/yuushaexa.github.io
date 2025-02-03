const fs = require('fs').promises;
const path = require('path');

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

const mtimeCachePath = path.join(__dirname, 'mtime.json');

// Helper function to ensure a directory exists
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Helper function to get file modification times
async function getFileMtimes(dirPath) {
  const files = await fs.readdir(dirPath);
  const mtimes = {};
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      mtimes[file] = stats.mtime.toISOString();
    }
  }
  return mtimes;
}

// Helper function to load cached modification times
async function loadMtimeCache() {
  try {
    const data = await fs.readFile(mtimeCachePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return {}; // Return empty cache if file doesn't exist
  }
}

// Helper function to save modification times to cache
async function saveMtimeCache(mtimes) {
  await fs.writeFile(mtimeCachePath, JSON.stringify(mtimes, null, 2), 'utf-8');
}

// Helper function to find changed files
async function findChangedFiles(currentMtimes, cachedMtimes) {
  const changedFiles = [];
  for (const [file, mtime] of Object.entries(currentMtimes)) {
    if (cachedMtimes[file] !== mtime) {
      changedFiles.push(file);
    }
  }
  return changedFiles;
}

// Helper function to load files from a directory
async function loadFilesFromDir(dirPath, fileType, transform = (data) => data) {
  try {
    const files = await fs.readdir(dirPath);
    const matchingFiles = files.filter(file => file.endsWith(fileType));
    const fileContents = await Promise.all(matchingFiles.map(async file => {
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      return { key: path.basename(file, fileType), content: transform(content) };
    }));
    return fileContents.reduce((acc, { key, content }) => ({ ...acc, [key]: content }), {});
  } catch (err) {
    throw new Error(`Error loading files from ${dirPath}: ${err.message}`);
  }
}

// Helper function to create a full HTML page
async function createFullPage(partials, mainContent, canonicalUrl = '', title = 'Default Title') {
  return partials.base
    .replace('{{head}}', partials.head || '')
    .replace('{{header}}', partials.header || '')
    .replace('{{main}}', mainContent)
    .replace('{{footer}}', partials.footer || '')
    .replace('{{aside}}', partials.aside || '')
    .replace('{{canonicalUrl}}', canonicalUrl)
    .replace('{{title}}', title);
}

// Generate special pages (index.html, 404.html)
async function generateSpecialPages(partials) {
  await Promise.all([
    fs.writeFile(path.join(dirs.public, 'index.html'), partials.index, 'utf-8'),
    fs.writeFile(path.join(dirs.public, '404.html'), partials['404'], 'utf-8'),
  ]);
  console.log('Generated: index.html and 404.html');
}

// Generate subforum pages
async function generateSubforumPages(partials, subforums) {
  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const subforumContent = `
      <h1>${subforum.title}</h1>
      <p>${subforum.description}</p>
      <p>${subforum.created_at}</p>
      <img src="${subforum.banner}" alt="${subforum.title} Banner">
      <img src="${subforum.icon}" alt="${subforum.title} Icon">
      <ul>${subforum.posts.map(post => `
        <li>
          <img src="${post.image}" alt="${post.title}" width="50">
          <a href="${post.link}">${post.title}</a>
          <span>(${post.flair})</span>
          <br>By ${post.author} on ${post.date}
        </li>
      `).join('')}</ul>
    `;
    const subforumOutputContent = await createFullPage(partials, subforumContent, `https://yuushaexa.github.io/${key}`, subforum.title);
    await fs.writeFile(path.join(dirs.public, `${key}.html`), subforumOutputContent, 'utf-8');
    console.log(`Generated: ${key}.html`);

    await Promise.all(subforum.posts.map(async post => {
      const postContent = `
        <h1>${post.title}</h1>
        <p>By ${post.author} on ${post.date}</p>
        <img src="${post.image}" alt="${post.title}" width="200">
        <p>${post.content}</p>
        <p><a href="${post.url}" target="_blank">Read more</a></p>
      `;
      const postOutputContent = await createFullPage(partials, postContent, `https://yuushaexa.github.io${post.link}`, post.title);
      const postOutputFilePath = path.join(dirs.public, post.link.replace(/^\//, '') + '.html');
      await ensureDirectoryExists(path.dirname(postOutputFilePath));
      await fs.writeFile(postOutputFilePath, postOutputContent, 'utf-8');
      console.log(`Generated: ${post.link.replace(/^\//, '')}.html`);
    }));
  }));
}

// Main SSG logic
async function runSSG() {
  try {
    await ensureDirectoryExists(dirs.public);

    // Get current modification times
    const currentMtimes = await getFileMtimes(dirs.subforums);

    // Load cached modification times
    const cachedMtimes = await loadMtimeCache();

    // Find changed files
    const changedFiles = await findChangedFiles(currentMtimes, cachedMtimes);

    // Load partials and subforums
    const [partials, subforums] = await Promise.all([
      loadFilesFromDir(dirs.partials, '.html'),
      loadFilesFromDir(dirs.subforums, '.json', JSON.parse),
    ]);

    // Regenerate only changed subforums
    const filteredSubforums = changedFiles.length > 0
      ? Object.fromEntries(Object.entries(subforums).filter(([key]) => changedFiles.includes(`${key}.json`)))
      : subforums;

    await Promise.all([
      generateSpecialPages(partials),
      generateSubforumPages(partials, filteredSubforums),
    ]);

    // Save updated modification times to cache
    await saveMtimeCache(currentMtimes);

    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}

runSSG();
