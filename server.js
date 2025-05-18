
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'browser.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading browser.html');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('Browser source connected');
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Ping clients to keep alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname)); // serve control.html

app.post('/control', (req, res) => {
  const { type, url } = req.body;
  if (!type || !url) return res.status(400).send('Invalid request');
  broadcast({ type, url });
  res.send('Broadcast sent');
});

app.listen(3000, () => console.log('Control panel running on http://localhost:3000'));
server.listen(8080, () => console.log('WebSocket server running on ws://localhost:8080'));

const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload/:type', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filename: req.file.filename });
});
