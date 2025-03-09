const socket = io();
const roomName = document.getElementById("roomName");
const chatForm = document.getElementById("messageForm");
const usersList = document.getElementById("userListItems");
const messages = document.getElementById("messages");
const CHAT_BOT = "App";

// Récupération de l'utilisateur stocké dans le navigateur
const user = {
    username: localStorage.getItem("username"),
    room: localStorage.getItem("room")
};

// Rejoindre la salle
socket.emit("joinRoom", user);

// Affichage des utilisateurs dans la salle
socket.on("roomUsers", ({room, users}) => {
    showRoomName(room);
    showUsers(users);
    setupMentions(users); // Initialize mentions after users are loaded
});

// Affichage des messages
socket.on("message", msg => {
    showMsg(msg);
    messages.scrollTop = messages.scrollHeight; // Scroll automatique vers le bas
});

// Affichage des anciens messages
socket.on("previousMessages", (messages) => {
    const messageList = document.getElementById("messageList");
    
    messages.forEach(message => {
        ancMsg(message);
    });
});

// Fonction pour formater le texte et mettre en évidence les mentions
function formatMessageWithMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="user-mention">@$1</span>');
}

// Fonction pour afficher un message ancien
function ancMsg(msg) {
    const messageList = document.getElementById("messageList");
    const formattedDate = formatDate(msg.createdAt);
    
    // Formatter le texte avec les mentions en surbrillance
    const formattedText = formatMessageWithMentions(msg.text);
    
    const HTMLmsg = `<div class="message ${isUserMentioned(msg.text) ? 'mentioned-message' : ''}">
                        <p class="username"> ${msg.username} <span class="timestamp">${formattedDate}</span></p>
                        <p class="message-text">${formattedText}</p>
                     </div>`;
    
    messageList.insertAdjacentHTML('beforeend', HTMLmsg);
    scrollToBottom();
}

// Fonction pour afficher un message
function showMsg(msg) {
    const messageList = document.getElementById("messageList");
    
    // Formatter le texte avec les mentions en surbrillance
    const formattedText = formatMessageWithMentions(msg.message || msg.text);
    
    // Vérifier si l'utilisateur actuel est mentionné
    const isMentioned = isUserMentioned(msg.message || msg.text);
    
    const HTMLmsg = `<div class="message ${isMentioned ? 'mentioned-message' : ''}">
                      <p class="username"> ${msg.username} <span class="timestamp">${msg.time}</span></p>
                      <p class="message-text">${formattedText}</p>
                      </div>`;

    messageList.insertAdjacentHTML('beforeend', HTMLmsg);
    
    // Vérifier si le message provient d'un autre utilisateur (pas nous-même et pas le chatbot)
    if (msg.username !== user.username && msg.username !== CHAT_BOT) {
        // Déclencher la notification pour les messages des autres utilisateurs
        displayNotification(msg.username, msg.message || msg.text, user.room);
    }
    
    // Si l'utilisateur est mentionné, créer une notification spéciale
    if (isMentioned && msg.username !== user.username) {
        // La notification sera gérée par l'événement 'mentioned'
    }
    
    scrollToBottom();
}

// Fonction pour vérifier si l'utilisateur actuel est mentionné dans un message
function isUserMentioned(messageText) {
    if (!messageText) return false;
    const mentionPattern = new RegExp(`@${user.username}\\b`, 'i');
    return mentionPattern.test(messageText);
}

// Envoi de message
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const userMsg = event.target.elements.messageInput.value;
    socket.emit("chatMessage", userMsg);
    event.target.elements.messageInput.value = "";
    event.target.elements.messageInput.focus();
});

// Affichage du nom de la salle
function showRoomName(room) { 
    roomName.innerText = room;
}

