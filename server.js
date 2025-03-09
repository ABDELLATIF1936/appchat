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


// Route pour récupérer les messages dans une salle
app.post("/searchMessages", async (req, res) => {
    const { room, query } = req.body;
    try {
        const messages = await Message.find({
            room: room,
            text: { $regex: query, $options: "i" } // Recherche insensible à la casse
        }).sort({ createdAt: -1 }); // Tri décroissant par date

        res.json(messages); // Retourner les messages filtrés au client
    } catch (error) {
        console.error("Erreur de recherche :", error);
        res.status(500).json({ error: "Erreur lors de la recherche des messages." });
    }
});


// Fonction pour traiter les mentions dans les messages
function processMentions(message, roomUsers) {
    // Recherche les motifs @username dans le message
    const mentionRegex = /@(\w+)/g;
    const mentions = message.match(mentionRegex) || [];
    const mentionedUsers = [];

    // Extraire les noms d'utilisateur des mentions (sans le @)
    mentions.forEach(mention => {
        const username = mention.substring(1); // Enlève le @ du début
        // Vérifie si l'utilisateur mentionné existe dans la salle
        const userExists = roomUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
        if (userExists) {
            mentionedUsers.push(username);
        }
    });

    return {
        formattedMessage: message,
        mentionedUsers: mentionedUsers
    };
}

app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({}, "username"); // Récupère uniquement les noms d'utilisateur
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get("/login",(req,res) =>{
    res.render("login");
});

app.get("/post",(req,res) =>{
    res.render("post");
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            nom,
            prenom,
            email,
            password: hashedPassword,
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


// Connexion
app.post("/login", async (req, res) => {
    try {
        console.log("Données reçues :", req.body); // DEBUG

        const check = await User.findOne({ email: req.body.email });
        if (!check) {
            return res.status(401).json({ error: "Email incorrect." });
        }

        console.log("Mot de passe en base :", check.password); // DEBUG

        const isPasswordValid = await bcrypt.compare(req.body.password, check.password);
        console.log("Résultat comparaison bcrypt :", isPasswordValid); // DEBUG

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Mot de passe incorrect." });
        }

        res.json({ message: "Connexion réussie", username: check.nom });
    } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        res.status(500).json({ error: "Erreur lors de la connexion. Veuillez réessayer." });
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

   // Gestion des messages et des mentions
   socket.on("chatMessage", async (msg) => {
    const user = getCurrentUser(socket.id);
    const roomUsers = getRoomUsers(user.room);
    
    // Traite les mentions dans le message
    const { formattedMessage, mentionedUsers } = processMentions(msg, roomUsers);
    
    // Crée un nouveau message avec le format standard
    const message = formatMessage(user.username, formattedMessage);
    
    // Ajouter la liste des utilisateurs mentionnés au message
    message.mentions = mentionedUsers;
    
    // Sauvegarder le message dans MongoDB avec les mentions
    await Message.create({
        username: user.username,
        text: formattedMessage,
        room: user.room,
        mentions: mentionedUsers,
        createdAt: new Date()
    });
    
    // Envoyer le message à tous les utilisateurs dans la salle
    io.to(user.room).emit("message", message);
     // Envoyer des notifications spéciales aux utilisateurs mentionnés
        mentionedUsers.forEach(mentionedUsername => {
        const mentionedUser = roomUsers.find(u => u.username.toLowerCase() === mentionedUsername.toLowerCase());
        if (mentionedUser) {
            io.to(mentionedUser.id).emit("mentioned", {
                from: user.username,
                message: formattedMessage,
                room: user.room
            });
        }
    });
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
