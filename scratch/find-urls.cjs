const https = require('https');

const pages = [
  'https://commons.wikimedia.org/wiki/File:The_Entertainer_-_Scott_Joplin.ogg',
  'https://commons.wikimedia.org/wiki/File:Maple_Leaf_Rag_-_Scott_Joplin.ogg',
  'https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Wallpaper.ogg'
];

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Kohoot/1.0 (contact: admin@kohoot.local)'
  }
};

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });
}

async function run() {
  for (const page of pages) {
    console.log(`Fetching ${page}...`);
    const html = await fetchPage(page);
    // Find hrefs ending in .ogg containing /upload.wikimedia.org/
    const match = html.match(/https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[^\s"'>]+\.ogg/g);
    if (match) {
      console.log(`Found URLs for ${page}:`, [...new Set(match)]);
    } else {
      console.log(`No match for ${page}`);
    }
  }
}

run();
