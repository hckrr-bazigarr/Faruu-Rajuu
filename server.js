const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// MongoDB connection string configured with your credentials[span_2](start_span)[span_2](end_span)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://blackbolttin_db_user:mNJ6H5ZrEXx3PDwX@cluster0.nudw9ta.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB successfully connected! 🚀'))
    .catch(err => console.log('MongoDB connection error:', err));

// Message Schema & Model
const messageSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    user: String,
    text: String,
    replyTo: Object,
    edited: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

let onlineUsers = 0;

io.on('connection', async (socket) => {
    onlineUsers++;
    io.emit('onlineCount', onlineUsers);

    // Database se purane messages load karna (Last 100 messages)
    try {
        const history = await Message.find().sort({ createdAt: 1 }).limit(100);
        socket.emit('loadHistory', history);
    } catch (err) {
        console.log('History load error:', err);
    }

    // Naya message save aur broadcast karna
    socket.on('chatMessage', async (data) => {
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.emit('message', data);
        } catch (err) {
            console.log('Message save error:', err);
        }
    });

    // Typing Indicator
    socket.on('typing', (data) => {
        socket.broadcast.emit('displayTyping', data);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    // Delete for Everyone
    socket.on('deleteForEveryone', async (msgId) => {
        try {
            const msg = await Message.findOne({ id: msgId });
            if (msg) {
                msg.text = '🚫 This message was deleted';
                msg.deletedForEveryone = true;
                await msg.save();
                io.emit('updateMessage', msg);
            }
        } catch (err) {
            console.log('Delete error:', err);
        }
    });

    // Edit Message
    socket.on('editMessage', async ({ id, newText }) => {
        try {
            const msg = await Message.findOne({ id: id });
            if (msg) {
                msg.text = newText;
                msg.edited = true;
                await msg.save();
                io.emit('updateMessage', msg);
            }
        } catch (err) {
            console.log('Edit error:', err);
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
