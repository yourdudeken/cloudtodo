import nodemailer from 'nodemailer';
import cron from 'node-cron';
// Removed Supabase import: import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { format, isToday, parseISO, startOfMinute, isSameMinute } from 'date-fns';
import { GoogleDriveService } from './google-drive.js'; // Import GoogleDriveService

config(); // Load environment variables from .env

// --- Nodemailer Transporter Setup ---
let transporter;
try {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email service environment variables not configured. Email notifications disabled.');
    transporter = null;
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        console.error('Error verifying email transporter configuration:', error);
        transporter = null;
        console.warn('Email notifications disabled due to configuration error.');
      } else {
        console.log('Email transporter configured successfully.');
      }
    });
  }
} catch (error) {
  console.error('Failed to create email transporter:', error);
  transporter = null;
}

// --- Google Drive Service Initialization ---
let googleDriveService = null;
try {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.VITE_CLIENT_SECRET;
    const redirectUri = process.env.VITE_REDIRECT_URI;
    const refreshToken = process.env.VITE_REFRESH_TOKEN;
    // Remove encryptionKey check
    // const encryptionKey = process.env.VITE_ENCRYPTION_KEY;

    // Remove encryptionKey from check
    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
        console.error("Missing Google Drive credentials for Notification Service.");
    } else {
        googleDriveService = new GoogleDriveService({
            clientId,
            clientSecret,
            redirectUri,
            refreshToken,
            // encryptionKey // Removed
        });
        console.log("Google Drive Service initialized for Notification Service (without encryption).");
    }
} catch (error) {
    console.error("Failed to initialize Google Drive Service for notifications:", error);
}


// --- Notification Service Class (Now mostly placeholder) ---
class NotificationService {
  constructor() {
    // Remove scheduling logic - it's now client-triggered
    // if (googleDriveService) {
    //   this.scheduleEmailChecks();
    // } else {
    //   console.log('Email notifications disabled due to missing Google Drive configuration.');
    // }
    console.log('NotificationService initialized (server-side checks disabled).');
  }

