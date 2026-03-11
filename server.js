const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let broadcaster;

io.on('connection', (socket) => {
  socket.on('broadcaster', () => { broadcaster = socket.id; socket.broadcast.emit('broadcaster'); });
  socket.on('watcher', () => { socket.to(broadcaster).emit('watcher', socket.id); });
  
  socket.on('offer', (id, message) => { socket.to(id).emit('offer', socket.id, message); });
  socket.on('answer', (id, message) => { socket.to(id).emit('answer', socket.id, message); });
  socket.on('candidate', (id, message) => { socket.to(id).emit('candidate', socket.id, message); });
  
  // Remote Commands & Info Relay
  socket.on('remoteCommand', (command) => { socket.to(broadcaster).emit('remoteCommand', command); });
  socket.on('batteryInfo', (info) => { socket.broadcast.emit('batteryInfo', info); });
  socket.on('gpsInfo', (info) => { socket.broadcast.emit('gpsInfo', info); }); // NAYA: GPS
  socket.on('viewerMessage', (msg) => { socket.broadcast.emit('viewerMessage', msg); });
  socket.on('voiceCommand', (audioData) => { socket.to(broadcaster).emit('voiceCommand', audioData); });

  socket.on('disconnect', () => { socket.broadcast.emit('disconnectPeer', socket.id); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
