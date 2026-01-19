import { GoogleTokenResponse } from '@/types';

/// <reference types="vite/client" />

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: GoogleTokenResponse) => void;
                    }) => {
                        requestAccessToken: () => void;
                    };
                    revoke: (accessToken: string, done: () => void) => void;
                };
            };
        };
    }
}
