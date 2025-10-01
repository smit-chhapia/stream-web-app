const socket = io();
let player;
let ignoreEvents = false;

// Upload video
document.getElementById('uploadBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput.files.length) return alert('Select a video');

  const formData = new FormData();
  formData.append('video', fileInput.files[0]);

  fetch('/upload', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => console.log('Uploaded:', data.url))
    .catch(err => console.error(err));
});

// Handle video changes
socket.on('changeVideo', (state) => {
  const container = document.getElementById('playerContainer');

  // Remove old player
  container.innerHTML = '';

  // Create new video element
  const videoEl = document.createElement('video');
  videoEl.id = 'uploadVideo';
  videoEl.width = 800;
  videoEl.height = 450;
  videoEl.controls = true;
  videoEl.src = state.videoUrl;
  videoEl.currentTime = state.currentTime || 0;
  container.appendChild(videoEl);

  player = videoEl;

  // Wait for metadata to load before playing
  player.addEventListener('loadedmetadata', () => {
    if (state.playing) {
      player.play().catch(() => {
        console.log('Autoplay blocked, user must click play');
      });
    }
  });

  // Attach sync events
  player.addEventListener('play', () => {
    if (!ignoreEvents) socket.emit('play', player.currentTime);
  });

  player.addEventListener('pause', () => {
    if (!ignoreEvents) socket.emit('pause', player.currentTime);
  });

  player.addEventListener('seeking', () => {
    if (!ignoreEvents) socket.emit('seek', player.currentTime);
  });
});

// Sync play/pause/seek
socket.on('play', (time) => {
  if (!player) return;
  ignoreEvents = true;
  player.currentTime = time;
  player.play().catch(() => {});
  setTimeout(() => ignoreEvents = false, 500);
});

socket.on('pause', (time) => {
  if (!player) return;
  ignoreEvents = true;
  player.currentTime = time;
  player.pause();
  setTimeout(() => ignoreEvents = false, 500);
});

socket.on('seek', (time) => {
  if (!player) return;
  ignoreEvents = true;
  player.currentTime = time;
  setTimeout(() => ignoreEvents = false, 500);
});
