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
    const encryptionKey = process.env.VITE_ENCRYPTION_KEY;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken || !encryptionKey) {
        console.error("Missing Google Drive credentials or Encryption Key for Notification Service.");
    } else {
        googleDriveService = new GoogleDriveService({
            clientId,
            clientSecret,
            redirectUri,
            refreshToken,
            encryptionKey
        });
        console.log("Google Drive Service initialized for Notification Service.");
    }
} catch (error) {
    console.error("Failed to initialize Google Drive Service for notifications:", error);
}


// --- Notification Service Class ---
class NotificationService {
  constructor() {
    // Schedule checks only if Drive service is available
    // Email sending depends on transporter AND finding email (which is now removed)
    if (googleDriveService) {
      this.scheduleEmailChecks();
    } else {
      console.log('Email notifications disabled due to missing Google Drive configuration.');
    }
  }

  // --- Email Notifications (Now requires email to be passed or found differently) ---

  async sendEmailNotification(to, task, type) {
    if (!transporter) {
      console.log('Email transporter not configured. Skipping email notification.');
      return;
    }
    if (!to) {
      console.warn(`Cannot send email for task "${task.title}" (ID: ${task.id}): User email not provided.`);
      return;
    }

    let subject = '';
    let htmlContent = '';
    const dueDateString = typeof task.dueDate === 'string' ? task.dueDate : (task.dueDate instanceof Date ? task.dueDate.toISOString() : null);
    const formattedDueDate = dueDateString ? format(parseISO(dueDateString), 'PPP') : 'No date';
    const formattedDueTime = task.dueTime ? ` at ${task.dueTime}` : '';

    if (type === 'dueDate') {
      subject = `Task Due Today: ${task.title}`;
      htmlContent = `<p>This is a reminder that your task "<strong>${task.title}</strong>" is due today, ${formattedDueDate}.</p>`;
    } else if (type === 'dueTime') {
      subject = `Task Due Now: ${task.title}`;
      htmlContent = `<p>Your task "<strong>${task.title}</strong>" is due right now (${formattedDueDate}${formattedDueTime}).</p>`;
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
      console.log(`Email notification (${type}) sent to ${to} for task "${task.title}": ${info.messageId}`);
    } catch (error) {
      console.error(`Error sending ${type} email to ${to} for task "${task.title}":`, error);
    }
  }

  async checkDueTasksForEmail() {
    // Removed Supabase dependency check
    if (!transporter || !googleDriveService) return;

    console.log('Checking for due tasks for email notifications...');
    const now = new Date();
    const currentMinute = startOfMinute(now);

    try {
      // Fetch tasks from Google Drive
      const tasks = await googleDriveService.loadTasks();

      if (!tasks || tasks.length === 0) {
        console.log('No tasks found in Google Drive.');
        return;
      }

      console.log(`Processing ${tasks.length} tasks from Google Drive for notifications.`);

      // --- Removed Supabase email fetching logic ---
      // const userIds = [...new Set(tasks.map(task => task.userId).filter(id => id))];
      // if (userIds.length === 0) { ... }
      // const { data: profiles, error: profileError } = await supabase...
      // const userEmailMap = new Map(profiles.map(p => [p.id, p.email]));

      for (const task of tasks) {
        // Skip if task is completed or has no due date
        // We can no longer reliably get the user's email here without Supabase
        // unless the email is stored directly in the task data from Google Drive.
        if (task.completed || !task.dueDate) {
          continue;
        }

        // **Placeholder for getting user email:**
        // You would need to modify how tasks are stored in Google Drive
        // to include the user's email directly, or implement another
        // mechanism to associate tasks with emails.
        const userEmail = task.userEmail; // Assuming task object might have userEmail

        if (!userEmail) {
          console.warn(`No email found for task ID: ${task.id}. Cannot send email notification.`);
          continue; // Skip if no email is associated with the task
        }

        const dueDate = parseISO(task.dueDate); // Parse the date string

        // Check for Due Time Notification (if time is set and matches current minute)
        if (task.dueTime && isToday(dueDate)) {
          const [hours, minutes] = task.dueTime.split(':').map(Number);
          const dueDateTime = new Date(dueDate);
          dueDateTime.setHours(hours, minutes, 0, 0);

          if (isSameMinute(currentMinute, dueDateTime)) {
            console.log(`Task "${task.title}" (ID: ${task.id}) is due now. Sending time-specific email to ${userEmail}.`);
            await this.sendEmailNotification(userEmail, task, 'dueTime');
          }
        }
        // Logic for "Due Today" email (sent once daily) would require a different approach
        // without the Supabase 'email_sent_today' flag. Could potentially track sent emails
        // in memory (lost on restart) or another persistent store if needed.
      }

    } catch (error) {
      console.error('Error during due task email check:', error);
    }
  }

  scheduleEmailChecks() {
    // Run every minute to check for tasks due at the specific time
    cron.schedule('* * * * *', () => {
      this.checkDueTasksForEmail();
    });

    console.log('Scheduled email notification checks (every minute). NOTE: Requires user email in task data.');
    // Removed the daily reset cron job as 'email_sent_today' flag is removed
  }

  // --- Browser Notifications (Placeholder - Actual scheduling/sending is client-side) ---
  scheduleBrowserReminder(userId, task) {
    console.log(`Placeholder: Would schedule browser reminder for user ${userId}, task ${task.id}`);
  }

  cancelBrowserReminder(taskId) {
     console.log(`Placeholder: Would cancel browser reminder for task ${taskId}`);
  }
}

// Export a single instance
export const notificationService = new NotificationService();
