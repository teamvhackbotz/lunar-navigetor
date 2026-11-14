const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8189;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found: ' + reqPath);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  try {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const cmd = `"${chromePath}" --headless --disable-gpu --dump-dom "http://localhost:${PORT}/index.html"`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 8000 });
    
    // Check if #mount-timeline has content
    const hasMountTimeline = output.includes('mount-timeline');
    const hasBottomCockpit = output.includes('bottom-cockpit-bar');
    const hasTimelineScrubber = output.includes('timeline-scrubber');

    console.log('DOM check:');
    console.log('  hasMountTimeline:', hasMountTimeline);
    console.log('  hasBottomCockpit:', hasBottomCockpit);
    console.log('  hasTimelineScrubber:', hasTimelineScrubber);
    
    // Extract #mount-timeline content
    const mountTimelineIdx = output.indexOf('id="mount-timeline"');
    if (mountTimelineIdx !== -1) {
      console.log('mount-timeline excerpt:', output.substring(mountTimelineIdx, mountTimelineIdx + 400));
    }
  } catch (err) {
    console.error('Error running chrome:', err.message);
  } finally {
    server.close();
  }
});
