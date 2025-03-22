import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

class EmailNotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendTaskReminder(to, task) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: `Task Reminder: ${task.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Task Reminder</h2>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0;">${task.title}</h3>
            ${task.description ? `<p style="color: #4b5563;">${task.description}</p>` : ''}
            <p style="color: #4b5563;">Due: ${new Date(task.dueDate).toLocaleString()}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automated reminder from CloudTask.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${to}`);
    } catch (error) {
      console.error('Error sending reminder email:', error);
    }
  }
}

export const emailNotificationService = new EmailNotificationService();