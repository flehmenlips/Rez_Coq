const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    operating_days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    opening_time: {
        type: String,
        default: '11:00'
    },
    closing_time: {
        type: String,
        default: '22:00'
    },
    slot_duration: {
        type: Number,
        default: 30
    },
    daily_max_guests: {
        type: Number,
        default: 100
    },
    rolling_days: {
        type: Number,
        default: 30
    },
    min_party_size: {
        type: Number,
        default: 1
    },
    max_party_size: {
        type: Number,
        default: 10
    }
});

module.exports = mongoose.model('Settings', settingsSchema); 