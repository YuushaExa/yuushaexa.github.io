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
// index and pages
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
// post 
    generatePostPage: (post, subforum, baseurl) => `
      <h1>${post.title}</h1>
      <img src="${post.image.url}" alt="${post.title}" width="200">
      <p>${post.description}</p>

      <h2>Developers</h2>
  <ul>
    ${post.developers.map(dev => `
      <li><a href="${baseurl}vn/developers/${generateSlugtags(dev.name)}.html">${dev.name}</a>
      </li>
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
      <li><a href="${baseurl}vn/tags/${generateSlugtags(tag)}.html">${tag}</a>
      ${getPostsByField('tags', tag, subforum.posts, baseurl, 5)}
</li>
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
  generateJSON: (post, subforum, baseurl) => {
      return JSON.stringify({
        title: post.title,
        link: `${baseurl}${post.link.replace(/^\//, '')}.html`,
        description: post.description || '',
        date: post.date,
        image: post.image,
        developers: post.developers,
        aliases: post.aliases,
        tags: post.tags,
        screenshots: post.screenshots,
        subforum: {
          title: subforum.title,
          description: subforum.description,
          link: `${baseurl}${subforum.link.replace(/^\//, '')}.html`,
        },
      }, null, 2);
    },
  
};

// Helper function to generate slugs

const titleCounts = {};

function generateSlug(text) {
  const defaultTitle = "untitled-post";
  const title = (text || defaultTitle).toLowerCase(); // Normalize title and convert to lowercase
  const baseSlug = title
        .replace(/\?/g, '') // Remove any question marks
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens into one
    .trim() // Trim leading/trailing spaces
    .substring(0, 40); // Limit to 40 characters
  titleCounts[baseSlug] = (titleCounts[baseSlug] || 0) + 1;
  return titleCounts[baseSlug] === 1 ? baseSlug : `${baseSlug}-${titleCounts[baseSlug]}`;
}
// tags etc
 function generateSlugtags(text) {
  const defaultTitle = "untitled-post";
  const title = (text || defaultTitle).toLowerCase(); // Normalize title and convert to lowercase
  const baseSlug = title
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens into one
    .trim() // Trim leading/trailing spaces
    .substring(0, 40); // Limit to 40 characters
  return baseSlug; // Return the base slug without a counter
}

//         ${getPostsByField('developers', dev.name, subforum.posts, 5, baseurl)} = example, very ineffective 
// related posts
function getPostsByField(field, value, allPosts, options = {}) {
    const { baseurl = '', limit = 5 } = options; // Destructure options with defaults

    const filters = {
        tags: (post) => post.tags.some(tag => tag === value),
        developers: (post) => post.developers.some(dev => dev.name === value),
    };

    if (!filters[field]) throw new Error(`Unsupported field: ${field}`);

    // Filter the posts
    const posts = allPosts.filter(filters[field]);

    // If no posts are found, return a message
    if (posts.length === 0) return '<p>No posts found.</p>';

    // Get the first word of the first post's title to determine priority
    const priorityFirstWord = posts[0].title.split(' ')[0].toLowerCase();

    // Group posts by their first word and sort them
    const groupedPosts = new Map();

    posts.forEach(post => {
        const firstWord = post.title.split(' ')[0];
        const normalizedFirstWord = firstWord.toLowerCase();

        if (!groupedPosts.has(normalizedFirstWord)) {
            groupedPosts.set(normalizedFirstWord, { original: firstWord, posts: [] });
        }
        groupedPosts.get(normalizedFirstWord).posts.push(post);
    });

    // Sort the groups
    const sortedGroups = Array.from(groupedPosts.keys()).sort((a, b) => {
        if (a === priorityFirstWord) return -1; // The priority group goes first
        if (b === priorityFirstWord) return 1;

        const [alphaA, numA] = splitAlphaNum(a);
        const [alphaB, numB] = splitAlphaNum(b);

        if (alphaA !== alphaB) return alphaA.localeCompare(alphaB); // Alphabetical sorting
        return numA - numB; // Numerical sorting
    });

    // Limit the number of groups displayed 
    const limitedGroups = sortedGroups.slice(0, limit);

    // Generate the HTML list with grouped posts
    const postList = limitedGroups.map(group => {
        const groupData = groupedPosts.get(group);
        return `
            <ul>
                ${groupData.posts.map(post => `
                    <li>
                        <a href="/${post.link.replace(/^\//, '')}.html">${post.title}</a>
                    </li>
                `).join('')}
            </ul>
        `;
    }).join('');

    // Display the total number of results
    const totalResults = posts.length;
    const totalResultsHtml = `<p>Total results: ${totalResults}</p>`;

    return `<ul>${postList}</ul>${totalResultsHtml}`;
}

// Function to extract alphabetical and numeric parts for sorting
function splitAlphaNum(str) {
    const match = str.match(/^([a-zA-Z]+)(\d+)?$/);
    return match ? [match[1], match[2] ? parseInt(match[2], 10) : 0] : [str, 0];
}

module.exports = {
  templates,
  generateSlugtags
};
