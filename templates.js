const templates = {
  gamesTemplate: {
    generateJSON: (post, subforum, baseurl) => {
      return {
        title: post.title,
        link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
        description: post.content || '',
        date: post.date,
        author: post.author,
        image: post.image,
        subforum: {
          title: subforum.title,
          description: subforum.description,
          link: `${baseurl}${subforum.link.replace(/^\//, '')}.json`,
        },
      };
    },
  },

  programmingTemplate: {
    generateJSON: (post, subforum, baseurl) => {
      return {
        title: post.title,
        link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
        description: post.content1 || '',
        date: post.date,
        author: post.author,
        image: post.image,
        flair: post.flair,
        subforum: {
          title: subforum.title,
          description: subforum.description,
          link: `${baseurl}${subforum.link.replace(/^\//, '')}.json`,
        },
      };
    },
  },

  testTemplate: {
    generateJSON: (post, subforum, baseurl) => {
      return {
        title: post.title,
        link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
        description: post.content || '',
        date: post.date,
        author: post.author,
        image: post.image,
        subforum: {
          title: subforum.title,
          description: subforum.description,
          link: `${baseurl}${subforum.link.replace(/^\//, '')}.json`,
        },
      };
    },
  },

  vnTemplate: {
    generateJSON: (post, subforum, baseurl) => {
      return {
        title: post.title,
        link: `${baseurl}${post.link.replace(/^\//, '')}.json`,
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
          link: `${baseurl}${subforum.link.replace(/^\//, '')}.json`,
        },
      };
    },
  },
};

module.exports = {
  templates,
};
