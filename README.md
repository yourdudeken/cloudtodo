# cloudtodo - Google Drive-Based Task Synergy

## Overview

**cloudtodo** is a premium, privacy-first task management ecosystem that leverages your **personal Google Drive** as a secure, decentralized backend. It eliminates the need for third-party databases, giving you 100% ownership, portability, and control over your data.

By utilizing the native capabilities of the Google Drive API, **cloudtodo** provides a rich, collaborative experience while maintaining the absolute privacy of a local application.

---

## Key Features

### **User-Owned Ecology**
- **Decentralized Storage**: All tasks are stored as encrypted-at-rest JSON files within your own Google Drive.
- **Native Attachments**: High-speed handling of images, videos, documents, and audio recordings, managed in a dedicated folder hierarchy.
- **Zero-Server Footprint**: Your data never touches an external database. It moves directly between your browser and Google's global infrastructure.

### **Native Collaboration (Powered by Drive Permissions)**
- **True Sharing**: Invite collaborators via email to specific tasks. The app orchestrates native Google Drive permissions (Writer/Owner).
- **Collaborative Sync Hub**: Manage all active collaborators directly within the task interface. Revoke or grant access with a single click.
- **Auto-Discovery**: Collaborative tasks shared with you by others are automatically discovered and injected into your dashboard using `appProperties` metadata.

### **Premium UI/UX**
- **Rich Aesthetics**: A stunning dark-mode interface with glassmorphism, smooth transitions, and vibrant accents.
- **Multi-View System**: Pivot between a high-efficiency **List View**, a visual **Grid View**, and a tactical **Kanban Board**.
- **Visual Intelligence**: Custom icons for **Solo Missions** vs. **Team Efforts**, plus dedicated indicators for **Pinned** and **Starred** tasks.

### **Integrated Cloud Assets**
- **Smart Categorization**: Attachments are automatically sorted into `AUDIOS`, `VIDEOS`, `DOCUMENTS`, and `PICTURES`.
- **Secure Media Pipeline**: Images and media are fetched as binary blobs and rendered securely, bypassing public URL exposure.
- **Recursive Cleanup**: Deleting a task automatically purges all associated cloud assets, preventing "orphaned" files in your Drive.

---

## Architecture

### Folder Structure in your Drive
```
User's Google Drive
└── CLOUDTODO/                    # Root Application Hub
    ├── 6f9a...json               # Task JSON Metadata (ID is Drive FileId)
    ├── 2d4b...json
    ├── AUDIOS/                   # Secure Voice & Sound
    ├── VIDEOS/                   # High-Def Motion Assets
    ├── DOCUMENTS/                # PDFs, Text, and Code
    └── PICTURES/                 # Visual Snapshots & Images
```

### Data Synergy Model
1. **Auth**: Secure handshake via Google OAuth 2.0.
2. **Metadata**: Tasks are tagged with `appProperties: { app: 'cloudtodo' }` for instant lookup.
3. **Permissions**: Collaborative tasks trigger a `Permission.create` request to the Drive API for the collaborator's email.
4. **Binary Stream**: Attachments are managed via Multipart Uploads for maximum reliability.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State**: Zustand (Atomic State Management)
- **Styling**: TailwindCSS + Vanilla CSS (Custom Design System)
- **Icons**: Lucide React (High-consistency glyphs)
- **Networking**: Axios (Direct Google API Integration)
- **Security**: OAuth 2.0 Scoped Access

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Google Cloud Project with the **Google Drive API** enabled.

### 1. Configure Google Cloud
1.  Enable **Google Drive API** in the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create OAuth 2.0 Credentials (Web Application).
3.  Set Authorized Redirect URIs to `http://localhost:5173`.

### 2. Local Setup
```bash
# Clone and Install
git clone https://github.com/yourdudeken/cloudtodo.git
cd cloudtodo
npm install

# Setup Environment
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" > .env
```

### 3. Launch
```bash
npm run dev
```

---

## Privacy & Security Policy

### Data Sovereignty
We believe you should own your tools. **cloudtodo** does not have a backend, a tracking pixel, or an analytics engine. Your productivity data is a private conversation between you and your storage provider.

### Scoped Access
The application requests the `https://www.googleapis.com/auth/drive.file` scope, meaning it **only** has access to the files it creates or those you explicitly open with it. It cannot see your other private documents.

---

## Contributing
Features are implemented using an agentic coding workflow. If you'd like to contribute:
1. Fork the repo.
2. Implement features following the **Separation of Concerns** principle.
3. Ensure all Folder/Task operations are synced with `googleDriveService.ts`.
4. Submit a PR.

---

**Made for the Decentralized Web**
*Efficiency without compromise.*
