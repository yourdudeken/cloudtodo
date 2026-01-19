import React from 'react';

export function Documentation() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Documentation</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Introduction</h2>
          <p>Welcome to the documentation for cloudtodo. This guide will help you get started with our task management application and make the most of its features.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Getting Started</h2>
          <p>To start using cloudtodo, simply sign up with your Google account. Once logged in, you can begin creating tasks, organizing them into projects, and collaborating with your team.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Features</h2>
          <ul className="list-disc list-inside">
            <li>Task Creation and Management</li>
            <li>Google Drive Integration</li>
            <li>AI-Powered Suggestions</li>
            <li>Real-time Collaboration</li>
            <li>Customizable Views (List, Kanban, Calendar)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
