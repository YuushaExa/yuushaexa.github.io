const fs = require('fs').promises;
const path = require('path');

const subforumsDir = path.join(__dirname, 'subforums');
const mtimeFilePath = path.join(__dirname, 'mtime.json');

async function getFileModificationTimes(dir) {
  const files = await fs.readdir(dir);
  const mtimes = {};

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    mtimes[file] = stats.mtime.toISOString(); // Store modification time in ISO format
  }

  return mtimes;
}

async function updateMtimeFile() {
  try {
    const currentMtimes = await getFileModificationTimes(subforumsDir);
    await fs.writeFile(mtimeFilePath, JSON.stringify(currentMtimes, null, 2), 'utf-8');
    console.log('Updated mtime.json with latest modification times.');
  } catch (err) {
    console.error('Error updating mtime.json:', err);
    process.exit(1);
  }
}

updateMtimeFile();
