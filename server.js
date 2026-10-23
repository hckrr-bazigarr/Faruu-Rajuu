const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Socket.io 10MB payload limit for photos
const io = new Server(server, {
    maxHttpBufferSize: 10 * 1024 * 1024 
});

app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://blackbolttin_db_user:mNJ6H5ZrEXx3PDwX@cluster0.nudw9ta.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB successfully connected! 🚀'))
    .catch(err => console.log('MongoDB connection error:', err));

const messageSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    user: { type: String, required: true },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    replyTo: { type: Object, default: null },
    edited: { type: Boolean, default: false },
    status: { type: String, default: 'sent' },
    reactions: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const activeUsers = {};

function broadcastOnlineUsers() {
    const uniqueNames = [...new Set(Object.values(activeUsers))];
    io.emit('onlineUsersList', uniqueNames);
}

io.on('connection', async (socket) => {

    socket.on('userJoined', (username) => {
        activeUsers[socket.id] = username;
        broadcastOnlineUsers();
    });

    socket.on('updateUsername', ({ oldName, newName }) => {
        activeUsers[socket.id] = newName;
        broadcastOnlineUsers();
    });

    try {
        const history = await Message.find().read('primary').sort({ timestamp: 1, _id: 1 }).limit(1000);
        socket.emit('loadHistory', history);
    } catch (err) {
        console.log('History load error:', err);
    }

    socket.on('chatMessage', async (data) => {
        try {
            const uniqueNames = [...new Set(Object.values(activeUsers))];
            const otherUsersOnline = uniqueNames.filter(name => name !== data.user);
            
            data.status = otherUsersOnline.length > 0 ? 'delivered' : 'sent';
            data.reactions = {};

            const newMessage = new Message({
                id: data.id,
                user: data.user,
                text: data.text || '',
                image: data.image || '',
                replyTo: data.replyTo || null,
                edited: false,
                status: data.status,
                reactions: {},
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
            });

            await newMessage.save();
            io.emit('message', data);
        } catch (err) {
            console.log('❌ MESSAGE SAVE ERROR:', err);
        }
    });

    socket.on('reactMessage', async ({ id, user, emoji }) => {
        try {
            const message = await Message.findOne({ id });
            if (message) {
                if (!message.reactions) message.reactions = {};
                if (message.reactions[user] === emoji) {
                    delete message.reactions[user];
                } else {
                    message.reactions[user] = emoji;
                }
                message.markModified('reactions');
                await message.save();
                io.emit('messageReacted', { id, reactions: message.reactions });
            }
        } catch (err) {
            console.log('Reaction error:', err);
        }
    });

    socket.on('markAsRead', async (readerUsername) => {
        try {
            await Message.updateMany(
                { user: { $ne: readerUsername }, status: { $ne: 'read' } },
                { status: 'read' }
            );
            io.emit('messagesReadUpdate');
        } catch (err) {
            console.log('Mark read error:', err);
        }
    });

    socket.on('editMessage', async ({ id, text }) => {
        try {
            await Message.findOneAndUpdate({ id }, { text, edited: true });
            io.emit('messageUpdated', { id, text });
        } catch (err) {
            console.log('Edit error:', err);
        }
    });

    socket.on('deleteEveryone', async (id) => {
        try {
            await Message.findOneAndUpdate({ id }, { text: '🚫 This message was deleted', reactions: {} });
            io.emit('messageDeletedEveryone', id);
        } catch (err) {
            console.log('Delete error:', err);
        }
    });

    socket.on('typing', (user) => {
        socket.broadcast.emit('displayTyping', user);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    socket.on('callUser', (data) => {
        socket.broadcast.emit('incomingCall', { signal: data.signalData, from: data.from });
    });

    socket.on('answerCall', (data) => {
        socket.broadcast.emit('callAccepted', data.signal);
    });

    socket.on('iceCandidate', (data) => {
        socket.broadcast.emit('iceCandidate', data);
    });

    socket.on('endCall', () => {
        socket.broadcast.emit('callEnded');
    });

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        broadcastOnlineUsers();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
