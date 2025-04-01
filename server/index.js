import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
// Import transporter and date-fns
import { transporter } from './notification-service.js';
import { format, parseISO } from 'date-fns';

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Allow requests from the frontend
    methods: ["GET", "POST"]
  }
});

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Store active user connections (still useful for chat/presence)
const activeUsers = new Map();

// Removed initializeGoogleDrive and syncTasks as they are no longer needed server-side for tasks

// --- API Endpoint for Client-Triggered Email ---
app.post('/api/send-due-email', async (req, res) => {
  const { email, taskTitle, taskDescription, dueDate, dueTime } = req.body;

  console.log(`[API /send-due-email] Received request for email: ${email}, task: ${taskTitle}`);

  if (!email || !taskTitle) {
    console.error('[API /send-due-email] Missing required fields (email or taskTitle).');
    return res.status(400).json({ message: 'Missing required fields: email and taskTitle.' });
  }

  if (!transporter) {
    console.error('[API /send-due-email] Email transporter not available.');
    return res.status(500).json({ message: 'Email service is not configured on the server.' });
  }

  // Prepare email content (similar to notification-service logic)
  let subject = `Task Due Now: ${taskTitle}`;
  // Format date/time for the email body if they exist
  const formattedDueDate = dueDate ? format(parseISO(dueDate), 'PPP') : 'No date'; // Assumes YYYY-MM-DD input
  const formattedDueTime = dueTime ? ` at ${dueTime}` : '';
  let htmlContent = `<p>Your task "<strong>${taskTitle}</strong>" is due right now (${formattedDueDate}${formattedDueTime}).</p>`;

  const mailOptions = {
    from: `"CloudTask" <${process.env.EMAIL_USER}>`,
    to: email, // Use email from request body
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
        <h2 style="color: #1e40af;">Task Reminder</h2>
        <p>Hi there,</p>
        ${htmlContent}
        ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
        <p style="margin-top: 25px; font-size: 0.9em; color: #6b7280;">
          You can view this task in the CloudTask app.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #9ca3af;">This is an automated message from CloudTask.</p>
      </div>
    `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log(`[API /send-due-email] Email sent successfully to ${email} for task "${taskTitle}": ${info.messageId}`);
    res.status(200).json({ message: 'Email sent successfully.' });
  } catch (error) {
    console.error(`[API /send-due-email] Error sending email to ${email} for task "${taskTitle}":`, error);
    res.status(500).json({ message: 'Failed to send email.' });
  }
});


// --- Socket.IO connection handling (for chat/presence, not tasks) ---
io.on('connection', (socket) => {
  let userId = null;
  let userEmail = null;

  socket.on('authenticate', async ({ userId: uid, email: emailAddress }) => {
    console.log(`User ${uid} (${emailAddress || 'No email provided'}) attempting authentication...`);
    if (!uid || !emailAddress) {
      console.error("Authentication failed: Missing userId or email from client.");
      socket.emit('authError', { message: 'Authentication failed: Missing user ID or email.' });
      socket.disconnect(true);
      return;
    }
    userId = uid;
    userEmail = emailAddress;
    activeUsers.set(userId, { socket, email: userEmail });
    console.log(`User ${userId} authenticated with email ${userEmail}`);
    // No initial task sync needed here anymore
  });

  // Keep chat message handling if needed
  socket.on('chatMessage', async ({ taskId, message, userId: msgUserId }) => { // Renamed userId from destructuring
    // Basic validation
    if (!taskId || !message || !msgUserId) {
        console.error('[chatMessage] Invalid data received:', { taskId, message, userId: msgUserId });
        return;
    }
    // Find the sender's email from activeUsers (optional, could just use msgUserId)
    const senderInfo = activeUsers.get(msgUserId);
    const senderEmail = senderInfo ? senderInfo.email : 'Unknown';

    console.log(`[chatMessage] Received from ${senderEmail} for task ${taskId}`);

    try {
      // Use crypto directly if available in Node.js version
      const crypto = await import('crypto');
      const newMessage = {
        id: crypto.randomUUID(),
        taskId,
        userId: msgUserId, // Use the ID from the message payload
        userEmail: senderEmail, // Include sender's email
        content: message, // Assuming 'content' is the field name expected by client
        createdAt: new Date().toISOString()
      };

      // Broadcast message to all users in the task's room
      // Ensure room name matches client-side joinTaskRoom if that's still used
      io.to(`task-${taskId}`).emit('newMessage', newMessage);
      console.log(`[chatMessage] Broadcasted to room task-${taskId}`);
    } catch (error) {
      console.error('[chatMessage] Error processing chat message:', error);
    }
  });

  // Join task-specific chat room
  socket.on('joinTaskRoom', (taskId) => {
    if (taskId) {
        console.log(`Socket ${socket.id} joining room task-${taskId}`);
        socket.join(`task-${taskId}`);
    }
  });

  // Associate socket with userId room for broadcasting (useful for presence)
  socket.on('registerUser', (uid) => {
    if (uid) {
      userId = uid; // Re-associate userId if needed
      socket.join(uid);
      console.log(`User ${userId} registered socket ${socket.id}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (userId) {
      activeUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
