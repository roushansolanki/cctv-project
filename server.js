const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Frontend files ko serve karne ke liye
app.use(express.static('public'));

let broadcaster;

io.on('connection', (socket) => {
  // Camera device connect hone par
  socket.on('broadcaster', () => {
    broadcaster = socket.id;
    socket.broadcast.emit('broadcaster');
  });

  // Viewer device connect hone par
  socket.on('watcher', () => {
    socket.to(broadcaster).emit('watcher', socket.id);
  });

  // WebRTC Signaling data exchange
  socket.on('offer', (id, message) => {
    socket.to(id).emit('offer', socket.id, message);
  });
  socket.on('answer', (id, message) => {
    socket.to(id).emit('answer', socket.id, message);
  });
  socket.on('candidate', (id, message) => {
    socket.to(id).emit('candidate', socket.id, message);
  });
  socket.on('disconnect', () => {
    socket.broadcast.emit('disconnectPeer', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
