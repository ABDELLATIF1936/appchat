const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    nom: String,
    prenom: String,
    email: { type: String, unique: true },
    password: String,
    etablissement: String,
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

module.exports = User;