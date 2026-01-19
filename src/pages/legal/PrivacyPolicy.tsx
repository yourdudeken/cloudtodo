import React from 'react';

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Introduction</h2>
          <p>Your privacy is important to us. This privacy statement explains the personal data cloudtodo processes, how cloudtodo processes it, and for what purposes.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Data We Collect</h2>
          <p>cloudtodo collects data to operate effectively and provide you with the best experiences with our services. You provide some of this data directly, such as when you create an account. We get some of it by recording how you interact with our services.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">How We Use Personal Data</h2>
          <p>cloudtodo uses the data we collect to provide you with rich, interactive experiences. In particular, we use data to:</p>
          <ul className="list-disc list-inside">
            <li>Provide our services, which includes updating, securing, and troubleshooting, as well as providing support.</li>
            <li>Improve and develop our services.</li>
            <li>Personalize our services and make recommendations.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