// Affichage des utilisateurs dans la salle
function showUsers(users) {
    usersList.innerHTML = ""; // Vider la liste des utilisateurs
    for (const user of users) { 
        const userElement = document.createElement("li");
        userElement.innerText = user.username;
        userElement.setAttribute('data-username', user.username);
        userElement.addEventListener('click', () => {
            insertMention(user.username);
        });
        usersList.appendChild(userElement);
    }
}

// Fonction pour insérer une mention dans le champ de message
function insertMention(username) {
    const messageInput = document.getElementById('messageInput');
    const currentText = messageInput.value;
    const cursorPosition = messageInput.selectionStart;
    
    // Si le curseur est au début ou précédé d'un espace, pas besoin d'ajouter un espace
    const needsSpace = cursorPosition > 0 && currentText[cursorPosition - 1] !== ' ';
    
    // Insérer la mention à la position du curseur
    const beforeCursor = currentText.substring(0, cursorPosition);
    const afterCursor = currentText.substring(cursorPosition);
    
    messageInput.value = beforeCursor + (needsSpace ? ' ' : '') + '@' + username + ' ' + afterCursor;
    
    // Placer le curseur après la mention
    const newPosition = cursorPosition + (needsSpace ? 1 : 0) + username.length + 2; // +2 pour @ et espace
    messageInput.setSelectionRange(newPosition, newPosition);
    
    // Focus sur le champ de message
    messageInput.focus();
}

function scrollToBottom() {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatDate(isoDate) {
    const date = new Date(isoDate); 

    const day = date.getDate().toString().padStart(2, "0"); 
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); 
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Fonction pour afficher les notifications
function displayNotification(username, message, roomName) {
    // Vérifier si la page est active
    if (document.hidden) {
        // Jouer un son de notification si la page n'est pas active
        try {
            const notificationSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/notification.mp3');
            notificationSound.play();
        } catch (error) {
            console.warn("Impossible de jouer le son de notification:", error);
        }
        
        // Mettre à jour le titre de la page avec un indicateur
        updatePageTitle(true);
        
        // Utiliser l'API de notification du navigateur si autorisée
        if (Notification && Notification.permission === "granted") {
            const notification = new Notification(`Nouveau message de ${username}`, {
                body: message.length > 50 ? message.substring(0, 50) + '...' : message,
                icon: '/favicon.ico'  // Remplacez par le chemin de votre icône
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        }
        // Demander la permission si ce n'est pas encore fait
        else if (Notification && Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    const notification = new Notification(`Nouveau message de ${username}`, {
                        body: message.length > 50 ? message.substring(0, 50) + '...' : message,
                        icon: '/favicon.ico'  // Remplacez par le chemin de votre icône
                    });
                }
            });
        }
    }
    
    // Créer une notification visuelle dans l'interface
    createVisualNotification(username, message, roomName);
}

// Fonction pour créer une notification visuelle dans l'interface
function createVisualNotification(username, message, roomName) {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.innerHTML = `
        <div class="notification-header">
            <strong>${username}</strong>
            <span class="notification-room">${roomName}</span>
            <span class="notification-close">&times;</span>
        </div>
        <div class="notification-body">${message.length > 50 ? message.substring(0, 50) + '...' : message}</div>
    `;
    
    // Trouver ou créer le conteneur de notifications
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Ajouter la notification au conteneur
    container.appendChild(notification);
    
    // Gérer la fermeture de la notification
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Disparaître automatiquement après 5 secondes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Mettre à jour le titre de la page
let unreadCount = 0;
const originalTitle = document.title;

function updatePageTitle(increment = false) {
    if (increment) unreadCount++;
    
    if (unreadCount > 0) {
        document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

// Réinitialiser le compteur quand la page devient active
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        unreadCount = 0;
        updatePageTitle();
    }
});

