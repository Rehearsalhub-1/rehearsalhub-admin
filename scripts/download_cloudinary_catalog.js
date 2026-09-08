/**
 * ============================================================================
 * Bulk Media Downloader: Cloudinary to Local Clean Directory
 * ============================================================================
 *
 * This script downloads all songs, isolated audio stems, and sheet music from
 * Cloudinary, renaming each file cleanly by Song Title and Part:
 *
 * Output Structure:
 *   downloads/
 *     └── The Name of Jesus/
 *           ├── The Name of Jesus - Full Mix.mp3
 *           ├── The Name of Jesus - Soprano Stem.mp3
 *           ├── The Name of Jesus - Alto Stem.mp3
 *           └── The Name of Jesus - Conductor Score.pdf
 *
 * Usage:
 *   node scripts/download_cloudinary_catalog.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://loveworld-singers-api.fly.dev/api/v1';
const OUTPUT_DIR = path.join(__dirname, '..', 'downloads');

// Helper to sanitize filenames for Windows / Mac / Linux
function sanitizeName(name) {
  if (!name) return 'Untitled';
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Resilient file downloader
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 1024) {
        console.log(`  [Exists, Skipping] ${path.basename(destPath)}`);
        return resolve(destPath);
      }
    }

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileStream = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      // Handle redirects (HTTP 301, 302, 307)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        fileStream.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`  [Downloaded] ${path.basename(destPath)}`);
        resolve(destPath);
      });
    }).on('error', (err) => {
      fileStream.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Fetch helper
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('====================================================');
  console.log('Starting Cloudinary Bulk Downloader & File Renamer');
  console.log(`Destination Directory: ${OUTPUT_DIR}`);
  console.log('====================================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let songs = [];
  try {
    console.log(`Fetching songs catalog from ${API_BASE_URL}/songs/master...`);
    const res = await fetchJson(`${API_BASE_URL}/songs/master?limit=1000`);
    songs = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn(`Could not reach live API (${err.message}). Checking local backups...`);
    // Fallback to local snapshot backup if present
    const backupPath = path.join(__dirname, '..', '..', 'rehearsalhub-api', 'backups', 'snapshot_1787937230102', 'songs.json');
    if (fs.existsSync(backupPath)) {
      console.log(`Loading songs from local backup: ${backupPath}`);
      songs = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    }
  }

  if (!songs.length) {
    console.error('No songs found to download. Please ensure API_BASE_URL is reachable.');
    return;
  }

  console.log(`Found ${songs.length} songs. Beginning download queue...\n`);

  let totalDownloaded = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const songTitle = sanitizeName(song.title || song.name || `Song_${i + 1}`);
    const songFolder = path.join(OUTPUT_DIR, songTitle);

    console.log(`[${i + 1}/${songs.length}] Processing: ${songTitle}`);

    // 1. Full Audio Mix
    const mainAudio = song.audioFile || song.audioUrl || (song.audioUrls && song.audioUrls.full);
    if (mainAudio && typeof mainAudio === 'string' && mainAudio.startsWith('http')) {
      const ext = mainAudio.split('?')[0].split('.').pop() || 'mp3';
      const dest = path.join(songFolder, `${songTitle} - Full Mix.${ext}`);
      try {
        await downloadFile(mainAudio, dest);
        totalDownloaded++;
      } catch (e) {
        console.error(`    x Failed downloading Full Mix: ${e.message}`);
      }
    }

    // 2. Multitrack Vocal Stems (Soprano, Alto, Tenor, Bass, Band)
    if (song.audioUrls && typeof song.audioUrls === 'object') {
      for (const [partKey, partUrl] of Object.entries(song.audioUrls)) {
        if (partKey === 'full') continue; // Already downloaded
        if (partUrl && typeof partUrl === 'string' && partUrl.startsWith('http')) {
          const cleanPart = sanitizeName(partKey.toUpperCase());
          const ext = partUrl.split('?')[0].split('.').pop() || 'mp3';
          const dest = path.join(songFolder, `${songTitle} - ${cleanPart} Stem.${ext}`);
          try {
            await downloadFile(partUrl, dest);
            totalDownloaded++;
          } catch (e) {
            console.error(`    x Failed downloading ${partKey} stem: ${e.message}`);
          }
        }
      }
    }

    // 3. Sheet Music / Score
    const sheetUrl = song.sheetMusicUrl || song.scoreUrl || song.pdfUrl;
    if (sheetUrl && typeof sheetUrl === 'string' && sheetUrl.startsWith('http')) {
      const ext = sheetUrl.split('?')[0].split('.').pop() || 'pdf';
      const dest = path.join(songFolder, `${songTitle} - Sheet Music.${ext}`);
      try {
        await downloadFile(sheetUrl, dest);
        totalDownloaded++;
      } catch (e) {
        console.error(`    x Failed downloading Sheet Music: ${e.message}`);
      }
    }
  }

  console.log('\n====================================================');
  console.log(`Bulk download complete! Downloaded files are saved in:`);
  console.log(OUTPUT_DIR);
  console.log('====================================================');
}

main().catch(console.error);
