# cloudtodo - Google Drive-Based Todo Application

##  Overview

**cloudtodo** is a modern, privacy-first todo list application that stores all your data directly in **your personal Google Drive**. No external databases, no third-party servers storing your data - everything lives in your Google Drive account, giving you complete ownership and control.

##  Key Features

###  **100% User-Owned Data**
- All tasks stored as JSON files in your Google Drive
- Attachments (images, videos, documents, audio) saved in organized folders
- No external database - you own and control everything
- Data persists in your Google Drive even if you stop using the app

###  **Privacy & Security**
- OAuth 2.0 authentication via Google
- Direct API calls to Google Drive - no intermediary servers
- Your data never leaves your Google account
- Revoke access anytime from your Google Account settings

###  **Smart Organization**
- Automatic folder structure in Google Drive (`CLOUDTODO/`)
- Organized attachment folders (AUDIOS, VIDEOS, DOCUMENTS, PICTURES)
- Each task is a separate JSON file for easy backup and portability

###  **Rich Features**
- Multiple views: List, Calendar, Kanban board
- Task priorities, due dates, and reminders
- File attachments from your device
- Collaborative tasks with comments
- AI-powered task suggestions
- Real-time browser notifications
- Offline caching with automatic sync

##  How It Works

### Architecture

```
User's Google Drive
└── CLOUDTODO/                    # Root folder for all tasks
    ├── task1.json                # Individual task files
    ├── task2.json
    ├── task3.json
    ├── AUDIOS/                   # Audio attachments
    │   └── recording.mp3
    ├── VIDEOS/                   # Video attachments
    │   └── demo.mp4
    ├── DOCUMENTS/                # Document attachments
    │   └── notes.pdf
    └── PICTURES/                 # Image attachments
        └── screenshot.png
```

### Data Flow

1. **Authentication**: User logs in with Google OAuth 2.0
2. **Initialization**: App creates `CLOUDTODO` folder in user's Drive
3. **Task Creation**: New tasks saved as JSON files in `CLOUDTODO/`
4. **Attachments**: Files uploaded to appropriate subfolders
5. **Sync**: Changes immediately reflected in Google Drive
6. **Offline**: Local cache for offline access, syncs when online

### Task Data Structure

Each task is stored as a JSON file with this structure:

```json
{
  "taskTitle": "Complete project documentation",
  "description": "Write comprehensive docs for the new feature",
  "dueDate": "25-01-2026",
  "dueTime": "14:30",
  "reminder": 30,
  "priority": 1,
  "taskType": {
    "isPersonal": false,
    "isCollaborative": true
  },
  "isStarred": true,
  "isPinned": false,
  "categories": ["Work", "Documentation"],
  "tags": ["Important", "Urgent"],
  "recurrence": "None",
  "status": "in-progress",
  "attachments": {
    "audio": [],
    "images": ["1a2b3c4d5e6f"],
    "documents": ["7g8h9i0j1k2l"],
    "videos": []
  },
  "comments": [
    {
      "id": "uuid-here",
      "userId": "user-id",
      "userEmail": "user@example.com",
      "content": "Great progress!",
      "createdAt": "2026-01-19T10:30:00.000Z"
    }
  ],
  "id": "google-drive-file-id",
  "createdDate": "2026-01-19T09:00:00.000Z",
  "updatedDate": "2026-01-19T10:30:00.000Z"
}
```

##  Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Account
- Google Cloud Project with Drive API enabled

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Drive API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173`
5. Copy your Client ID

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/yourdudeken/cloudtodo.git
cd cloudtodo

# Install dependencies
npm install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
# Google Drive API Credentials
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 4. Run the Application

```bash
# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 5. First Login

1. Click "Sign in with Google"
2. Authorize the app to access your Google Drive
3. App automatically creates `CLOUDTODO` folder
4. Start creating tasks!

## Usage Guide

### Creating Tasks

1. Click "+ Add Task" button
2. Fill in task details:
   - Title (required)
   - Description
   - Due date and time
   - Priority (High/Medium/Low)
   - Categories and tags
   - Recurrence pattern
3. Click "Create Task"
4. Task is immediately saved to your Google Drive

### Adding Attachments

1. Open a task
2. Click "Add Attachment"
3. Select file from your device
4. File uploads to appropriate folder in Google Drive
5. Attachment link stored in task JSON

### Viewing in Different Modes

- **List View**: Traditional todo list with filters
- **Calendar View**: See tasks on a calendar
- **Kanban Board**: Organize by status columns

### Collaboration

1. Open a task
2. Click "Collaborate"
3. Add comments
4. Comments stored in task JSON file

### Offline Usage

- Tasks cached locally for offline access
- Changes queued and synced when online
- Automatic conflict resolution

##  Technical Details

### Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **Zustand** for state management
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation
- **Google Drive API** for storage
- **OAuth 2.0** for authentication

### Google Drive Integration

- **Direct API calls** using `axios`
- **OAuth 2.0** for authentication
- **REST API v3** for file operations
- **Multipart upload** for attachments

### Key Services

#### `googleDrive.ts`
- `createTask()` - Creates JSON file in Drive
- `listTasks()` - Lists all task files
- `readTask()` - Reads task JSON content
- `updateTask()` - Updates task file
- `deleteTask()` - Deletes task file
- `uploadAttachment()` - Uploads files to Drive
- `getOrCreateFolder()` - Manages folder structure

#### `authStore.ts`
- Google OAuth authentication
- User profile management
- Token refresh handling
- Logout and cleanup

#### `tasksStore.ts`
- Task CRUD operations
- Local state management
- Cache synchronization
- Notification scheduling

##  Security & Privacy

### Data Ownership
- **You own your data** - Everything stored in your Google Drive
- **No external database** - We don't store anything on our servers
- **Portable** - Export your data anytime from Google Drive

### Access Control
- **OAuth 2.0** - Industry-standard authentication
- **Scoped permissions** - App only accesses Drive files it creates
- **Revocable** - Revoke access anytime from Google Account settings

### Data Privacy
- **No tracking** - We don't track your usage
- **No analytics** - Your data stays private
- **Open source** - Audit the code yourself

##  Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables for Production

```env
VITE_GOOGLE_CLIENT_ID=your-production-client-id
# Update OAuth redirect URIs in Google Cloud Console
```

##  Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

##  License

MIT License - See LICENSE file for details

##  Acknowledgments

- Google Drive API for storage
- React community for amazing tools
- All contributors and users

##  Support

- **Issues**: [GitHub Issues](https://github.com/yourdudeken/cloudtodo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourdudeken/cloudtodo/discussions)

---

**Made with  by the cloudtodo team**

*Your tasks, your drive, your control.*
