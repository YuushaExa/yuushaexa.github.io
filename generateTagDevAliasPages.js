// generateTagDevAliasPages.js
const path = require('path');
const { ensureDirectoryExists, createFullPage } = require('./ssg.js'); // Adjust the path as needed
const { templates, generateSlugtags } = require('./templates');

const generatePaginationLinks = (type, slug, currentPage, totalPages) => {
  return `
    <div class="pagination">
      ${currentPage > 1 ? `<a href="${baseurl}vn/${type}/${slug}${currentPage - 1 === 1 ? '' : `-${currentPage - 1}`}.html">&laquo; Previous</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => `
        <a href="${baseurl}vn/${type}/${slug}${i === 0 ? '' : `-${i + 1}`}.html" ${i + 1 === currentPage ? 'class="active"' : ''}>${i + 1}</a>
      `).join(' ')}
      ${currentPage < totalPages ? `<a href="${baseurl}vn/${type}/${slug}-${currentPage + 1}.html">Next &raquo;</a>` : ''}
    </div>
  `;
};

const generateTagDevAliasPages = async (partials, allTags, allDevelopers, baseurl, dirs) => {
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
          <h1>${name}</h1>
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
        ${Object.keys(data).map(name => `
          <li>
            <a href="${baseurl}vn/${type}/${getSlug(name)}.html">${name}</a>
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
};

module.exports = generateTagDevAliasPages;
