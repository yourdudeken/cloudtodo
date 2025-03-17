import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import dayjs from 'dayjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'cookie-session';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();

// Store verification codes (in production, use Redis or similar)
const verificationCodes = new Map();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'your-secret-key'],
  maxAge: 24 * 60 * 60 * 1000 // 1 day
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Generate verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send verification code email
const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: `"Task Manager Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a56db;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This code will expire in 5 minutes.<br>
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Email notification function
async function sendTaskReminder(userEmail, userName, taskName, dueDate, priority, taskLink) {
  const mailOptions = {
    from: `"Task Reminder" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `⏳ Reminder: Upcoming Task - ${taskName}`,
    html: `
      <p>Hello <strong>${userName}</strong>,</p>
      <p>This is a reminder about your upcoming task:</p>
      <ul>
        <li>📌 <strong>Task:</strong> ${taskName}</li>
        <li>📅 <strong>Due Date:</strong> ${dueDate}</li>
        <li>📍 <strong>Priority:</strong> ${priority}</li>
      </ul>
      <p>🔗 <a href="${taskLink}" target="_blank">View Task</a></p>
      <p>Don't forget to complete it on time!</p>
      <p>Best,<br>🚀 <strong>Your To-Do App Team</strong></p>
    `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/auth/google/callback",
    prompt: 'select_account'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Generate and store verification code
      const code = generateVerificationCode();
      verificationCodes.set(profile.emails[0].value, {
        code,
        timestamp: Date.now(),
        attempts: 0
      });

      // Send verification code
      await sendVerificationCode(profile.emails[0].value, code);

      // Store tokens for Drive API access
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;
      done(null, profile);
    } catch (error) {
      done(error);
    }
  }
));

// Serialize/Deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file'
    ],
    prompt: 'select_account',
    accessType: 'offline'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173' }),
  (req, res) => {
    res.redirect('http://localhost:5173/verify');
  }
);

// Verification endpoint
app.post('/auth/verify', (req, res) => {
  const { code } = req.body;
  const user = req.user;

  if (!user || !user.emails || !user.emails[0]) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  const email = user.emails[0].value;
  const verification = verificationCodes.get(email);

  if (!verification) {
    return res.status(401).json({ success: false, message: 'No verification code found' });
  }

  // Check if code is expired (5 minutes)
  if (Date.now() - verification.timestamp > 5 * 60 * 1000) {
    verificationCodes.delete(email);
    return res.status(401).json({ success: false, message: 'Verification code expired' });
  }

  // Check attempts
  if (verification.attempts >= 3) {
    verificationCodes.delete(email);
    return res.status(401).json({ success: false, message: 'Too many attempts' });
  }

  // Increment attempts
  verification.attempts++;

  // Check code
  if (verification.code !== code) {
    return res.status(401).json({ success: false, message: 'Invalid code' });
  }

  // Success - clean up and proceed
  verificationCodes.delete(email);
  return res.json({ success: true });
});

app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('http://localhost:5173');
});

// Auth check middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Drive API setup
const getDriveClient = (accessToken) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

// Protected API Routes
app.get("/api/todos", isAuthenticated, async (req, res) => {
  try {
    const drive = getDriveClient(req.user.accessToken);
    const dateString = dayjs().format("dddDDMMM").toLowerCase() + ".json";
    const fileList = await drive.files.list({
      q: `name='${dateString}' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: "files(id, name)"
    });

    if (!fileList.data.files.length) return res.json([]);

    const fileId = fileList.data.files[0].id;
    const fileRes = await drive.files.get({ fileId, alt: "media" });

    res.json(fileRes.data);
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).send("Error fetching todos");
  }
});

app.post("/api/todos", isAuthenticated, async (req, res) => {
  try {
    const drive = getDriveClient(req.user.accessToken);
    const dateString = dayjs().format("dddDDMMM").toLowerCase() + ".json";
    const fileList = await drive.files.list({
      q: `name='${dateString}' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: "files(id, name)"
    });

    const fileMetadata = {
      name: dateString,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      mimeType: "application/json"
    };
    const media = {
      mimeType: "application/json",
      body: JSON.stringify(req.body, null, 2)
    };

    if (fileList.data.files.length > 0) {
      await drive.files.update({
        fileId: fileList.data.files[0].id,
        media
      });
    } else {
      await drive.files.create({ resource: fileMetadata, media });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving todos:", err);
    res.status(500).send("Error saving todos");
  }
});

// Email notification endpoint
app.post("/api/send-reminder", isAuthenticated, async (req, res) => {
  const { taskName, dueDate, priority } = req.body;
  const userEmail = req.user.emails[0].value;
  const userName = req.user.displayName;
  const taskLink = `http://localhost:5173/task/${req.body.taskId}`;

  try {
    const success = await sendTaskReminder(
      userEmail,
      userName,
      taskName,
      dueDate,
      priority,
      taskLink
    );

    if (success) {
      res.json({ message: "Reminder sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send reminder" });
    }
  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => console.log(`Server running on http://localhost:${PORT}`));