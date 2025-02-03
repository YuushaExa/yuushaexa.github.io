const fs = require('fs').promises;
const path = require('path');

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

// File to store the last modification times
const mtimeFilePath = path.join(__dirname, 'mtime.json');

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

async function getFileMtime(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.toISOString();
  } catch (err) {
    throw new Error(`Error getting mtime for file ${filePath}: ${err.message}`);
  }
}

async function loadUpdatedSubforums() {
  try {
    const files = await fs.readdir(dirs.subforums);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    let mtimes = {};
    try {
      mtimes = JSON.parse(await readFile(mtimeFilePath));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    const updatedSubforums = {};
    await Promise.all(jsonFiles.map(async file => {
      const filePath = path.join(dirs.subforums, file);
      const currentMtime = await getFileMtime(filePath);
      if (!mtimes[file] || mtimes[file] !== currentMtime) {
        const content = await readFile(filePath);
        updatedSubforums[path.basename(file, '.json')] = JSON.parse(content);
        mtimes[file] = currentMtime;
      }
    }));

    await writeFile(mtimeFilePath, JSON.stringify(mtimes, null, 2));
    return updatedSubforums;
  } catch (err) {
    throw new Error(`Error loading updated subforums: ${err.message}`);
  }
}

async function runSSG() {
  try {
    await ensureDirectoryExists(dirs.public);
    const [partials, subforums] = await Promise.all([
      loadFilesFromDir(dirs.partials, '.html'),
      loadUpdatedSubforums(),
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