// Écouteur spécifique pour les mentions
socket.on('mentioned', (data) => {
    // Jouer un son de notification spécifique pour les mentions
    try {
        const mentionSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/alert.mp3');
        mentionSound.play();
    } catch (error) {
        console.warn("Impossible de jouer le son de mention:", error);
    }
    
    // Créer une notification spéciale pour les mentions
    displayNotification(data.from, `@${user.username} ${data.message}`, data.room);
    
    // Mettre à jour le compteur de notifications dans la barre de navigation
    addNavbarNotification(data.from, `@${user.username} ${data.message}`, data.room, true);
});

// Create a notification system in the navbar
function createNavbarNotificationSystem() {
    // Find the navbar links container
    const navbarLinks = document.querySelector('.navbar-links');
    
    if (!navbarLinks) {
        console.warn('Navbar links element not found. Cannot add notification badge.');
        return;
    }
    
    // Create notification link element with badge
    const notificationLink = document.createElement('a');
    notificationLink.href = "#";
    notificationLink.innerHTML = `
        <i class="fas fa-bell"></i> Notifications
        <span class="notification-badge" id="notificationBadge">0</span>
    `;
    notificationLink.className = 'notification-link';
    
    // Insert notification link before the Settings link
    const settingsLink = Array.from(navbarLinks.querySelectorAll('a')).find(link => 
        link.innerHTML.includes('Paramètres')
    );
    
    if (settingsLink) {
        navbarLinks.insertBefore(notificationLink, settingsLink);
    } else {
        navbarLinks.appendChild(notificationLink);
    }
    
    // Create notification dropdown
    const notificationDropdown = document.createElement('div');
    notificationDropdown.className = 'notification-dropdown';
    notificationDropdown.id = 'notificationDropdown';
    notificationDropdown.innerHTML = `
        <div class="notification-header">
        <h5>Notifications</h5>
        <button id="markAllReadBtn">Tout marquer comme lu</button>
        </div>
        <div class="notification-list" id="navbarNotificationList">
        <div class="no-notifications">Pas de nouvelles notifications</div>
        </div>
    `;
    
    // Add dropdown to the navbar
    notificationLink.parentNode.insertBefore(notificationDropdown, notificationLink.nextSibling);
    
    // Set up event listeners
    notificationLink.addEventListener('click', (e) => {
        e.preventDefault();
        notificationDropdown.classList.toggle('show');
        if (notificationDropdown.classList.contains('show')) {
        // Reset badge count when dropdown is opened
        updateNavbarBadge(0, true);
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!notificationLink.contains(event.target) && !notificationDropdown.contains(event.target)) {
        notificationDropdown.classList.remove('show');
        }
    });
    
    // Mark all as read
    document.getElementById('markAllReadBtn').addEventListener('click', () => {
        const notifications = document.querySelectorAll('.navbar-notification-item');
        notifications.forEach(notification => {
        notification.classList.remove('unread');
        });
        
        // Hide "no notifications" message if there are notifications
        toggleNoNotificationsMessage();
        
        // Update badge
        updateNavbarBadge(0, true);
    });
}

// Toggle the "no notifications" message
function toggleNoNotificationsMessage() {
    const notificationList = document.getElementById('navbarNotificationList');
    const noNotificationsMsg = notificationList.querySelector('.no-notifications');
    const notifications = notificationList.querySelectorAll('.navbar-notification-item');
    
    if (notifications.length > 0) {
        if (noNotificationsMsg) {
        noNotificationsMsg.style.display = 'none';
        }
    } else {
        if (noNotificationsMsg) {
        noNotificationsMsg.style.display = 'block';
        } else {
        const newMsg = document.createElement('div');
        newMsg.className = 'no-notifications';
        newMsg.textContent = 'Pas de nouvelles notifications';
        notificationList.appendChild(newMsg);
        }
    }
}

// Update the notification badge count
function updateNavbarBadge(count, reset = false) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (reset) {
        unreadCount = 0;
        badge.textContent = '0';
        badge.style.display = 'none';
        updatePageTitle();
    } else {
        const currentCount = parseInt(badge.textContent) || 0;
        const newCount = currentCount + count;
        badge.textContent = newCount;
        badge.style.display = newCount > 0 ? 'flex' : 'none';
    }
}

