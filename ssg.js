const fs = require('fs').promises;
const path = require('path');

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

const mtimeCachePath = path.join(__dirname, 'mtime.json');

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

async function generateSpecialPages(partials) {
  await Promise.all([
    writeFile(path.join(dirs.public, 'index.html'), partials.index),
    writeFile(path.join(dirs.public, '404.html'), partials['404']),
  ]);
  console.log('Generated: index.html and 404.html');
}

async function generateSubforumPages(partials, subforums) {
  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const subforumContent = `
      <h1>${subforum.title}</h1>
      <p>${subforum.description}</p>
      <p>${subforum.created_at}</p>
      <img>${subforum.banner}</img>
      <img>${subforum.icon}</img>
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
    await writeFile(path.join(dirs.public, `${key}.html`), subforumOutputContent);
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
      await writeFile(postOutputFilePath, postOutputContent);
      console.log(`Generated: ${post.link.replace(/^\//, '')}.html`);
    }));
  }));
}

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
