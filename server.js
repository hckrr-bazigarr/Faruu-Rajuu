const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Same folder se direct index.html serve karega
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Ek user connect ho gaya:', socket.id);

    socket.on('chatMessage', (data) => {
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnect ho gaya.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server chal pada: http://localhost:${PORT}`);
});
