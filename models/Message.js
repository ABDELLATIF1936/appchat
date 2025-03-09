
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: {
    type: String,
    required: true
    },
    text: {
    type: String,
    required: true
    },
    room: {
    type: String,
    required: true
    },
    mentions: {
    type: [String],
    default: []
    },
    createdAt: {
    type: Date,
    default: Date.now
    }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;