const fs = require('fs').promises;
const path = require('path');
const { templates, generateSlugtags } = require('./templates');
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

async function loadMetadata(file) {
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
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading metadata from ${file}:`, err.message);
    return [];
  }
}

async function mergeMetadata(posts, metadata, key = 'title') {
  return posts.map(post => {
    const matchedMetadata = metadata.find(item => item[key] === post[key]);
    return {
      ...post,
      ...matchedMetadata // Merge metadata into the post
    };
  });
}

async function loadSubforumData(subforum, subforumKey) {
  if (!subforum.data) return [];

  const dataFiles = Array.isArray(subforum.data) ? subforum.data : [subforum.data];
  const metadataSources = subforum.metadata || {};
  const template = templates[subforum.template];

  // Load posts
  const posts = await Promise.all(dataFiles.map(async (file) => {
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
      return parsedPosts.map(post => ({
        ...post,
        title: post.title || 'Default Title',
        link: post.link || template.generatePostLink(subforum.link, post),
        tags: post.tags || [],           // Ensure tags is always an array
        developers: post.developers || [], // Ensure developers is always an array
        image: post.image || { url: '' }, // Ensure image is always an object with a url property
        screenshots: post.screenshots || [], // Ensure screenshots is always an array
      }));
    } catch (err) {
      console.error(`Error loading data from ${file}:`, err.message);
      return [];
    }
  }));

  // Load and merge metadata
  const metadata = {};
  for (const [type, file] of Object.entries(metadataSources)) {
    metadata[type] = await loadMetadata(file);
  }

  // Merge metadata into posts
  let mergedPosts = posts.flat();
  for (const [type, metadataItems] of Object.entries(metadata)) {
    mergedPosts = await mergeMetadata(mergedPosts, metadataItems, 'title');
  }

  return mergedPosts;
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


const allTags = {};
const allDevelopers = {};

async function generateSubforumPages(subforums) {
  const postsPerPage = 10; // Number of posts per page

  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const template = templates[subforum.template];
    if (!template) {
      throw new Error(`Template ${subforum.template} not found for subforum ${key}`);
    }

    // Load posts with folder-based links
    const posts = await loadSubforumData(subforum, key);
    subforum.posts = posts;

    // Generate individual post JSON files
    await Promise.all(subforum.posts.map(async post => {
      const jsonContent = template.generateJSON(post, subforum, baseurl);
      const jsonFilePath = path.join(dirs.public, `${post.link.replace(/^\//, '')}.json`);
      await ensureDirectoryExists(path.dirname(jsonFilePath));
      await writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2));
      console.log(`Generated: ${post.link.replace(/^\//, '')}.json`);
    }));

    // Paginate subforum posts and generate JSON files
    const totalPages = Math.ceil(posts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const paginatedPosts = posts.slice(start, end);

      const subforumJsonContent = {
        title: subforum.title,
        description: subforum.description,
        link: `${baseurl}${key}${page === 1 ? '' : `/page/${page}`}.json`,
        posts: paginatedPosts.map(post => ({
          title: post.title,
          link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
          date: post.date,
          author: post.author,
        })),
      };

      const fileName = page === 1 ? `${key}.json` : `${key}/page/${page}.json`;
      const filePath = path.join(dirs.public, fileName);

      // Ensure the directory exists before writing the file
      await ensureDirectoryExists(path.dirname(filePath));
      await writeFile(filePath, JSON.stringify(subforumJsonContent, null, 2));
      console.log(`Generated: ${fileName}`);
    }
  });
}

async function generateTagDevAliasPages() {
  const categories = [
    { type: 'tags', meta: 'Visual Novels', data: allTags },
    { type: 'developers', meta: 'Company', data: allDevelopers },
  ];

  const postsPerPage = 10; // Number of posts per page
  const slugCache = new Map();

  const getSlug = (name) => {
    if (!slugCache.has(name)) {
      slugCache.set(name, generateSlugtags(name));
    }
    return slugCache.get(name);
  };

  for (const { type, meta, data } of categories) {
    // Generate individual JSON files for each tag/dev
    for (const [name, posts] of Object.entries(data)) {
      const slug = getSlug(name);

      // Paginate posts
      const totalPages = Math.ceil(posts.length / postsPerPage);

      for (let page = 1; page <= totalPages; page++) {
        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;
        const paginatedPosts = posts.slice(start, end);

        const jsonContent = {
          title: `${name} - ${meta}`,
          description: `All visual novels related to ${name}`,
          link: page === 1
            ? `${baseurl}vn/${type}/${slug}.json`
            : `${baseurl}vn/${type}/${slug}/page/${page}.json`,
          posts: paginatedPosts.map(post => ({
            title: post.title,
            link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
            author: post.author,
            date: post.date,
          })),
        };

        const jsonFilePath = page === 1
          ? path.join(dirs.public, `vn/${type}/${slug}.json`)
          : path.join(dirs.public, `vn/${type}/${slug}/page/${page}.json`);

        // Ensure the directory exists before writing the file
        await ensureDirectoryExists(path.dirname(jsonFilePath));
        await writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2));
        console.log(`Generated: ${jsonFilePath}`);
      }
    }

    // Paginate the index page for all tags/devs
    const allEntries = Object.entries(data);
    const totalPages = Math.ceil(allEntries.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const paginatedEntries = allEntries.slice(start, end);

      const indexJsonContent = {
        title: `All ${type} - ${meta}`,
        description: `List of all ${type} related to visual novels`,
        link: page === 1
          ? `${baseurl}vn/${type}/index.json`
          : `${baseurl}vn/${type}/page/${page}.json`,
        entries: paginatedEntries.map(([name, posts]) => ({
          name,
          count: posts.length,
          link: `${baseurl}vn/${type}/${getSlug(name)}.json`,
        })),
      };

      const jsonFilePath = page === 1
        ? path.join(dirs.public, `vn/${type}/index.json`)
        : path.join(dirs.public, `vn/${type}/page/${page}.json`);

      // Ensure the directory exists before writing the file
      await ensureDirectoryExists(path.dirname(jsonFilePath));
      await writeFile(jsonFilePath, JSON.stringify(indexJsonContent, null, 2));
      console.log(`Generated: ${jsonFilePath}`);
    }
  }
}
// Helper function to generate pagination links
function generatePaginationLinks(type, slug, currentPage, totalPages, isIndex = false) {
  const basePath = isIndex ? `${baseurl}vn/${type}` : `${baseurl}vn/${type}/${slug}`;
  return `
    <div class="pagination">
      ${currentPage > 1 ? `<a href="${basePath}${currentPage - 1 === 1 ? '/index.html' : `/page/${currentPage - 1}.html`}">&laquo; Previous</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => `
        <a href="${basePath}${i === 0 ? '/index.html' : `/page/${i + 1}.html`}" ${i + 1 === currentPage ? 'class="active"' : ''}>${i + 1}</a>
      `).join(' ')}
      ${currentPage < totalPages ? `<a href="${basePath}/page/${currentPage + 1}.html">Next &raquo;</a>` : ''}
    </div>
  `;
}

async function runSSG() {
  try {
    await ensureDirectoryExists(dirs.public);
    const subforums = await loadFilesFromDir(dirs.subforums, '.json', JSON.parse);

    await generateSubforumPages(subforums); // Generate subforum JSON files
    await generateTagDevAliasPages();      // Generate tag/dev JSON files

    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}
runSSG();