// Add a notification to the navbar dropdown
function addNavbarNotification(username, message, roomName, isMention = false) {
    const notificationList = document.getElementById('navbarNotificationList');
    if (!notificationList) return;
    
    // Hide "no notifications" message
    const noNotificationsMsg = notificationList.querySelector('.no-notifications');
    if (noNotificationsMsg) {
        noNotificationsMsg.style.display = 'none';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'navbar-notification-item unread';
    if (isMention) {
        notification.classList.add('mention-notification');
    }
    
    // Format time
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    notification.innerHTML = `
        <div class="notification-content">
        <p class="notification-sender"><strong>${username}</strong> <span class="notification-room">${roomName}</span></p>
        <p class="notification-text">${formatMessageWithMentions(message.length > 40 ? message.substring(0, 40) + '...' : message)}</p>
        <p class="notification-time">${formattedTime}</p>
        </div>
    `;
    
    // Insert at the top of the list
    notificationList.insertBefore(notification, notificationList.firstChild);
    
    // Limit number of notifications (optional)
    const maxNotifications = 10;
    const allNotifications = notificationList.querySelectorAll('.navbar-notification-item');
    if (allNotifications.length > maxNotifications) {
        notificationList.removeChild(notificationList.lastChild);
    }
    
    // Update badge
    updateNavbarBadge(1);
    
    // Add click event to navigate to the message
    notification.addEventListener('click', () => {
        // Remove unread styling
        notification.classList.remove('unread');
        
        // Could add logic here to scroll to the specific message
        document.getElementById('messages').scrollIntoView({ behavior: 'smooth' });
        
        // Close dropdown
        document.getElementById('notificationDropdown').classList.remove('show');
    });
}

// Système d'autocomplétion pour les mentions
function setupMentions(roomUsers) {
    const messageInput = document.getElementById('messageInput');
    let mentionDropdown = null;
    let currentMentionStart = -1;
    
    // Extraire juste les noms d'utilisateur
    const users = roomUsers.map(user => user.username);
    
    // Créer la dropdown pour l'autocomplétion
    function createMentionDropdown() {
        if (mentionDropdown) {
            document.body.removeChild(mentionDropdown);
        }
        
        mentionDropdown = document.createElement('div');
        mentionDropdown.className = 'mention-dropdown';
        mentionDropdown.style.position = 'absolute';
        mentionDropdown.style.display = 'none';
        mentionDropdown.style.zIndex = '1000';
        mentionDropdown.style.background = 'white';
        mentionDropdown.style.border = '1px solid #ccc';
        mentionDropdown.style.borderRadius = '4px';
        mentionDropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        mentionDropdown.style.maxHeight = '150px';
        mentionDropdown.style.overflowY = 'auto';
        document.body.appendChild(mentionDropdown);
    }
    
    createMentionDropdown();
    
    // Positionner la dropdown près du curseur
    function positionDropdown() {
        const inputRect = messageInput.getBoundingClientRect();
        mentionDropdown.style.top = (inputRect.top + inputRect.height) + 'px';
        mentionDropdown.style.left = inputRect.left + 'px';
    }
    
    // Gérer les changements d'entrée pour détecter le symbole @
    messageInput.addEventListener('input', function() {
        const caretPos = this.selectionStart;
        const text = this.value;
        
        // Trouver le début de la mention actuelle
        let mentionStartPos = -1;
        for (let i = caretPos - 1; i >= 0; i--) {
            if (text[i] === '@') {
                mentionStartPos = i;
                break;
            } else if (text[i] === ' ' || text[i] === '\n') {
                break;
            }
        }
        
        // Si on a trouvé un symbole @
        if (mentionStartPos !== -1) {
            const mentionText = text.substring(mentionStartPos + 1, caretPos).toLowerCase();
            currentMentionStart = mentionStartPos;
            
            // Filtrer les utilisateurs qui correspondent à la saisie actuelle
            const filteredUsers = users.filter(user => 
                user.toLowerCase().startsWith(mentionText)
            );
            
            if (filteredUsers.length > 0) {
                mentionDropdown.innerHTML = '';
                
                filteredUsers.forEach(user => {
                    const item = document.createElement('div');
                    item.className = 'mention-item';
                    item.textContent = user;
                    item.style.padding = '5px 10px';
                    item.style.cursor = 'pointer';
                    
                    item.addEventListener('click', function() {
                        const beforeMention = text.substring(0, mentionStartPos);
                        const afterMention = text.substring(caretPos);
                        messageInput.value = beforeMention + '@' + user + ' ' + afterMention;
                        messageInput.focus();
                        messageInput.selectionStart = messageInput.selectionEnd = mentionStartPos + user.length + 2; // +2 pour @ et espace
                        mentionDropdown.style.display = 'none';
                    });
                    
                    item.addEventListener('mouseover', function() {
                        this.style.backgroundColor = '#f0f0f0';
                    });
                    
                    item.addEventListener('mouseout', function() {
                        this.style.backgroundColor = 'transparent';
                    });
                    
                    mentionDropdown.appendChild(item);
                });
                
                positionDropdown();
                mentionDropdown.style.display = 'block';
            } else {
                mentionDropdown.style.display = 'none';
            }
        } else {
            mentionDropdown.style.display = 'none';
            currentMentionStart = -1;
        }
    });
    
    // Gérer les clics en dehors de la dropdown pour la fermer
    document.addEventListener('click', function(e) {
        if (e.target !== mentionDropdown && !mentionDropdown.contains(e.target)) {
            mentionDropdown.style.display = 'none';
        }
    });
    
    // Gérer les événements keydown pour la navigation dans la dropdown
    messageInput.addEventListener('keydown', function(e) {
        if (mentionDropdown.style.display === 'block') {
            const items = mentionDropdown.getElementsByClassName('mention-item');
            let activeItem = mentionDropdown.querySelector('.active');
            let activeIndex = -1;
            
            // Trouver l'index actif actuel
            if (activeItem) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i] === activeItem) {
                        activeIndex = i;
                        break;
                    }
                }
            }
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (activeItem) activeItem.classList.remove('active');
                    activeIndex = (activeIndex + 1) % items.length;
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    if (activeItem) activeItem.classList.remove('active');
                    activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
                    items[activeIndex].classList.add('active');
                    items[activeIndex].scrollIntoView({ block: 'nearest' });
                    break;
                    
                case 'Enter':
                    if (activeItem) {
                        e.preventDefault();
                        activeItem.click();
                    }
                    break;
                    
                case 'Escape':
                    mentionDropdown.style.display = 'none';
                    break;
            }
        }
    });
}

// Ajouter les styles CSS pour les mentions
function addMentionStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .user-mention {
            font-weight: bold;
            color: #3498db;
            background-color: rgba(52, 152, 219, 0.1);
            padding: 0 3px;
            border-radius: 3px;
        }
        
        .mentioned-message {
            background-color: rgba(255, 235, 59, 0.2);
            border-left: 3px solid #ffc107;
            animation: highlight-mention 2s ease;
        }
        
        @keyframes highlight-mention {
            0% { background-color: rgba(255, 235, 59, 0.4); }
            100% { background-color: rgba(255, 235, 59, 0.2); }
        }
        
        .mention-dropdown {
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .mention-item {
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .mention-item:hover, .mention-item.active {
            background-color: #f0f0f0;
        }
        
        .mention-notification {
            border-left: 3px solid #3498db !important;
            background-color: rgba(52, 152, 219, 0.05);
        }
    `;
    document.head.appendChild(style);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createNavbarNotificationSystem();
    addMentionStyles();
    
    // The rest of your existing DOMContentLoaded code...
    if (Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
    
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
});