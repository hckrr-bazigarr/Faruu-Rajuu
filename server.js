const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 1e7 // 10MB limit for image attachments
});

app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://blackbolttin_db_user:mNJ6H5ZrEXx3PDwX@cluster0.nudw9ta.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB successfully connected! 🚀'))
    .catch(err => console.log('MongoDB connection error:', err));

const messageSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    user: String,
    text: String,
    image: String,
    replyTo: Object,
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
        const history = await Message.find().sort({ timestamp: 1 }).limit(200);
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

            const newMessage = new Message(data);
            await newMessage.save();
            io.emit('message', data);
        } catch (err) {
            console.log('Message save error:', err);
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
            await Message.findOneAndUpdate({ id }, { text: '🚫 This message was deleted', image: null, reactions: {} });
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

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        broadcastOnlineUsers();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
