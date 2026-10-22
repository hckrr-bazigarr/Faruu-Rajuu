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

    socket.emit('loadHistory', messageHistory);

    socket.on('chatMessage', (data) => {
        messageHistory.push(data);
        if (messageHistory.length > 100) {
            messageHistory.shift();
        }
        io.emit('message', data);
    });

    // Typing Indicator Events
    socket.on('typing', (data) => {
        socket.broadcast.emit('displayTyping', data);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    socket.on('deleteForEveryone', (msgId) => {
        const msg = messageHistory.find(m => m.id === msgId);
        if (msg) {
            msg.text = '🚫 This message was deleted';
            msg.deletedForEveryone = true;
            io.emit('updateMessage', msg);
        }
    });

    socket.on('editMessage', ({ id, newText }) => {
        const msg = messageHistory.find(m => m.id === id);
        if (msg) {
            msg.text = newText;
            msg.edited = true;
            io.emit('updateMessage', msg);
        }
    });

    socket.on('disconnect', () => {
        onlineUsers--;
        if (onlineUsers < 0) onlineUsers = 0;
        io.emit('onlineCount', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
