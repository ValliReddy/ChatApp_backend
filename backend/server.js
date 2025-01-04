

const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const { group } = require('console');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize socket.io with CORS configuration
const io = socketIo(server, {
  // cors: {
  //   origin: "http://localhost:3000", // Allow frontend on this port
  //   methods: ["GET", "POST"], // Allow these methods
  //   allowedHeaders: ["Content-Type"], // Allow headers like Content-Type
  // }
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",  // Use environment variable or fallback to localhost
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }
});

// Middleware to handle CORS
app.use(cors());

// Store users in an object to track active connections
const users = {};
const userLastSeen = {};
// Handling socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected');


  socket.on('online_status', ({ user, status }) => {
    if (status === 'offline') {
      userLastSeen[user] = new Date(); // Store the last seen time
    }
    console.log(`User ${user} is ${status}`);
  });
  // Register the user with a username  //on means listening to emit for both client and server
  socket.on('register_user', (username) => {
    users[username] = socket;
    console.log(`${username} connected`);
    console.log('Current users:', Object.keys(users));  // Log all registered users

    // Broadcast the list of online users to all clients
    io.emit('update_users', Object.keys(users));  // Broadcast to all clients
  });

  // Handle incoming messages from users
  // socket.on('send_message', (data) => {
  //   console.log('Message received from', data.sender);
  //   console.log('Message:', data.text);

  //   // Send the message to the intended receiver
  //   // console.log(users);
  //   // console.log(users[data.receiver]);
  //   const receiverSocket = users[data.receiver];
  //   if (receiverSocket) {
      
  //     receiverSocket.emit('receive_message', {
  //       sender: data.sender,
  //       text: data.text,
  //       time:data.time,
  //       group:data.group,
  //       status: 'blue-double-tick',
  //       // receiver:data.receiver,
       
        
  //     });
  //     console.log(`Message sent to ${data.receiver}`);
  //   } else {
  //     console.log(`Receiver ${data.receiver} not found`);
  //   }
  // });
  socket.on('send_message', (data) => {
    console.log('Message received from', data.sender);
    console.log('Message:', data.text);
  
    const receiverSocket = users[data.receiver];
    if (receiverSocket) {
      // Send the message to the receiver
      receiverSocket.emit('receive_message', {
        sender: data.sender,
        text: data.text,
        time: data.time,
        group: data.group,
        status: 'single-tick', // Initial status when sent
      });
  
      // Notify sender of delivery
      socket.emit('update_status', {
        receiver: data.receiver,
        time: data.time,
        status: 'double-tick',
      });
  
      console.log(`Message sent to ${data.receiver}`);
    } else {
      console.log(`Receiver ${data.receiver} not found`);
    }
  });
  
  // Handle message read receipt
  socket.on('message_read', (data) => {
    console.log('Message read event received:', data);
  
    const senderSocket = users[data.sender];
    if (senderSocket) {
      senderSocket.emit('update_status', {
        receiver: data.receiver,
        time: data.time,
        status: 'blue-double-tick',
      });
      console.log(`Blue tick update sent to ${data.sender}`);
    }
  });
  
  socket.on('get_last_seen', (user, callback) => {
    const lastSeen = userLastSeen[user];
    callback(lastSeen || null); // Return the last seen time or null if not found
  });
  socket.on('typing', (user) => {
    console.log(`${user} is typing...`);
    // Broadcast the typing event to all clients except the sender
    socket.broadcast.emit('typing', user);
  });

  // Handle stop typing event
  socket.on('stop_typing', (user) => {
    console.log(`${user} stopped typing`);
    // Broadcast the stop typing event to all clients except the sender
    socket.broadcast.emit('stop_typing', user);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    // Find the user that disconnected and update their last seen time
    for (const username in users) {
      if (users[username] === socket) {
        userLastSeen[username] = new Date();
        delete users[username];
        break;
      }
    }

    // Broadcast updated user list after someone disconnects
    io.emit('update_users', Object.keys(users));  // Broadcast to all clients
  });
});

// Basic route to check server status
app.get('/', (req, res) => {
  res.send('Chat server is running');
});

// Start the server
const port = process.env.PORT || 5000;  // Default to 5000 if not running on Render
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
