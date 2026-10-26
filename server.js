const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

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
    status: { type: String, default: 'sent' }, // 'sent', 'delivered', 'read'
    reactions: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const specialNoteSchema = new mongoose.Schema({
    id: { type: String, default: 'current_note', unique: true },
    note: { type: String, default: '' },
    author: { type: String, default: '' },
    seenBy: { type: [String], default: [] }
});

const SpecialNote = mongoose.model('SpecialNote', specialNoteSchema);

const activeUsers = {};

function broadcastOnlineUsers() {
    const uniqueNames = [...new Set(Object.values(activeUsers))];
    io.emit('onlineUsersList', uniqueNames);
}

io.on('connection', async (socket) => {

    socket.on('userJoined', async (username) => {
        activeUsers[socket.id] = username;
        broadcastOnlineUsers();

        try {
            const result = await Message.updateMany(
                { user: { $ne: username }, status: 'sent' },
                { status: 'delivered' }
            );
            if (result.modifiedCount > 0) {
                io.emit('messagesStatusUpdate');
            }
        } catch (err) {
            console.log('Update delivered status error:', err);
        }
    });

    socket.on('updateUsername', ({ oldName, newName }) => {
        activeUsers[socket.id] = newName;
        broadcastOnlineUsers();
    });

    socket.on('getSpecialNote', async (username) => {
        try {
            let noteDoc = await SpecialNote.findOne({ id: 'current_note' });
            if (noteDoc && noteDoc.note) {
                if (noteDoc.author !== username && !noteDoc.seenBy.includes(username)) {
                    socket.emit('showSpecialNote', { note: noteDoc.note, author: noteDoc.author });
                }
            }
        } catch (err) {
            console.log('Get note error:', err);
        }
    });

    socket.on('setSpecialNote', async ({ note, author }) => {
        try {
            await SpecialNote.findOneAndUpdate(
                { id: 'current_note' },
                { note: note, author: author, seenBy: [] },
                { upsert: true, new: true }
            );
            socket.broadcast.emit('notifyNewNote', { note, author });
        } catch (err) {
            console.log('Set note error:', err);
        }
    });

    socket.on('markNoteAsSeen', async (username) => {
        try {
            await SpecialNote.findOneAndUpdate(
                { id: 'current_note' },
                { $addToSet: { seenBy: username } }
            );
        } catch (err) {
            console.log('Mark seen error:', err);
        }
    });

    // STRICT HISTORY SORTING FIX: Timestamp aur _id dono se ascending sort taaki latest msg hamesha last mein aaye
    try {
        const history = await Message.find().read('primary').sort({ timestamp: 1, _id: 1 }).limit(2000);
        socket.emit('loadHistory', history);
    } catch (err) {
        console.log('History load error:', err);
    }

    socket.on('chatMessage', async (data) => {
        try {
            const uniqueNames = [...new Set(Object.values(activeUsers))];
            const otherUsersOnline = uniqueNames.filter(name => name !== data.user);
            
            const msgStatus = otherUsersOnline.length > 0 ? 'delivered' : 'sent';
            const uniqueMsgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11) + '_' + Math.random().toString(36).substring(2, 7);

            const newMessage = new Message({
                id: uniqueMsgId,
                user: data.user,
                text: data.text || '',
                image: data.image || '',
                replyTo: data.replyTo || null,
                edited: false,
                status: msgStatus,
                reactions: {},
                timestamp: new Date()
            });

            await newMessage.save();
            io.emit('message', newMessage);
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
            const unreadCount = await Message.countDocuments({ user: { $ne: readerUsername }, status: { $ne: 'read' } });
            if (unreadCount > 0) {
                await Message.updateMany(
                    { user: { $ne: readerUsername }, status: { $ne: 'read' } },
                    { status: 'read' }
                );
                io.emit('messagesReadUpdate', { reader: readerUsername });
            }
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