  // --- Email Notifications (Functionality moved to API endpoint in server/index.js) ---
  // Keep the function signature for potential future use or direct calls if needed,
  // but the primary logic is now in the API endpoint.
  async sendEmailNotification(to, task, type) {
    if (!transporter) {
      const err = 'Email transporter not configured';
      console.error(err);
      return { success: false, error: err };
    }
    if (!to || !to.includes('@')) {
      const err = 'Invalid recipient email';
      console.error(err);
      return { success: false, error: err };
    }
    if (!task?.taskTitle || !task.dueDate) {
      const err = 'Invalid task data';
      console.error(err);
      return { success: false, error: err };
    }

    // Safely handle task title and due date
    const sanitizedTitle = task?.title ? task.title.replace(/[^\w\s-]/g, '').substring(0, 50) : 'Untitled Task';
    const dueDateString = task?.dueDate ? 
      (typeof task.dueDate === 'string' ? task.dueDate : 
       (task.dueDate instanceof Date ? task.dueDate.toISOString() : null)) 
      : null;
    const formattedDueDate = dueDateString ? format(parseISO(dueDateString), 'PPP') : 'No date';
    const formattedDueTime = task.dueTime ? ` at ${task.dueTime}` : '';

    // Validate inputs
    if (!sanitizedTitle || !dueDateString) {
      throw new Error(`Invalid task data - title: ${sanitizedTitle}, dueDate: ${dueDateString}`);
    }

    let subject = '';
    let htmlContent = '';

    if (type === 'dueDate') {
      subject = `🔔 ${task.title} is due ${task.dueTime ? `at ${task.dueTime}` : 'today'}`;
      htmlContent = `
        <p>Hi there,</p>
        <p>This is a reminder that your task "<strong>${task.title}</strong>" is due ${task.dueTime ? `at ${task.dueTime} on ${formattedDueDate}` : `today (${formattedDueDate})`}.</p>
        <p><strong>Priority:</strong> ${task.priority ? task.priority : 'Normal'}</p>
      `;
    } else if (type === 'dueTime') {
      subject = `⏰ ${task.title} is due now!`;
      htmlContent = `
        <p>Your task "<strong>${task.title}</strong>" is due now (${formattedDueDate}${formattedDueTime}).</p>
        ${task.description ? `<p><strong>Details:</strong> ${task.description}</p>` : ''}
      `;
    } else if (type === 'dueSoon') {
      subject = `⏳ ${task.title} due soon`;
      htmlContent = `
        <p>Your task "<strong>${task.title}</strong>" is coming up in 1 hour (${formattedDueDate}${formattedDueTime}).</p>
      `;
    } else {
      console.warn(`Unknown email notification type: ${type}`);
      return;
    }

    const mailOptions = {
      from: `"CloudTask" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e40af;">Task Reminder</h2>
          <p>Hi there,</p>
          ${htmlContent}
          ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
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
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Email notification (${type}) sent to ${to} for task "${task.title}": ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const timestamp = new Date().toISOString();
      const errorMsg = `Failed to send ${type} notification for task "${task.title}"`;
      console.error(`[${timestamp}] ${errorMsg}:`, error);
      
      // Retry logic for transient errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log(`[${timestamp}] Attempting retry for ${to}...`);
        try {
          const retryInfo = await transporter.sendMail(mailOptions);
          console.log(`[${timestamp}] [Retry Success] Email sent to ${to}: ${retryInfo.messageId}`);
          return { success: true, messageId: retryInfo.messageId };
        } catch (retryError) {
          console.error(`[${timestamp}] Retry failed for ${to}:`, retryError);
          return { 
            success: false,
            error: `${errorMsg} (retry failed)`,
            details: retryError.message
          };
        }
      }
      
      return { 
        success: false,
        error: errorMsg,
        details: error.message
      };
    }
  }

  // Remove checkDueTasksForEmail as it's incompatible and replaced by client trigger
  /*
  async checkDueTasksForEmail() {
    // ... implementation removed ...
  }
  */

  // Remove scheduleEmailChecks as cron job is no longer needed for this
  /*
  scheduleEmailChecks() {
    // ... implementation removed ...
  }
  */

  // --- Browser Notifications (Placeholders - Handled client-side) ---
  scheduleBrowserReminder(userId, task) {
    console.log(`Placeholder: Would schedule browser reminder for user ${userId}, task ${task.id}`);
  }

  cancelBrowserReminder(taskId) {
     console.log(`Placeholder: Would cancel browser reminder for task ${taskId}`);
  }

  // Enhanced due date notification trigger
  async triggerDueNotifications(userEmail, task) {
    console.log('Triggering notifications for:', { userEmail, taskId: task.id });
    
    if (!userEmail || !userEmail.includes('@')) {
      const err = 'Invalid user email';
      console.error(err);
      return { success: false, error: err };
    }

    if (!task?.id || !task.taskTitle || !task.dueDate) {
      const err = 'Invalid task data';
      console.error(err, task);
      return { success: false, error: err };
    }

    try {
      // Validate due date
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new Error('Invalid due date format');
      }

      // Send immediate due date notification
      const notifications = [];
      const dueDateNotification = await this.sendEmailNotification(
        userEmail,
        task,
        'dueDate'
      );
      notifications.push(dueDateNotification);

      // Schedule time-based notifications if time specified
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        dueDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const timeUntilDue = dueDate - now;

        // Schedule "due soon" notification (1 hour before)
        if (timeUntilDue > 60 * 60 * 1000) {
          notifications.push({
            type: 'dueSoon',
            scheduledTime: new Date(now.getTime() + (timeUntilDue - 60 * 60 * 1000)),
          });
        }

        // Schedule "due now" notification
        if (timeUntilDue > 0) {
          notifications.push({
            type: 'dueNow',
            scheduledTime: new Date(now.getTime() + timeUntilDue),
          });
        }
      }

      console.log('Successfully scheduled notifications:', notifications);
      return { 
        success: true,
        notifications
      };
      
    } catch (error) {
      console.error('Notification scheduling failed:', {
        error: error.message,
        taskId: task?.id,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: 'Failed to schedule notifications',
        details: error.message,
        stack: error.stack
      };
    }
  }
}

// Export a single instance AND the transporter
export const notificationService = new NotificationService();
export { transporter };
