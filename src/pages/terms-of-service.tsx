import React from 'react';

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using the cloudtodo service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">2. Description of Service</h2>
          <p>cloudtodo provides a task management application designed to help you organize your work and personal tasks. The service is provided on an "as is" and "as available" basis.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">3. User Conduct</h2>
          <p>You are responsible for all your activity on the cloudtodo service. You agree not to use the service for any illegal or unauthorized purpose.</p>
        </section>
      </div>
    </div>
  );
}
