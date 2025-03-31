import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
// Remove node-schedule import if not used elsewhere after refactoring
// import schedule from 'node-schedule';
// Removed duplicate imports below
import { GoogleDriveService } from './google-drive.js';
// Import the notification service (it initializes itself and starts cron jobs)
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
  const encryptionKey = process.env.VITE_ENCRYPTION_KEY; // Read encryption key

  // Add encryptionKey to the check
  if (!clientId || !clientSecret || !redirectUri || !refreshToken || !encryptionKey) {
    console.error("Missing Google Drive credentials or Encryption Key in environment variables!");
    // Be more specific about what might be missing
    if (!encryptionKey) console.error("Specifically, VITE_ENCRYPTION_KEY is missing.");
    throw new Error("Server configuration error: Missing Google Drive credentials or Encryption Key.");
  }

  return new GoogleDriveService({
    clientId,
    clientSecret,
    redirectUri,
    refreshToken,
    encryptionKey // Pass the encryption key
  });
};

// Remove the old scheduleReminder function
// Email notifications are now handled by the cron job in notification-service.js
// Browser notifications will be scheduled client-side based on task data

// Sync tasks with Google Drive (no longer needs accessToken)
const syncTasks = async (userId) => { // userId might not be needed if using service role key
  try {
    // Initialize the service with server credentials
    const googleDrive = initializeGoogleDrive();
    const tasks = await googleDrive.loadTasks();
    return tasks;
  } catch (error) {
    console.error('Error syncing tasks:', error);
    return null;
  }
};

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

    // Initial sync - uses server credentials now
    try {
      const tasks = await syncTasks(userId);
      if (tasks) {
        socket.emit('tasksSynced', tasks);
        console.log(`Tasks synced for user ${userId}`);
        // Client-side will handle scheduling browser reminders based on received tasks
        // Email reminders are handled by the backend cron job
      } else {
         console.log(`No tasks found or error during sync for user ${userId}`);
      }
    } catch (error) {
       console.error(`Error during initial task sync for user ${userId}:`, error);
       socket.emit('taskError', { action: 'sync', message: 'Failed to sync tasks with Google Drive.' });
    }
  });

  // Handle adding a new task
  socket.on('addTask', async ({ task }) => { // Removed accessToken
    console.log(`[addTask] Received for user ${userId}. Task data:`, task); // Log received task
    if (!userId) {
       console.error('[addTask] Event received without authenticated userId.');
       socket.emit('taskError', { action: 'add', message: 'Authentication required.' });
       return;
    }

    try {
      console.log('[addTask] Initializing Google Drive service...');
      const googleDrive = initializeGoogleDrive(); // Use server credentials
      console.log('[addTask] Loading existing tasks...');
      const tasks = await googleDrive.loadTasks(); // Load current tasks
      console.log(`[addTask] Loaded ${tasks.length} existing tasks.`);

      // Ensure crypto is available (Node.js >= 19 or import 'crypto')
      const crypto = await import('crypto'); // Dynamic import if needed
       const newTask = {
          ...task,
          id: crypto.randomUUID(),
          createdAt: Date.now(), // Use Unix timestamp (milliseconds) to match client interface
          userId: userId,       // Add userId associated with the socket
          userEmail: userEmail,   // Add userEmail associated with the socket
          // Ensure default fields if not provided by client
          completed: task.completed ?? false,
          priority: task.priority ?? 4,
         isStarred: task.isStarred ?? false,
         isPinned: task.isPinned ?? false,
         taskType: task.taskType || 'personal',
         collaborators: task.collaborators || [],
         comments: task.comments || [],
         attachments: task.attachments || [],
      };
      console.log('[addTask] Generated new task with ID:', newTask.id);

      const updatedTasks = [...tasks, newTask];
      console.log(`[addTask] Total tasks to save: ${updatedTasks.length}`);

      console.log('[addTask] Saving updated tasks...');
      const saveSuccess = await googleDrive.saveTasks(updatedTasks);

      if (saveSuccess) {
        console.log('[addTask] Successfully saved tasks to Google Drive.');
        // Broadcast new task to all connected clients for the same user
        console.log('[addTask] Broadcasting taskAdded event for task ID:', newTask.id);
        io.to(userId).emit('taskAdded', newTask); // Use io.to(userId)

        // Client-side will handle scheduling browser reminders based on the new task
        // Email reminders are handled by the backend cron job
        console.log('[addTask] Task added, client-side should handle browser reminder scheduling.');
      } else {
         console.error('[addTask] Failed to save tasks to Google Drive.');
         socket.emit('taskError', { action: 'add', message: 'Failed to save task to cloud storage.' });
      }
    } catch (error) {
      console.error('[addTask] Error processing add task:', error);
      socket.emit('taskError', { action: 'add', message: `Server error adding task: ${error.message}` });
    }
  });

  // Handle task updates
  // Re-enable taskUpdate handler
  socket.on('taskUpdate', async ({ task }) => { // Removed accessToken
     if (!userId) {
       console.error('[taskUpdate] Event received without authenticated userId.');
       socket.emit('taskError', { action: 'update', taskId: task?.id, message: 'Authentication required.' });
       return;
    }
     console.log(`[taskUpdate] Received for user ${userId}. Task ID: ${task.id}`);
    try {
      console.log('[taskUpdate] Initializing Google Drive service...');
      const googleDrive = initializeGoogleDrive(); // Use server credentials
      console.log('[taskUpdate] Loading existing tasks...');
      let tasks = await googleDrive.loadTasks(); // Use let as we modify the array
      console.log(`[taskUpdate] Loaded ${tasks.length} existing tasks.`);

      const taskIndex = tasks.findIndex(t => t.id === task.id);
      if (taskIndex === -1) {
        console.error(`[taskUpdate] Task with ID ${task.id} not found for update.`);
        socket.emit('taskError', { action: 'update', taskId: task.id, message: 'Task not found for update.' });
        return; // Stop processing if task not found
      }

      // Get the existing task data
      const existingTask = tasks[taskIndex];

      // Create the updated task data, merging client data and ensuring userId/userEmail
      // Make sure to preserve fields that might not be sent from client (like createdAt, attachments etc.)
      const updatedTaskData = {
        ...existingTask, // Start with existing data from Drive
        ...task,         // Apply updates received from the client (overwrites fields like title, description, completed, etc.)
        userId: userId,       // Ensure the current user's ID is set/updated
        userEmail: userEmail,   // Ensure the current user's email is set/updated
        // Explicitly handle arrays if they might be missing in the partial update from client
        attachments: task.attachments !== undefined ? task.attachments : existingTask.attachments,
        collaborators: task.collaborators !== undefined ? task.collaborators : existingTask.collaborators,
        comments: task.comments !== undefined ? task.comments : existingTask.comments,
        tags: task.tags !== undefined ? task.tags : existingTask.tags,
      };

      // Create the new tasks array with the updated task
      tasks[taskIndex] = updatedTaskData; // Replace the task in the array

      console.log(`[taskUpdate] Saving ${tasks.length} tasks...`);
      const saveSuccess = await googleDrive.saveTasks(tasks); // Save the modified array

      if(saveSuccess) {
        console.log('[taskUpdate] Successfully saved tasks.');
        // Broadcast update to all connected clients for the same user
        console.log(`[taskUpdate] Broadcasting taskUpdated event for task ID: ${task.id}`);
        io.to(userId).emit('taskUpdated', task); // Use io.to(userId)

        // Client-side will handle re-scheduling browser reminders based on the updated task
        // Email reminders are handled by the backend cron job
        console.log('[taskUpdate] Task updated, client-side should handle browser reminder scheduling.');
      } else {
         console.error('[taskUpdate] Failed to save tasks to Google Drive.');
         socket.emit('taskError', { action: 'update', taskId: task.id, message: 'Failed to save task update to cloud storage.' });
      }
    } catch (error) {
      console.error('[taskUpdate] Error processing task update:', error);
      socket.emit('taskError', { action: 'update', taskId: task.id, message: `Server error updating task: ${error.message}` });
    }
  });
  // End re-enable

  // Handle deleting a task
  socket.on('deleteTask', async ({ taskId }) => { // Removed accessToken
     if (!userId) {
       console.error('deleteTask event received without authenticated userId.');
       socket.emit('taskError', { action: 'delete', taskId: taskId, message: 'Authentication required.' });
       return;
    }

    try {
      const googleDrive = initializeGoogleDrive(); // Use server credentials
      const tasks = await googleDrive.loadTasks();
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      await googleDrive.saveTasks(updatedTasks);

      // Broadcast deleted task ID to all connected clients for the same user
      io.to(userId).emit('taskDeleted', taskId); // Use io.to(userId)

      // Client-side should handle cancelling any browser reminders for this task
      console.log(`[deleteTask] Task ${taskId} deleted, client-side should handle browser reminder cancellation.`);
      // notificationService.cancelBrowserReminder(taskId); // If we were managing timeouts server-side
    } catch (error) {
      console.error('Error deleting task:', error);
      socket.emit('taskError', { action: 'delete', taskId: taskId, message: error.message });
    }
  });

  // Handle chat messages
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
