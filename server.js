const express = require('express');
const http = require('http');
const socketIo = require("socket.io");
const path = require('path');
const cors = require("cors");
const mongoose = require('mongoose');
const CHAT_BOT = "App";
const formatMessage = require('./utilis/messages.js');
const {userJoin , getCurrentUser , userLeave ,  getRoomUsers } = require('./utilis/users');

const app = express();
const server = http.createServer(app); //  Création correcte du serveur HTTP
const io = socketIo(server); //  Associer Socket.io au serveur

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "views"))); // Servir les fichiers statiques
io.on('connection' , socket => {
    socket.on('joinRoom' , (joinedUser) => {
        joinedUser.id = socket.id;
        const user =  userJoin(joinedUser);
        socket.join(user.room);
        socket.emit("message",formatMessage(CHAT_BOT ,"Bienvenue sur le chat"));
        socket.broadcast.to(user.room).emit("message" , formatMessage(CHAT_BOT ,` ${user.username} rejoindre pour chat  `));

        io.to(user.room).emit("roomUsers" , {
            room : user.room,
            users:getRoomUsers(user.room)
        });
    })
    
    socket.on("chatMessage" , (msg) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("message" , formatMessage(user.username,msg));
    });

    socket.on('disconnect' , () => {
        const user = userLeave(socket.id); 
        if(user){
            io.to(user.room).emit("message",formatMessage( CHAT_BOT,`${user.username} Quitter le chat `))
            io.to(user.room).emit("roomUsers" , {
                room : user.room,
                users:getRoomUsers(user.room)
            });
        }
        
    });
})

// Connexion à MongoDB
mongoose.connect("mongodb+srv://abdellatifhh8:7kgoByYQFIRZqN0C@chatapp.kxw1s.mongodb.net/all-data?retryWrites=true&w=majority&appName=chatapp", {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
.then(() => {
    console.log("Connecté à MongoDB");
    server.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}/`);
    });
})
.catch((err) => {
    console.error("Erreur de connexion à MongoDB :", err);
});
