const User = require("./models/User");// Import du modèle User
const express = require('express');
const http = require('http');
const socketIo = require("socket.io");
const path = require('path');
const cors = require("cors");
const mongoose = require('mongoose');
const CHAT_BOT = "App";
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const formatMessage = require('./utilis/messages.js');
const {userJoin , getCurrentUser , userLeave ,  getRoomUsers } = require('./utilis/users');
const user = require('./models/User');
const Message = require('./models/Message');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.urlencoded({extended:true}));
app.use(express.json());

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "views"))); // Servir les fichiers statiques

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

// Inscription
app.post("/post", async (req, res) => {
    try {
        const { nom, prenom, email, password, etablissement } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send("Cet email est déjà utilisé !");
        }

        const user = new User({
            nom,
            prenom,
            email,
            password,
            etablissement,
        });

        await user.save();
        console.log(user);

        // Rediriger vers la page principale après inscription
        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors de la création du compte.");
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Vérifier si l'utilisateur existe dans la base de données
        const user = await User.findOne({ email });

        // Vérifier le mot de passe
        if (user && user.password === password) {
            return res.status(200).json({ message: "Connexion réussie", user });
        }

        // Si l'utilisateur n'existe pas ou mot de passe incorrect
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });

    } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return res.status(500).json({ error: "Erreur lors de la connexion. Veuillez réessayer." });
    }
});



io.on('connection' , socket => {
    socket.on('joinRoom' , async (joinedUser) => {
        joinedUser.id = socket.id;
        const user =  userJoin(joinedUser);
        socket.join(user.room);

         // Envoyer un message de bienvenue
        socket.emit("message",formatMessage(CHAT_BOT ,"Bienvenue sur le chat"));
        socket.broadcast.to(user.room).emit("message" , formatMessage(CHAT_BOT ,` ${user.username} a rejoint le chat  `));
         // Récupérer les messages précédents depuis MongoDB pour cette salle
        try {
            const messages = await Message.find({ room: user.room }).sort({ createdAt: 1 }); // Tri par date croissante
            socket.emit("previousMessages", messages); // Envoie les messages précédents au client
        } catch (error) {
            console.error("Erreur lors de la récupération des messages:", error);
        }
        // Mettre à jour les utilisateurs dans la salle
        io.to(user.room).emit("roomUsers" , {
            room : user.room,
            users:getRoomUsers(user.room)
        });
    });
     // Recevoir un message de l'utilisateur
    socket.on("chatMessage" , async (msg) => {
        const user = getCurrentUser(socket.id);
        const message = formatMessage(user.username, msg);
    });

    socket.on("chatMessage", async (msg) => {
        const user = getCurrentUser(socket.id);
    
        // Créer un nouveau message à partir des données de l'utilisateur et du message
        const message = formatMessage(user.username, msg);
    
        // Sauvegarder le message dans MongoDB
        await Message.create({
            username: user.username,
            text: msg,
            room: user.room
        });
    
        // Envoyer le message à la salle
        io.to(user.room).emit("message", message);
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
