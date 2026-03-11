const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// 1. Basic Security: Token Authentication
// Har connection (Camera ya Viewer) ko connect hone se pehle ye secret token dena hoga
const SECRET_TOKEN = process.env.AUTH_TOKEN || "MySuperSecretCCTV2026"; 

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === SECRET_TOKEN) {
        next();
    } else {
        next(new Error("Authentication Error: Invalid Token"));
    }
});

// 2. Multi-Camera Storage
// Format: { "cam-hall": socket.id, "cam-gate": socket.id }
const connectedCameras = new Map(); 

io.on('connection', (socket) => {
    console.log(`[+] New device authenticated: ${socket.id}`);

    // --- CAMERA REGISTRATION ---
    socket.on('register_camera', (deviceId) => {
        if (!deviceId) return socket.emit('error', 'Device ID required');
        
        // Remove older connection if same ID reconnects
        if (connectedCameras.has(deviceId)) {
            socket.to(connectedCameras.get(deviceId)).emit('forceDisconnect');
        }

        connectedCameras.set(deviceId, socket.id);
        socket.deviceId = deviceId; // Save to socket instance
        socket.role = 'camera';
        
        socket.join(`camera_room_${deviceId}`);
        console.log(`[🎥] Camera Ready: ${deviceId}`);
    });

        // --- VIEWER CONNECTION ---
    socket.on('watch_camera', (deviceId) => {
        socket.role = 'viewer';
        
        // NAYA FIX: Purane kisi bhi camera room se leave karein taaki data mix na ho
        socket.rooms.forEach(room => {
            if (room.startsWith('viewer_room_')) socket.leave(room);
        });

        const camSocketId = connectedCameras.get(deviceId);
        
        if (camSocketId) {
            socket.join(`viewer_room_${deviceId}`);
            socket.to(camSocketId).emit('watcher', socket.id);
            console.log(`[👁️] Viewer connected to: ${deviceId}`);
        } else {
            socket.emit('systemError', 'Camera is offline or invalid Device ID');
        }
    });


    // --- WebRTC Signaling (Routed specific to Device) ---
    socket.on('offer', (targetId, message) => { socket.to(targetId).emit('offer', socket.id, message); });
    socket.on('answer', (targetId, message) => { socket.to(targetId).emit('answer', socket.id, message); });
    socket.on('candidate', (targetId, message) => { socket.to(targetId).emit('candidate', socket.id, message); });

    // --- Telemetry & Commands (Routed safely) ---
    socket.on('remoteCommand', (deviceId, command) => { 
        const camSocketId = connectedCameras.get(deviceId);
        if (camSocketId) socket.to(camSocketId).emit('remoteCommand', command); 
    });
        // --- Walkie-Talkie Voice Relay ---
    socket.on('voiceCommand', (deviceId, audioData) => { 
        const camSocketId = connectedCameras.get(deviceId);
        if (camSocketId) socket.to(camSocketId).emit('voiceCommand', audioData); 
    });
    
    socket.on('telemetry', (data) => {
        if (socket.role === 'camera') {
            socket.to(`viewer_room_${socket.deviceId}`).emit('telemetryData', data);
        }
    });

    // --- Error Handling & Disconnect ---
    socket.on('disconnect', () => {
        if (socket.role === 'camera') {
            connectedCameras.delete(socket.deviceId);
            // Alert all viewers watching this specific camera
            socket.to(`viewer_room_${socket.deviceId}`).emit('systemError', 'Camera disconnected unexpectedly.');
            console.log(`[❌] Camera Offline: ${socket.deviceId}`);
        } else if (socket.role === 'viewer') {
            socket.broadcast.emit('disconnectPeer', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Secure Multi-Cam Server running on port ${PORT}`));
