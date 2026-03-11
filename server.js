const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let broadcasters = {}; // Store multiple cameras

io.on('connection', (socket) => {
  // Jab koi phone camera chalu kare
  socket.on('broadcaster', (id) => {
    broadcasters[socket.id] = { id: id, socketId: socket.id };
    socket.broadcast.emit('broadcaster', socket.id, id);
  });

  // Viewer ko saare available cameras batana
  socket.on('getBroadcasters', () => {
    Object.values(broadcasters).forEach(b => {
        socket.emit('broadcaster', b.socketId, b.id);
    });
  });

  socket.on('watcher', (broadcasterId) => {
    socket.to(broadcasterId).emit('watcher', socket.id);
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

  // Control commands targeted to specific phone
  socket.on('remoteCommand', (targetId, command) => {
    socket.to(targetId).emit('remoteCommand', command);
  });

  socket.on('voiceCommand', (targetId, audioData) => {
    socket.to(targetId).emit('voiceCommand', audioData);
  });

  socket.on('batteryInfo', (info) => { socket.broadcast.emit('batteryInfo', socket.id, info); });
  socket.on('gpsInfo', (info) => { socket.broadcast.emit('gpsInfo', socket.id, info); });

  socket.on('disconnect', () => {
    delete broadcasters[socket.id];
    socket.broadcast.emit('disconnectPeer', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
