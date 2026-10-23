const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI || 'YOUR_MONGODB_ATLAS_URI', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.log("MongoDB Connection Error: ", err));

// Message Schema
const messageSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    user: String,
    text: String,
    replyTo: Object,
    reactions: { type: Map, of: String, default: {} },
    status: { type: String, default: 'sent' },
    edited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

app.use(express.static(path.join(__dirname)));

let onlineUsers = new Set();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('userJoined', (username) => {
        socket.username = username;
        onlineUsers.add(username);
        io.emit('onlineUsersList', Array.from(onlineUsers));

        // Load Chat History sorted chronologically (oldest to newest)
        Message.find().sort({ createdAt: 1 }).then(messages => {
            socket.emit('loadHistory', messages);
        });
    });

    socket.on('chatMessage', async (data) => {
        try {
            // Ensure ID uniqueness check before saving
            let msgId = data.id;
            const existing = await Message.findOne({ id: msgId });
            if (existing) {
                msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            }

            const newMessage = new Message({
                id: msgId,
                user: data.user,
                text: data.text,
                replyTo: data.replyTo,
                createdAt: data.timestamp || Date.now()
            });
            
            await newMessage.save();
            io.emit('message', newMessage);
        } catch (err) {
            console.error("❌ Error saving message to MongoDB:", err.message);
        }
    });

    socket.on('reactMessage', async (data) => {
        try {
            const msg = await Message.findOne({ id: data.id });
            if (msg) {
                if (!msg.reactions) msg.reactions = new Map();
                msg.reactions.set(data.user, data.emoji);
                await msg.save();
                
                const reactionsObj = Object.fromEntries(msg.reactions);
                io.emit('messageReacted', { id: data.id, reactions: reactionsObj });
            }
        } catch (err) {
            console.log("Error reacting:", err);
        }
    });

    socket.on('editMessage', async (data) => {
        try {
            const msg = await Message.findOneAndUpdate(
                { id: data.id },
                { text: data.text, edited: true },
                { new: true }
            );
            if (msg) {
                io.emit('messageUpdated', { id: data.id, text: data.text });
            }
        } catch (err) {
            console.log("Error editing message:", err);
        }
    });

    socket.on('deleteEveryone', async (id) => {
        try {
            await Message.findOneAndUpdate({ id: id }, { text: '🚫 This message was deleted' });
            io.emit('messageDeletedEveryone', id);
        } catch (err) {
            console.log("Error deleting message:", err);
        }
    });

    socket.on('markAsRead', async (username) => {
        try {
            await Message.updateMany({ status: { $ne: 'read' } }, { status: 'read' });
            io.emit('messagesReadUpdate');
        } catch (err) {
            console.log("Error updating read status:", err);
        }
    });

    // WebRTC Signaling
    socket.on('callUser', (data) => {
        socket.broadcast.emit('incomingCall', { signal: data.signalData, from: data.from });
    });

    socket.on('answerCall', (data) => {
        socket.broadcast.emit('callAccepted', data.signal);
    });

    socket.on('iceCandidate', (candidate) => {
        socket.broadcast.emit('iceCandidate', candidate);
    });

    socket.on('endCall', () => {
        socket.broadcast.emit('callEnded');
    });

    socket.on('typing', (user) => {
        socket.broadcast.emit('displayTyping', user);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            onlineUsers.delete(socket.username);
            io.emit('onlineUsersList', Array.from(onlineUsers));
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
