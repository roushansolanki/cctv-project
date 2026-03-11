const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let broadcaster;

io.on('connection', (socket) => {
  socket.on('broadcaster', () => {
    broadcaster = socket.id;
    socket.broadcast.emit('broadcaster');
  });

  socket.on('watcher', () => {
    socket.to(broadcaster).emit('watcher', socket.id);
  });

  socket.on('offer', (id, message) => {
    socket.to(id).emit('offer', socket.id, message);
  });
  socket.on('answer', (id, message) => {
    socket.to(id).emit('answer', socket.id, message);
  });
  socket.on('candidate', (id, message) => {
    socket.to(id).emit('candidate', socket.id, message);
  });
  
  // Remote Commands relay
  socket.on('remoteCommand', (command) => {
    socket.to(broadcaster).emit('remoteCommand', command);
  });

  // Battery info relay
  socket.on('batteryInfo', (info) => {
    socket.broadcast.emit('batteryInfo', info);
  });

  // Messages / Errors relay
  socket.on('viewerMessage', (msg) => {
    socket.broadcast.emit('viewerMessage', msg);
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('disconnectPeer', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
