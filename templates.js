const templates = {
  gamesTemplate: {
    generatePostLink: (subforumKey, post) => `/${subforumKey}/${generateSlug(post.title)}`,
 
    generateSubforumPage: (subforum, baseurl) => `
      <h1>${subforum.title}</h1>  
      <p>${subforum.description}</p> 
      <p>${subforum.created_at}</p>
      <img src="${subforum.banner}" alt="${subforum.title}">
      <img src="${subforum.icon}" alt="${subforum.title}">
      <ul>${subforum.posts.map(post => `
        <li>
          <img src="${post.image}" alt="${post.title}" width="50">
          <a href="${baseurl}${post.link.replace(/^\//, '')}">${post.title}</a>
        </li>
      `).join('')}</ul> 
    `,

    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <p>By ${post.author} on ${post.date}</p>
      <img src="${post.image}" alt="${post.title}" width="200">
      <p>${post.content}</p>
      <p><a href="${post.url}" target="_blank">Read more</a></p>
    `,

    generateRSSFeed: (subforum, baseurl) => {
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
    },
  },

  programmingTemplate: {
    generatePostLink: (subforumKey, post) => `/${subforumKey}/${generateSlug(post.title)}`,

    generateSubforumPage: (subforum, baseurl) => `
      <h1>${subforum.title}</h1>
      <p>${subforum.description}</p>
      <p>${subforum.created_at}</p>
      <img src="${subforum.banner}" alt="${subforum.title}">
      <img src="${subforum.icon}" alt="${subforum.title}">
      <ul>${subforum.posts.map(post => `
        <li>
          <img src="${post.image}" alt="${post.title}" width="50">
          <a href="${baseurl}${post.link.replace(/^\//, '')}">${post.title}</a>
          <span>(${post.flair})</span>
          <br>By ${post.author} on ${post.date}
          <p>${post.content1}</p>
        </li>
      `).join('')}</ul>
    `,

    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <p>By ${post.author} on ${post.date}</p>
      <img src="${post.image}" alt="${post.title}" width="200">
      <p>${post.content1}</p>
      <p><a href="${post.url}" target="_blank">Read more</a></p>
      <p><strong>Related to:</strong> ${subforum.title}</p>
    `,

    generateRSSFeed: (subforum, baseurl) => {
      const feedUrl = `${baseurl}${subforum.link.replace(/^\//, '')}.rss`;
      const items = subforum.posts.map(post => `
        <item>
          <title>${post.title}</title>
          <link>${baseurl}${post.link.replace(/^\//, '')}.html</link>
          <description>${post.content1 || ''}</description>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          <guid>${baseurl}${post.link.replace(/^\//, '')}.html</guid>
          <category>${post.flair}</category>
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
    },
  },

   testTemplate: {
    generatePostLink: (subforumKey, post) => `/${subforumKey}/${generateSlug(post.title)}`,

    generateSubforumPage: (subforum, baseurl) => `
      <h1>${subforum.title}</h1>
      <p>${subforum.description}</p>
      <p>${subforum.created_at}</p>
      <img src="${subforum.banner}" alt="${subforum.title}">
      <img src="${subforum.icon}" alt="${subforum.title}">
 <ul>${subforum.posts.map(post => `
        <li>
          <img src="${post.image}" alt="${post.title}" width="50">
          <a href="${baseurl}${post.link.replace(/^\//, '')}">${post.title}</a>
          <span>(${post.flair})</span>
          <br>By ${post.author} on ${post.date}
        </li>
      `).join('')}</ul>
    `,

    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <p>By ${post.author} on ${post.date}</p>
      <img src="${post.image}" alt="${post.title}" width="200">
      <p>${post.content}</p>
      <p><a href="${post.url}" target="_blank">Read more</a></p>
    `,

    generateRSSFeed: (subforum, baseurl) => {
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
    },
  },

  vnTemplate: {
  generatePostLink: (subforumKey, post) => `/${subforumKey}/${generateSlug(post.title)}`,

  generateSubforumPage: (subforum, baseurl) => `
    <h1>${subforum.title}</h1>
    <p>${subforum.description}</p>
    <p>${subforum.created_at}</p>
    <img src="${subforum.banner}" alt="${subforum.title}">
    <img src="${subforum.icon}" alt="${subforum.title}">
    <ul>${subforum.posts.map(post => `
      <li>
        <img src="${post.image.url}" alt="${post.title}" width="50">
        <a href="${baseurl}${post.link.replace(/^\//, '')}">${post.title}</a>
      </li>
    `).join('')}</ul>
  `,

  generatePostPage: (post, subforum, baseurl) => `
    <h1>${post.title}</h1>
    <img src="${post.image.url}" alt="${post.title}" width="200">
    <p>${post.description}</p>

    <h2>Developers</h2>
    <ul>
      ${post.developers.map(dev => `
        <li><a href="${baseurl}${subforum.link}/developers/${generateSlug(dev.name)}.html">${dev.name}</a></li>
      `).join('')}
    </ul>

    <h2>Aliases</h2>
    <ul>
      ${post.aliases.map(alias => `
        <li>${alias}</li>
      `).join('')}
    </ul>

    <h2>Tags</h2>
    <ul>
      ${post.tags.map(tag => `
        <li><a href="${baseurl}${subforum.link}/tags/${generateSlug(tag)}.html">${tag}</a></li>
      `).join('')}
    </ul>

    <h2>Screenshots</h2>
    <div>
      ${post.screenshots.map(screenshot => `
        <img src="${screenshot.url}" alt="Screenshot" width="200">
      `).join('')}
    </div>
  `,

  generateRSSFeed: (subforum, baseurl) => {
    const feedUrl = `${baseurl}${subforum.link.replace(/^\//, '')}.rss`;
    const items = subforum.posts.map(post => `
      <item>
        <title>${post.title}</title>
        <link>${post.link.replace(/^\//, '')}.html</link>
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
  },
},
  
};

// Helper function to generate slugs

const titleCounts = {};

function generateSlug(text) {
  const defaultTitle = "untitled-post";
  
  // Normalize title and convert to lowercase
  const title = (text || defaultTitle).toLowerCase();
  
  // Remove all non-Latin characters and special symbols except spaces and hyphens
  const baseSlug = title
    .replace(/"/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '') // Keep only Latin letters, numbers, spaces, and hyphens
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-')         // Collapse multiple hyphens into one
    .trim()                      // Trim leading/trailing spaces or hyphens
    .substring(0, 40);           // Limit to 40 characters
  
  // Count occurrences of the slug and append a number if necessary
  titleCounts[baseSlug] = (titleCounts[baseSlug] || 0) + 1;
  return titleCounts[baseSlug] === 1 ? baseSlug : `${baseSlug}-${titleCounts[baseSlug]}`;
}

module.exports = {
  templates,
  generateSlug
};
