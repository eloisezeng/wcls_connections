const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    user: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        edu: {
            type: String,
            required: true
        },
        wcls_grade: {
            type: String,
            required: false
        },
        reg_grade: {
            type: String,
            required: false
        },
        max_students: {
            type: String,
            required: false
        }
    },
    schedule: {
        type: Array,
        required: true
    }
})

const User = mongoose.model('users', userSchema); // 'users' is the name of the collection

module.exports = User
