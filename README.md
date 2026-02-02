# AppChat – Application de Chat en Temps Réel

**AppChat** est une application de chat en temps réel permettant aux utilisateurs de communiquer instantanément. Le projet est développé avec **Node.js**, **Express**, **Socket.io** et **MongoDB**.

## Fonctionnalités

- Chat en temps réel entre plusieurs utilisateurs
- Gestion des utilisateurs et des sessions
- Historique des messages avec MongoDB
- Interface simple et réactive
- Notifications pour nouveaux messages

## Prérequis

Avant de lancer le projet, assurez-vous d’avoir installé :

- [Node.js](https://nodejs.org/) (version 16+ recommandée)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (Atlas ou local)
- Git

## Installation

1. Cloner le dépôt :


-- git clone https://github.com/ABDELLATIF1936/appchat.git

-- cd appchat

2. Installer les dépendances :
  -- npm install

3. Configurer la base de données :

  * Créer un fichier .env à la racine du projet
  *  Ajouter la variable d'environnement MONGODB_URI :

-- MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/appchat?retryWrites=true&w=majority"
PORT=3000

4. Lancer le serveur en développement :

-- npm run dev


```bash