# CloudTodo - Google Drive-Based Task Synergy

## Overview

CloudTodo is a premium, privacy-first task management ecosystem that leverages your personal Google Drive as a secure, decentralized backend. It eliminates the need for third-party databases, providing you with 100% ownership, portability, and control over your data.

By utilizing the native capabilities of the Google Drive API, CloudTodo provides a rich, collaborative experience while maintaining the absolute privacy of a local application.

---

## Key Features

### User-Owned Ecology
- **Decentralized Storage**: All tasks are stored as JSON files within your own Google Drive storage space.
- **Native Attachments**: High-speed handling of images, videos, documents, and audio recordings, managed in a structured folder hierarchy.
- **Zero-Server Footprint**: Your data never touches an external database. It moves directly between your browser and Google's global infrastructure.

### Native Collaboration
- **True Sharing**: Invite collaborators via email to specific tasks. The application orchestrates native Google Drive permissions (Writer/Owner).
- **Collaborative Sync Hub**: Manage all active collaborators directly within the task interface. Revoke or grant access with surgical precision.
- **Auto-Discovery**: Collaborative tasks shared with you by others are automatically discovered and injected into your dashboard using appProperties metadata.

### Premium UI/UX
- **Rich Aesthetics**: A professional dark-mode interface with glassmorphism, smooth transitions, and vibrant accents.
- **Multi-View System**: Pivot between a high-efficiency List View, a visual Grid View, and a tactical Kanban Board.
- **Visual Intelligence**: Custom indicators for Solo Missions versus Team Efforts, plus dedicated markers for Pinned and Starred tasks.

### Integrated Cloud Assets
- **Atomic Categorization**: Attachments are organized per-task, ensuring all related media stays within its own context.
- **Secure Media Pipeline**: Images and media are fetched as binary blobs and rendered securely, bypassing public URL exposure.
- **Recursive Cleanup**: Deleting a task automatically purges its associated attachments folder, maintaining a clean Drive environment.

---

## Architecture

### Folder Structure in your Drive
```
User's Google Drive
└── CLOUDTODO/                    # Root Application Hub
    ├── tasks/                    # Task Metadata Registry
    │   ├── task-1712345678.json  # Task JSON Metadata
    │   └── task-1712345679.json
    └── attachments/              # Binary Asset Storage
        ├── <taskId>/             # Dedicated folder for a specific task
        │   ├── image.jpg
        │   └── document.pdf
```

### Data Synergy Model
1. **Authentication**: Secure handshake via Google OAuth 2.0 with minimal scope requirements.
2. **Metadata Tracking**: Tasks are tagged with custom properties for instant indexing and cross-device discovery.
3. **Permission Orchestration**: Collaborative tasks utilize the Google Drive Permissions API for secure, multi-user write access.
4. **Binary Stream**: Attachments are managed via Multipart Uploads to ensure integrity and performance.

---

## Tech Stack

- **Frontend**: React 19 (TypeScript)
- **Build System**: Vite 7
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4 (Custom Design System)
- **Icons**: Lucide React
- **Networking**: Axios (Direct Google API Integration)
- **Security**: OAuth 2.0 Scoped Access

---

## Getting Started

### Prerequisites
- Node.js 20 or higher
- A Google Cloud Project with the Google Drive API enabled

### 1. Configure Google Cloud
1. Enable the Google Drive API in the Google Cloud Console.
2. Create OAuth 2.0 Credentials for a Web Application.
3. Add `http://localhost:5173` to the Authorized JavaScript origins.

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/yourdudeken/cloudtodo.git
cd cloudtodo

# Install dependencies
npm install

# Configure environment
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" > .env
```

### 3. Execution
```bash
npm run dev
```

---

## Privacy and Security Policy

### Data Sovereignty
Your productivity data is a private conversation between you and your storage provider. CloudTodo does not have a backend, tracking pixels, or an analytics engine.

### Scoped Access
The application requests the drive.file scope. This means it can only access files it created or those you explicitly opened with it. It cannot read your other private documents on Google Drive.

---

**Efficiency without compromise.**
