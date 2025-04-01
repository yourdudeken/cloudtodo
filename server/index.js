import express from 'express';
// Removed duplicate import below
// import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
// Remove GoogleDriveService import as it's no longer used for task sync here
// import { GoogleDriveService } from './google-drive.js';
// Keep notification service import if it's still used for email reminders
import { notificationService } from './notification-service.js';

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active user connections
const activeUsers = new Map();

// Initialize Google Drive service using environment variables
// This service instance can potentially be shared if user data isn't mixed,
// but creating per-request might be safer if user-specific logic evolves.
// For now, let's initialize it once or ensure credentials are correct each time.
const initializeGoogleDrive = () => {
  // Ensure all required env vars are present
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.VITE_CLIENT_SECRET;
  const redirectUri = process.env.VITE_REDIRECT_URI;
  const refreshToken = process.env.VITE_REFRESH_TOKEN;
  // Remove encryptionKey check
  // const encryptionKey = process.env.VITE_ENCRYPTION_KEY;

  // Remove encryptionKey from the check
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    console.error("Missing Google Drive credentials in environment variables!");
    // Be more specific about what might be missing
    // if (!encryptionKey) console.error("Specifically, VITE_ENCRYPTION_KEY is missing.");
    throw new Error("Server configuration error: Missing Google Drive credentials."); // Updated error message
  }

  // Remove GoogleDriveService instantiation here if not used elsewhere
  // return new GoogleDriveService({
  //   clientId,
  //   clientSecret,
  //   redirectUri,
  //   refreshToken,
  //   // encryptionKey // Removed
  // });

  // Return null or handle differently if the service was only for tasks
  return null; // Indicate service is not needed/initialized here anymore
};

// Remove syncTasks function as it's handled client-side
/*
const syncTasks = async (userId) => {
  // ... implementation removed ...
};
*/

// Socket.IO connection handling
io.on('connection', (socket) => {
  let userId = null; // Store userId associated with this socket connection
  let userEmail = null; // Store userEmail associated with this socket connection

  // Client sends userId and email upon connection/authentication
  socket.on('authenticate', async ({ userId: uid, email: emailAddress }) => { // Expect email now
    console.log(`User ${uid} (${emailAddress || 'No email provided'}) attempting authentication...`);
    if (!uid || !emailAddress) { // Validate both are received
      console.error("Authentication failed: Missing userId or email from client.");
      // Optionally send an error back to the client before disconnecting
      socket.emit('authError', { message: 'Authentication failed: Missing user ID or email.' });
      socket.disconnect(true); // Disconnect the socket
      return;
    }
    userId = uid;
    userEmail = emailAddress; // Store the email for this connection
    // Store socket and email together, keyed by userId
    activeUsers.set(userId, { socket, email: userEmail });
    console.log(`User ${userId} authenticated with email ${userEmail}`);

    // Remove initial task sync logic
    /*
    try {
      const tasks = await syncTasks(userId);
      // ... emit tasksSynced ...
    } catch (error) {
       // ... handle error ...
    }
    */
  });

  // Remove 'addTask' listener
  // socket.on('addTask', async ({ task }) => { ... });

  // Remove 'taskUpdate' listener
  // socket.on('taskUpdate', async ({ task }) => { ... });

  // Remove 'deleteTask' listener
  // socket.on('deleteTask', async ({ taskId }) => { ... });


  // Keep chat message handling if needed
  socket.on('chatMessage', async ({ taskId, message, userId }) => {
    try {
      const newMessage = {
        id: crypto.randomUUID(),
        taskId,
        userId,
        message,
        created_at: new Date().toISOString()
      };

      // Broadcast message to all users in the task's room
      io.to(`task-${taskId}`).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Chat error:', error);
    }
  });

  // Join task-specific chat room
  socket.on('joinTaskRoom', (taskId) => {
    socket.join(`task-${taskId}`);
  });

  // Associate socket with userId room for broadcasting
  socket.on('registerUser', (uid) => {
    if (uid) {
      userId = uid; // Re-associate userId if needed, though authenticate should handle it
      socket.join(uid); // Join a room named after the userId
      console.log(`User ${userId} registered socket ${socket.id}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (userId) {
      // Remove user from activeUsers map when they disconnect
      activeUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
      // Note: This simple approach assumes one socket per user ID.
      // If multiple connections per user are possible, more complex tracking is needed.
    } // Removed extra closing brace here
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
