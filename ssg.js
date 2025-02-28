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
        developers: post.developers || [] // Ensure developers is always an array
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

    posts.forEach(post => {
      const tags = post.tags || []; // Default to empty array if undefined
      const developers = post.developers || []; // Default to empty array if undefined

      tags.forEach(tag => {
        allTags[tag] = allTags[tag] || [];
        allTags[tag].push(post);
      });
      developers.forEach(dev => {
        allDevelopers[dev.name] = allDevelopers[dev.name] || [];
        allDevelopers[dev.name].push(post);
      });
    });

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

    // Paginate subforum posts and generate pages
    const totalPages = Math.ceil(posts.length / postsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const start = (page - 1) * postsPerPage;
      const end = start + postsPerPage;
      const paginatedPosts = posts.slice(start, end);

      const paginationNav = `
        <div class="pagination">
          ${page > 1 ? `<a href="${subforum.link}${page - 1 === 1 ? '' : `-${page - 1}`}.html">&laquo; Previous</a>` : ''}
          ${Array.from({ length: totalPages }, (_, i) => `<a href="${subforum.link}${i === 0 ? '' : `-${i + 1}`}.html">${i + 1}</a>`).join(' ')}
          ${page < totalPages ? `<a href="${subforum.link}-${page + 1}.html">Next &raquo;</a>` : ''}
        </div>
      `;

      const subforumContent = template.generateSubforumPage(
        { ...subforum, posts: paginatedPosts },
        baseurl
      ) + paginationNav;

      const subforumOutputContent = await createFullPage(
        partials,
        subforumContent,
        `${baseurl}${key}${page === 1 ? '' : `-${page}`}.html`,
        subforum.title,
        subforum.description,
        subforum.banner
      );

      const fileName = page === 1 ? `${key}.html` : `${key}-${page}.html`;
      await writeFile(path.join(dirs.public, fileName), subforumOutputContent);
      console.log(`Generated: ${fileName}`);
    }

    // Generate tag and developer pages for this subforum
    await generateTagDevAliasPages(partials, subforum.link);
  }));
}

async function generateTagDevAliasPages(partials, subforumLink) {
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

        const pageContent = `
          <h1>${name} (${posts.length})</h1>
          <ul>
            ${paginatedPosts.map(post => `
              <li>
                <a href="${baseurl}${post.link.replace(/^\//, '')}.html">${post.title}</a>
                by ${post.author} on ${post.date}
              </li>
            `).join('')}
          </ul>
          ${generatePaginationLinks(subforumLink, type, slug, page, totalPages)}
        `;

        const canonicalUrl = page === 1
          ? `${baseurl}${subforumLink}/${type}/${slug}.html`
          : `${baseurl}${subforumLink}/${type}/${slug}-${page}.html`;

        pageGenerationPromises.push(
          (async () => {
            const outputContent = await createFullPage(
              partials,
              pageContent,
              canonicalUrl,
              `${name} - ${meta}`,
              `All visual novels related to ${name}`,
              ''
            );

            const outputFilePath = page === 1
              ? path.join(dirs.public, `${subforumLink}/${type}/${slug}.html`)
              : path.join(dirs.public, `${subforumLink}/${type}/${slug}-${page}.html`);

            await ensureDirectoryExists(path.dirname(outputFilePath));
            await writeFile(outputFilePath, outputContent);
            console.log(`Generated: ${outputFilePath}`);
          })()
        );
      }
    }

    // Generate index page for all tags/devs
    const indexPageContent = `
      <h1>All ${type}</h1>
      <ul>
        ${Object.entries(data).map(([name, posts]) => `
          <li>
            <a href="${baseurl}${subforumLink}/${type}/${getSlug(name)}.html">${name} (${posts.length})</a>
          </li>
        `).join('')}
      </ul>
    `;

    pageGenerationPromises.push(
      (async () => {
        const outputContent = await createFullPage(
          partials,
          indexPageContent,
          `${baseurl}${subforumLink}/${type}/`,
          `All ${type} - ${meta}`,
          `List of all ${type} related to visual novels`,
          ''
        );

        const outputFilePath = path.join(dirs.public, `${subforumLink}/${type}/index.html`);
        await ensureDirectoryExists(path.dirname(outputFilePath));
        await writeFile(outputFilePath, outputContent);
        console.log(`Generated: ${subforumLink}/${type}/index.html`);
      })()
    );
  }

  await Promise.all(pageGenerationPromises);
}

// Helper function to generate pagination links
function generatePaginationLinks(subforumLink, type, slug, currentPage, totalPages) {
  return `
    <div class="pagination">
      ${currentPage > 1 ? `<a href="${baseurl}${subforumLink}/${type}/${slug}${currentPage - 1 === 1 ? '' : `-${currentPage - 1}`}.html">&laquo; Previous</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => `
        <a href="${baseurl}${subforumLink}/${type}/${slug}${i === 0 ? '' : `-${i + 1}`}.html" ${i + 1 === currentPage ? 'class="active"' : ''}>${i + 1}</a>
      `).join(' ')}
      ${currentPage < totalPages ? `<a href="${baseurl}${subforumLink}/${type}/${slug}-${currentPage + 1}.html">Next &raquo;</a>` : ''}
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
    await generateSubforumPages(partials, subforums); // Pass subforums to generate pages
    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}

runSSG();
