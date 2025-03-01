const socket = io();
const roomName = document.getElementById("roomName");
const chatForm=document.getElementById("messageForm");
const usersList= document.getElementById("userListItems");
const messages = document.getElementById("messages");

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
    const messageList= document.getElementById("messageList");
    const HTMLmsg=`<div class="message">
                        <p class="username"> ${msg.username} <span class="timestamp">${msg.time}</span></p>
                        <p class="message-text">${msg.message}</p>
                        </div>`;

    messageList.insertAdjacentHTML('beforeend',HTMLmsg);
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
}

// Affichage des utilisateurs dans la salle
function showUsers(users){
    usersList.innerHTML = "";// Vider la liste des utilisateurs
    for(const user of users){ 
        const userElement = document.createElement("li");
        userElement.innerText = user.username;
        usersList.appendChild(userElement);
    }
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