const https = require('https');
const fs = require('fs');

const tracks = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/The_Entertainer_-_Scott_Joplin.ogg', filename: 'track-1.ogg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Maple_Leaf_Rag_-_Scott_Joplin.ogg', filename: 'track-2.ogg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Kevin_MacLeod_-_Wallpaper.ogg', filename: 'track-3.ogg' }
];

function download(url, dest) {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Kohoot/1.0 (contact: admin@kohoot.local)'
    }
  };
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = new URL(response.headers.location, url).href;
        https.get(redirectUrl, options, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(resolve); });
        });
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const track of tracks) {
    console.log(`Downloading ${track.filename}...`);
    try {
      await download(track.url, `public/music/${track.filename}`);
      console.log(`Downloaded ${track.filename}`);
    } catch (e) {
      console.error(`Failed ${track.filename}:`, e);
    }
  }
}

run();
