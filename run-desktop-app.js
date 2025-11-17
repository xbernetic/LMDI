import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`📡 Request: ${req.url}`);
  
  // Parse URL and remove query parameters
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname;
  
  // Remove leading slash for proper path resolution
  let urlPath = pathname === '/' ? 'index.html' : pathname.substring(1);
  let filePath = path.join(__dirname, 'dist', urlPath);
  
  console.log(`📁 Serving file: ${filePath}`);
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.log(`❌ Error serving ${urlPath}: ${err.code}`);
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1><p>File: ' + urlPath + '</p>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      console.log(`✅ Successfully served: ${urlPath}`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 LMDI Desktop App Running!`);
  console.log(`📊 Open your browser and go to: http://localhost:${PORT}`);
  console.log(`💡 This runs completely on your computer - no internet needed!`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use.`);
    console.log(`💡 Try closing other applications or use a different port.`);
  } else {
    console.log(`❌ Server error:`, err);
  }
});