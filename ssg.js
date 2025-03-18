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
    writeFile(path.join(dirs.public, 'index.json'), JSON.stringify({ message: 'Welcome to the API' }, null, 2)),
    writeFile(path.join(dirs.public, '404.json'), JSON.stringify({ error: 'Page not found' }, null, 2)),
  ]);
  console.log('Generated: index.json and 404.json');
}

const allTags = {};
const allDevelopers = {};

async function generateSubforumPages(partials, subforums) {
  const postsPerPage = 10; // Number of posts per page

  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const template = templates[subforum.template];
    if (!template) {
      throw new Error(`Template ${subforum.template} not found for subforum ${key}`);
    }

    // Load posts with folder-based links
    const posts = await loadSubforumData(subforum, key);
    subforum.posts = posts;

    // Generate RSS feed (optional, if you still want RSS feeds)
    const rssFeed = template.generateRSSFeed(subforum, baseurl);
    await writeFile(path.join(dirs.public, `${key}.rss`), rssFeed);
    console.log(`Generated: ${key}.rss`);

    // Generate individual post pages as JSON
    await Promise.all(subforum.posts.map(async post => {
      const postContent = template.generatePostPage(post, subforum, baseurl);

      const postOutputFilePath = path.join(dirs.public, `${post.link.replace(/^\//, '')}.json`);
      await ensureDirectoryExists(path.dirname(postOutputFilePath));
      await writeFile(postOutputFilePath, JSON.stringify(post, null, 2));
      console.log(`Generated: ${post.link.replace(/^\//, '')}.json`);
    }));

    // Paginate subforum posts and generate JSON pages
    const totalPages = Math.ceil(posts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const paginatedPosts = posts.slice(start, end);

      const subforumContent = {
        ...subforum,
        posts: paginatedPosts,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          nextPage: page < totalPages ? `${key}/page/${page + 1}.json` : null,
          previousPage: page > 1 ? `${key}/page/${page - 1}.json` : null,
        },
      };

      const fileName = page === 1 ? `${key}.json` : `${key}/page/${page}.json`;
      const filePath = path.join(dirs.public, fileName);

      // Ensure the directory exists before writing the file
      await ensureDirectoryExists(path.dirname(filePath));
      await writeFile(filePath, JSON.stringify(subforumContent, null, 2));
      console.log(`Generated: ${fileName}`);
    }
  }));
}

async function generateTagDevAliasPages(partials) {
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

  const pageGenerationPromises = [];

  for (const { type, meta, data } of categories) {
    // Generate individual pages for each tag/dev
    for (const [name, posts] of Object.entries(data)) {
      const slug = getSlug(name);

      // Paginate posts
      const totalPages = Math.ceil(posts.length / postsPerPage);

      for (let page = 1; page <= totalPages; page++) {
        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;
        const paginatedPosts = posts.slice(start, end);

        const pageContent = {
          name: name,
          posts: paginatedPosts,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            nextPage: page < totalPages ? `${type}/${slug}/page/${page + 1}.json` : null,
            previousPage: page > 1 ? `${type}/${slug}/page/${page - 1}.json` : null,
          },
        };

        const outputFilePath = page === 1
          ? path.join(dirs.public, `vn/${type}/${slug}.json`)
          : path.join(dirs.public, `vn/${type}/${slug}/page/${page}.json`);

        // Ensure the directory exists before writing the file
        await ensureDirectoryExists(path.dirname(outputFilePath));
        await writeFile(outputFilePath, JSON.stringify(pageContent, null, 2));
        console.log(`Generated: ${outputFilePath}`);
      }
    }

    // Paginate the index page for all tags/devs
    const allEntries = Object.entries(data);
    const totalPages = Math.ceil(allEntries.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const paginatedEntries = allEntries.slice(start, end);

      const indexPageContent = {
        type: type,
        entries: paginatedEntries.map(([name, posts]) => ({
          name: name,
          slug: getSlug(name),
          postCount: posts.length,
        })),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          nextPage: page < totalPages ? `${type}/page/${page + 1}.json` : null,
          previousPage: page > 1 ? `${type}/page/${page - 1}.json` : null,
        },
      };

      const outputFilePath = page === 1
        ? path.join(dirs.public, `vn/${type}/index.json`)
        : path.join(dirs.public, `vn/${type}/page/${page}.json`);

      // Ensure the directory exists before writing the file
      await ensureDirectoryExists(path.dirname(outputFilePath));
      await writeFile(outputFilePath, JSON.stringify(indexPageContent, null, 2));
      console.log(`Generated: ${outputFilePath}`);
    }
  }

  await Promise.all(pageGenerationPromises);
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
    const [partials, subforums] = await Promise.all([
      loadFilesFromDir(dirs.partials, '.html'),
      loadFilesFromDir(dirs.subforums, '.json', JSON.parse),
    ]);

    await generateSpecialPages(partials);
    await generateSubforumPages(partials, subforums); // First, generate all subforum pages
    await generateTagDevAliasPages(partials);         // Then, generate tag/dev pages

    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}


runSSG();
