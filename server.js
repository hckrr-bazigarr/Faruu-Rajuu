const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let messageHistory = [];
let onlineUsers = 0;

io.on('connection', (socket) => {
    onlineUsers++;
    io.emit('onlineCount', onlineUsers);

    // Purani chat history bhej do
    socket.emit('loadHistory', messageHistory);

    // Naya message ya reply aane par
    socket.on('chatMessage', (data) => {
        messageHistory.push(data);
        if (messageHistory.length > 100) {
            messageHistory.shift();
        }
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        onlineUsers--;
        if (onlineUsers < 0) onlineUsers = 0;
        io.emit('onlineCount', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server chal pada: http://localhost:${PORT}`);
});
