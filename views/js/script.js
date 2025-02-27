const socket = io();
const roomName = document.getElementById("roomName");
const chatForm=document.getElementById("messageForm");
const usersList= document.getElementById("userListItems");
const messages=document.getElementById("messages");

const user = {
    username: localStorage.getItem("username"),
    room: localStorage.getItem("room")
};

socket.emit("joinRoom" , user);

socket.on("roomUsers", ({room , users}) => {
    showRoomName(room);
    showUsers(users);
});

socket.on("message",msg =>{
    showMsg(msg);
    messages.scrollTop = messages.scrollHeight;
})

function showMsg(msg){
    const messageList= document.getElementById("messageList");
    const HTMLmsg=`<div class="message">
                        <p class="username"> ${msg.username} <span class="timestamp">${msg.time}</span></p>
                        <p class="message-text">${msg.message}</p>
                        </div>`;

    messageList.insertAdjacentHTML('beforeend',HTMLmsg);
}

chatForm.addEventListener("submit",(event) =>{
    event.preventDefault();
    const userMsg =event.target.elements.messageInput.value;
    socket.emit("chatMessage",userMsg);
    event.target.elements.messageInput.value="";
    event.target.elements.messageInput.focus();

})


function showRoomName(room){ 
    roomName.innerText = room;
}

function showUsers(users){
    usersList.innerHTML = "";
    for(const user of users){ 
        const userElement = document.createElement("li");
        userElement.innerText = user.username;
        usersList.appendChild(userElement);
    }
}
