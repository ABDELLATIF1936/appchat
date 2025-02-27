const express=require('express');
const http=require('http');
const socketio=require("socket.io");
const app=express();
const path=require('path');
const server=http.createServer(app);
const cors = require("cors");
const port= process.env.PORT ||3000;

const mongoose = require('mongoose');

app.use(express.static(path.join(__dirname,"views")));

const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// Gérer la connexion des utilisateurs via WebSocket
io.on("connection", (socket) => {
    console.log("Un utilisateur s'est connecté");

    socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`Utilisateur rejoint la salle : ${room}`);

        // Charger l'historique des messages
        Message.find({ room }).then(messages => {
            socket.emit("loadMessages", messages);
        });
    });

    socket.on("sendMessage", async (data) => {
        const newMessage = new Message(data);
        await newMessage.save();

        io.to(data.room).emit("messageReceived", newMessage);
    });

    socket.on("disconnect", () => {
        console.log("Un utilisateur s'est déconnecté");
    });
});



mongoose.connect("mongodb+srv://abdellatifhh8:7kgoByYQFIRZqN0C@chatapp.kxw1s.mongodb.net/all-data?retryWrites=true&w=majority&appName=chatapp", {
    serverSelectionTimeoutMS: 5000, // Délai d'attente pour la sélection du serveur
    socketTimeoutMS: 45000, // Délai d'attente pour les opérations de socket
    })
    .then(() => {
    console.log("Connecté à MongoDB");
    app.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}/`);
    });
    })
    .catch((err) => {
    console.error("Erreur de connexion à MongoDB :", err);
        });