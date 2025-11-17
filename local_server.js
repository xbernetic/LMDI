// Simple local server for the built files
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 LMDI App running at http://localhost:${PORT}`);
  console.log(`📊 Open your browser and navigate to the URL above`);
  console.log(`💡 This server runs completely on your local machine`);
});

console.log('Starting local LMDI server...');