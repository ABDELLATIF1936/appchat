const mongoose = require('mongoose');

const ChatUserSchema = new mongoose.Schema({
    socketId: { type: String, required: true },
    username: { type: String, required: true },
    room: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatUser', ChatUserSchema);