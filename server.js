const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Increase request size limit for large uploads
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ limit: '4gb', extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize:4* 1024 * 1024 * 1024 } // 1GB max
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Global state
let currentVideo = null;
let isPlaying = false;
let currentTime = 0;

// Handle video upload
app.post('/upload', upload.single('video'), (req, res) => {
  currentVideo = `/uploads/${req.file.filename}`;
  currentTime = 0;
  isPlaying = false;
  io.emit('newVideo', { videoPath: currentVideo, time: currentTime, playing: isPlaying });
  res.send({ videoPath: currentVideo });
});

// Serve HTML
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected');

  // Send current video state to new client
  if (currentVideo) {
    socket.emit('newVideo', { videoPath: currentVideo, time: currentTime, playing: isPlaying });
  }

  // Play event
  socket.on('play', (time) => {
    currentTime = time;
    isPlaying = true;
    socket.broadcast.emit('play', time);
  });

  // Pause event
  socket.on('pause', (time) => {
    currentTime = time;
    isPlaying = false;
    socket.broadcast.emit('pause', time);
  });

  // Seek event
  socket.on('seek', (time) => {
    currentTime = time;
    socket.broadcast.emit('seek', time);
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
