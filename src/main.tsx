import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Import provider
import App from './App.tsx';
import { ErrorBoundary } from './components/error-boundary';
import './index.css';

// Get Client ID from environment variables
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  console.error("FATAL ERROR: VITE_GOOGLE_CLIENT_ID is not defined in .env file.");
  // Optionally render an error message to the user
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = '<div style="color: red; padding: 20px;">Configuration Error: Google Client ID is missing. Please check the environment variables.</div>';
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </GoogleOAuthProvider>
    </StrictMode>
  );
}
// Removed duplicate closing tags below
