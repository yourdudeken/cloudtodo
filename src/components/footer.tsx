//import React from 'react';
import { Github, Twitter, Mail, Heart, Coffee } from 'lucide-react';
import { Button } from './ui/button';

export function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About cloudtodo</h3>
            <p className="text-sm text-gray-600">
              A beautiful and secure way to manage your tasks, seamlessly integrated
              with Google Drive for reliable cloud storage and synchronization.
            </p>
          </div>

          {/* Features Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Features</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>Google Drive Integration</li>
              <li>AI-Powered Task Management</li>
              <li>Real-time Collaboration</li>
              <li>Smart Task Organization</li>
              <li>Secure Data Storage</li>
            </ul>
          </div>

          {/* Resources Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <a href="/documentation" className="hover:text-blue-600">Documentation</a>
              </li>
              <li>
                <a href="/api-reference" className="hover:text-blue-600">API Reference</a>
              </li>
              <li>
                <a href="/privacy-policy" className="hover:text-blue-600">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms-of-service" className="hover:text-blue-600">Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Connect Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connect</h3>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="hover:text-blue-600">
                <Github className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-blue-600">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-blue-600">
                <Mail className="h-5 w-5" />
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              <p>Questions or feedback?</p>
              <a href="mailto:support@cloudtodo.com" className="text-blue-600 hover:underline">
                support@cloudtodo.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>© 2024 cloudtodo. All rights reserved.</span>
              <span className="flex items-center gap-1">
                Made with <Heart className="h-4 w-4 text-red-500 fill-current" /> and
                <Coffee className="h-4 w-4 text-amber-700" />
              </span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-blue-600">Privacy</a>
              <a href="#" className="hover:text-blue-600">Terms</a>
              <a href="#" className="hover:text-blue-600">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
