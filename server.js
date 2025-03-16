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

const app = express();

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
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    prompt: 'select_account'
  },
  (accessToken, refreshToken, profile, done) => {
    // Store tokens for Drive API access
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    done(null, profile);
  }
));

// Serialize/Deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

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
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
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
  const taskLink = `${process.env.CLIENT_URL}/task/${req.body.taskId}`;

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));