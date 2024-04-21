const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },

})
module.exports = mongoose.model('User', UserSchema)

/*
const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        minlength: 4,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const UserModel = model('User', UserSchema);
module.exports = UserModel;
*/