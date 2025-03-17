const fs = require('fs').promises;
const path = require('path');
const { templates } = require('./templates');
const baseurl = 'https://yuushaexa.github.io/'; // You can change this to any base URL

const dirs = {
  partials: path.join(__dirname, 'partials'),
  public: path.join(__dirname, 'public'),
  subforums: path.join(__dirname, 'subforums'),
};

// Helper functions (unchanged)
async function readFile(filePath) { /* ... */ }
async function writeFile(filePath, content) { /* ... */ }
async function ensureDirectoryExists(dirPath) { /* ... */ }
async function loadFilesFromDir(dirPath, fileType, transform = (data) => data) { /* ... */ }
async function loadMetadata(file) { /* ... */ }
async function mergeMetadata(posts, metadata, key = 'title') { /* ... */ }
async function loadSubforumData(subforum, subforumKey) { /* ... */ }
async function createFullPage(partials, mainContent, canonicalUrl = '', title = 'Default Title', description = '', image = '') { /* ... */ }
async function generateSpecialPages(partials) { /* ... */ }

async function generateSubforumPages(partials, subforums) {
  const postsPerPage = 10; // Number of posts per page
  const batchSize = 50; // Process 50 posts at a time

  await Promise.all(Object.entries(subforums).map(async ([key, subforum]) => {
    const template = templates[subforum.template];
    if (!template) {
      throw new Error(`Template ${subforum.template} not found for subforum ${key}`);
    }

    // Load posts with folder-based links
    const posts = await loadSubforumData(subforum, key);
    subforum.posts = posts;

    // Generate RSS feed
    const rssFeed = template.generateRSSFeed(subforum, baseurl);
    await writeFile(path.join(dirs.public, `${key}.rss`), rssFeed);
    console.log(`Generated: ${key}.rss`);

    // Process posts in batches
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      await Promise.all(batch.map(async post => {
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
    }

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
  }));
}

async function runSSG() {
  try {
    await ensureDirectoryExists(dirs.public);
    const [partials, subforums] = await Promise.all([
      loadFilesFromDir(dirs.partials, '.html'),
      loadFilesFromDir(dirs.subforums, '.json', JSON.parse),
    ]);

    await generateSpecialPages(partials);
    await generateSubforumPages(partials, subforums); // Only generate subforum pages

    console.log('SSG build complete!');
  } catch (err) {
    console.error('SSG build failed:', err.stack || err.message);
    process.exit(1);
  }
}

runSSG();
