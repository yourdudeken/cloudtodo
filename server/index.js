import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import schedule from 'node-schedule';
import { GoogleDriveService } from './google-drive.js';
import { emailNotificationService } from './notification-service.js';

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

// Initialize Google Drive service for a user
const initializeGoogleDrive = (accessToken) => {
  return new GoogleDriveService({
    accessToken,
    clientId: process.env.VITE_GOOGLE_CLIENT_ID
  });
};

// Schedule task reminders
const scheduleReminder = async (task, userId) => {
  if (!task.dueDate || !task.reminder) return;

  const reminderTime = new Date(task.dueDate);
  reminderTime.setMinutes(reminderTime.getMinutes() - task.reminder);

  if (reminderTime <= new Date()) return;

  schedule.scheduleJob(reminderTime, async () => {
    // Send browser notification through socket
    const userSocket = activeUsers.get(userId);
    if (userSocket) {
      userSocket.emit('taskReminder', {
        taskId: task.id,
        title: task.title,
        dueDate: task.dueDate
      });
    }

    // Send email notification
    const userEmail = task.collaborators?.find(c => c.userId === userId)?.userEmail;
    if (userEmail) {
      await emailNotificationService.sendTaskReminder(userEmail, task);
    }
  });
};

// Sync tasks with Google Drive
const syncTasks = async (userId, accessToken) => {
  try {
    const googleDrive = initializeGoogleDrive(accessToken);
    const tasks = await googleDrive.loadTasks();
    return tasks;
  } catch (error) {
    console.error('Error syncing tasks:', error);
    return null;
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  let userId = null;

  socket.on('authenticate', async ({ userId: uid, accessToken }) => {
    userId = uid;
    activeUsers.set(userId, socket);

    // Initial sync
    const tasks = await syncTasks(userId, accessToken);
    if (tasks) {
      socket.emit('tasksSynced', tasks);
      
      // Schedule reminders for all tasks
      tasks.forEach(task => scheduleReminder(task, userId));
    }
  });

  // Handle task updates
  socket.on('taskUpdate', async ({ task, accessToken }) => {
    if (!userId) return;

    try {
      const googleDrive = initializeGoogleDrive(accessToken);
      const tasks = await googleDrive.loadTasks();
      const updatedTasks = tasks.map(t => t.id === task.id ? task : t);
      await googleDrive.saveTasks(updatedTasks);

      // Broadcast update to all connected clients for the same user
      socket.broadcast.to(userId).emit('taskUpdated', task);

      // Update reminder if necessary
      scheduleReminder(task, userId);
    } catch (error) {
      console.error('Error updating task:', error);
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

  // Handle disconnection
  socket.on('disconnect', () => {
    if (userId) {
      activeUsers.delete(userId);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});