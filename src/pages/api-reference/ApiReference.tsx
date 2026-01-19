import React from 'react';

export function ApiReference() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">API Reference</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Introduction</h2>
          <p>Our API allows you to integrate your own applications with cloudtodo. This reference documentation provides detailed information about the available endpoints.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Authentication</h2>
          <p>To use the API, you will need to obtain an API key from your account settings. All API requests must include this key in the Authorization header.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Endpoints</h2>
          <ul className="list-disc list-inside">
            <li><strong>GET /tasks</strong> - Retrieve a list of tasks.</li>
            <li><strong>POST /tasks</strong> - Create a new task.</li>
            <li><strong>GET /tasks/:id</strong> - Retrieve a single task.</li>
            <li><strong>PUT /tasks/:id</strong> - Update a task.</li>
            <li><strong>DELETE /tasks/:id</strong> - Delete a task.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
