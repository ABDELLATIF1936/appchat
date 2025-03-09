const socket = io();
const roomName = document.getElementById("roomName");
const chatForm=document.getElementById("messageForm");
const usersList= document.getElementById("userListItems");
const messages = document.getElementById("messages");
const CHAT_BOT = "App";




// Récupération de l'utilisateur stocké dans le navigateur
const user = {
    username: localStorage.getItem("username"),
    room: localStorage.getItem("room")
};
// Rejoindre la salle
socket.emit("joinRoom" , user);
// Affichage des utilisateurs dans la salle
socket.on("roomUsers", ({room , users}) => {
    showRoomName(room);
    showUsers(users);
});

// Affichage des messages
socket.on("message", msg => {
    showMsg(msg);
    messages.scrollTop = messages.scrollHeight; // Scroll automatique vers le bas
});
// Affichage des anciens messages
socket.on("previousMessages", (messages) => {
    const messageList = document.getElementById("messages");
    
    messages.forEach(message => {
        ancMsg(message);
    });
});

// Fonction pour afficher un message anciens
function ancMsg(msg){
    const messageList= document.getElementById("messageList");
    const formattedDate = formatDate(msg.createdAt);
    const HTMLmsg=`<div class="message">
                        <p class="username"> ${msg.username} <span class="timestamp">${formattedDate}</span></p>
                        <p class="message-text">${msg.text}</p>
                        </div>`;
    messageList.insertAdjacentHTML('beforeend',HTMLmsg);
    scrollToBottom();
}

// Fonction pour afficher un message
function showMsg(msg){
  const messageList = document.getElementById("messageList");
  const HTMLmsg = `<div class="message">
                      <p class="username"> ${msg.username} <span class="timestamp">${msg.time}</span></p>
                      <p class="message-text">${msg.message}</p>
                      </div>`;

  messageList.insertAdjacentHTML('beforeend', HTMLmsg);
  
  // Vérifier si le message provient d'un autre utilisateur (pas nous-même et pas le chatbot)
  if (msg.username !== user.username && msg.username !== CHAT_BOT) {
      // Déclencher la notification pour les messages des autres utilisateurs
      displayNotification(msg.username, msg.message, user.room);
  }
  
  scrollToBottom();
}

// Envoi de message
chatForm.addEventListener("submit",(event) =>{
    event.preventDefault();
    const userMsg =event.target.elements.messageInput.value;
    socket.emit("chatMessage",userMsg);
    event.target.elements.messageInput.value="";
    event.target.elements.messageInput.focus();

})

// Affichage du nom de la salle
function showRoomName(room){ 
    roomName.innerText = room;
    scrollToBottom();
}

// Affichage des utilisateurs dans la salle
function showUsers(users){
    usersList.innerHTML = "";// Vider la liste des utilisateurs
    for(const user of users){ 
        const userElement = document.createElement("li");
        userElement.innerText = user.username;
        usersList.appendChild(userElement);
    }
    scrollToBottom();
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

// Demander la permission pour les notifications du navigateur au chargement
document.addEventListener('DOMContentLoaded', () => {
  if (Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
  }
  
  // Ajouter le conteneur de notifications s'il n'existe pas
  if (!document.getElementById('notificationContainer')) {
      const container = document.createElement('div');
      container.id = 'notificationContainer';
      container.className = 'notification-container';
      document.body.appendChild(container);
  }
});

// Écouteur spécifique pour les mentions
socket.on('mentioned', (data) => {
  displayNotification(data.from, `@${user.username} ${data.message}`, data.room);
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
function addNavbarNotification(username, message, roomName) {
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
  
  // Format time
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;
  
  notification.innerHTML = `
    <div class="notification-content">
      <p class="notification-sender"><strong>${username}</strong> <span class="notification-room">${roomName}</span></p>
      <p class="notification-text">${message.length > 40 ? message.substring(0, 40) + '...' : message}</p>
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

// Modify your existing displayNotification function to also update the navbar
const originalDisplayNotification = displayNotification;
displayNotification = function(username, message, roomName) {
  // Call the original function
  originalDisplayNotification(username, message, roomName);
  
  // Add to navbar notifications
  addNavbarNotification(username, message, roomName);
};

// Initialize navbar notifications when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  createNavbarNotificationSystem();
  
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