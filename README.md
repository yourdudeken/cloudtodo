# CloudTask - Task Management Web App

CloudTask is a modern task management application that helps you organize your work and personal tasks with collaborative features.

## Key Features

✅ Task management with priorities, due dates and reminders  
✅ Multiple views (List, Calendar, Kanban board)  
✅ AI-powered task suggestions  
✅ Google Drive integration for file attachments  
✅ Real-time collaboration features  
✅ Responsive design works on all devices  

## Technologies

- **Frontend**:  
  - React + TypeScript  
  - Vite (build tool)  
  - Tailwind CSS  
  - Radix UI components  
- **Backend**:  
  - Node.js/Express  
  - Google Drive API  
  - Supabase (authentication)  

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/username/cloudtodo.git
cd cloudtodo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-supabase-key
```

4. Run the development server:
```bash
npm run dev:all
```

## Usage

1. Sign in with Google or email
2. Create tasks with:
   - Title, description, due dates
   - Priority levels
   - Categories and tags
3. Organize tasks in calendar or kanban views
4. Attach files from Google Drive
5. Collaborate with others on shared tasks

## Future Roadmap

- Mobile app version
- Integration with more cloud storage providers
- Advanced reporting and analytics
- Teams and projects features
