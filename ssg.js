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

async function loadSubforumData(subforum, subforumKey) {
  if (!subforum.data) return [];

  const dataFiles = Array.isArray(subforum.data) ? subforum.data : [subforum.data];
  const template = templates[subforum.template];

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
        link: post.link || template.generatePostLink(subforumKey, post),
         tags: post.tags || [],           // Ensure tags is always an array
    developers: post.developers || [] // Ensure developers is always an array
      }));
    } catch (err) {
      console.error(`Error loading data from ${file}:`, err.message);
      return [];
    }
  }));

  return posts.flat();
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

async function findRelatedPosts(currentPost, allPosts) {
  console.log(`Finding related posts for: ${currentPost.title}`);

  const relatedPosts = new Set(); // Use a Set to avoid duplicates

  // Step 1: Check for similar developers
  const developerNames = currentPost.developers.map(dev => dev.name);
  const relatedByDevelopersPromise = Promise.resolve(allPosts.filter(post => {
    const hasMatchingDevelopers = post.developers.some(dev => 
      developerNames.includes(dev.name)
    );
    const isNotCurrentPost = post.title !== currentPost.title;
    return hasMatchingDevelopers && isNotCurrentPost;
  }));

  // Step 2: Check for similar first word in title
  const firstWord = currentPost.title.split(' ')[0].toLowerCase();
  console.log(`First word: ${firstWord}`);
  const relatedByTitlePromise = Promise.resolve(allPosts.filter(post => {
    const startsWithFirstWord = post.title.toLowerCase().startsWith(firstWord);
    const isNotCurrentPost = post.title !== currentPost.title;
    const isNotAlreadyAdded = !relatedPosts.has(post);
    return startsWithFirstWord && isNotCurrentPost && isNotAlreadyAdded;
  }));

  // Step 3: Check for similar tags
  const tagNames = currentPost.tags.map(tag => tag.name);
  const relatedByTagsPromise = Promise.resolve(allPosts.filter(post => {
    const hasMatchingTags = post.tags.some(tag => 
      tagNames.includes(tag.name)
    );
    const isNotCurrentPost = post.title !== currentPost.title;
    const isNotAlreadyAdded = !relatedPosts.has(post);
    return hasMatchingTags && isNotCurrentPost && isNotAlreadyAdded;
  }));

  // Run all steps in parallel
  const [relatedByDevelopers, relatedByTitle, relatedByTags] = await Promise.all([
    relatedByDevelopersPromise,
    relatedByTitlePromise,
    relatedByTagsPromise,
  ]);

  console.log(`Related by developers:`, relatedByDevelopers.map(post => post.title));
  console.log(`Related by title:`, relatedByTitle.map(post => post.title));
  console.log(`Related by tags:`, relatedByTags.map(post => post.title));

  // Add posts from developers to the relatedPosts Set
  relatedByDevelopers.forEach(post => relatedPosts.add(post));

  // If we already have 5 posts, return them
  if (relatedPosts.size >= 5) {
    return Array.from(relatedPosts).slice(0, 5);
  }

  // Add posts from title to the relatedPosts Set
  relatedByTitle.forEach(post => relatedPosts.add(post));

  // If we now have 5 posts, return them
  if (relatedPosts.size >= 5) {
    return Array.from(relatedPosts).slice(0, 5);
  }

  // Shuffle the relatedByTags array to ensure variety
  const shuffledRelatedByTags = shuffleArray(relatedByTags);

  // Add posts from tags to the relatedPosts Set until we reach 5 posts
  for (const post of shuffledRelatedByTags) {
    if (relatedPosts.size >= 5) break;
    relatedPosts.add(post);
  }

  console.log(`Final related posts:`, Array.from(relatedPosts).map(post => post.title));

  // Return up to 5 unique related posts
  return Array.from(relatedPosts).slice(0, 5);
}

// Helper function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

    post.tags.forEach(tag => {
      allTags[tag.name] = allTags[tag.name] || [];
      allTags[tag.name].push(post);
    });
    post.developers.forEach(dev => {
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
      // Find related posts for the current post
  const relatedPosts = await findRelatedPosts(post, subforum.posts); // Await the result
      // Generate post content with related posts
      const postContent = template.generatePostPage(post, subforum, baseurl, relatedPosts);

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
          ${page > 1 ? `<a href="${key}${page - 1 === 1 ? '' : `-${page - 1}`}.html">&laquo; Previous</a>` : ''}
          ${Array.from({ length: totalPages }, (_, i) => `<a href="${key}${i === 0 ? '' : `-${i + 1}`}.html">${i + 1}</a>`).join(' ')}
          ${page < totalPages ? `<a href="${key}-${page + 1}.html">Next &raquo;</a>` : ''}
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
          ${generatePaginationLinks(type, slug, page, totalPages)}
        `;

        const canonicalUrl = page === 1
          ? `${baseurl}vn/${type}/${slug}.html`
          : `${baseurl}vn/${type}/${slug}-${page}.html`;

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
              ? path.join(dirs.public, `vn/${type}/${slug}.html`)
              : path.join(dirs.public, `vn/${type}/${slug}-${page}.html`);

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
    <a href="${baseurl}vn/${type}/${getSlug(name)}.html">${name} (${posts.length})</a>
  </li>
`).join('')}
      </ul>
    `;

    pageGenerationPromises.push(
      (async () => {
        const outputContent = await createFullPage(
          partials,
          indexPageContent,
          `${baseurl}vn/${type}/`,
          `All ${type} - ${meta}`,
          `List of all ${type} related to visual novels`,
          ''
        );

        const outputFilePath = path.join(dirs.public, `vn/${type}/index.html`);
        await ensureDirectoryExists(path.dirname(outputFilePath));
        await writeFile(outputFilePath, outputContent);
        console.log(`Generated: vn/${type}/index.html`);
      })()
    );
  }

  await Promise.all(pageGenerationPromises);
}

// Helper function to generate pagination links
function generatePaginationLinks(type, slug, currentPage, totalPages) {
  return `
    <div class="pagination">
      ${currentPage > 1 ? `<a href="${baseurl}vn/${type}/${slug}${currentPage - 1 === 1 ? '' : `-${currentPage - 1}`}.html">&laquo; Previous</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => `
        <a href="${baseurl}vn/${type}/${slug}${i === 0 ? '' : `-${i + 1}`}.html" ${i + 1 === currentPage ? 'class="active"' : ''}>${i + 1}</a>
      `).join(' ')}
      ${currentPage < totalPages ? `<a href="${baseurl}vn/${type}/${slug}-${currentPage + 1}.html">Next &raquo;</a>` : ''}
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
