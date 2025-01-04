const io = require('socket.io-client');

// Connect to the backend server
const socket = io('http://localhost:5000');

// Prompt the user for their username
const username = "valli";  // Ask for username dynamically

// Register the user with the server
socket.emit('register_user', username);

// Listen for incoming messages from other users
socket.on('receive_message', (message) => {
  console.log(`${message.sender}: ${message.text}`);
});

// Function to send messages to another user
function sendMessage(receiver, messageText) {
  socket.emit('send_message', {
    sender: username,
    receiver: receiver,
    text: messageText
  });
}

// Example of sending a message (uncomment to use)
function exampleMessage() {
  sendMessage('user2', 'Hello from ' + username + '!');
}

// Uncomment this to automatically send a message
 exampleMessage();
