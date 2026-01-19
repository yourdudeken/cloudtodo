import { useNotificationStore } from '@/store/notifications';

export class ErrorHandler {
  static handle(error: unknown, fallbackMessage: string = 'An error occurred'): string {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = fallbackMessage;
    }

    // Log error for debugging
    console.error('Error:', error);

    // Show notification
    useNotificationStore.getState().addNotification({
      type: 'error',
      message: errorMessage
    });

    return errorMessage;
  }

  static handleNetworkError(error: unknown): string {
    if (error instanceof Error) {
      if ('status' in error) {
        switch ((error as any).status) {
          case 401:
            return 'Authentication error. Please sign in again.';
          case 403:
            return 'You do not have permission to perform this action.';
          case 404:
            return 'The requested resource was not found.';
          case 429:
            return 'Too many requests. Please try again later.';
          case 500:
            return 'Server error. Please try again later.';
          default:
            return error.message;
        }
      }
    }
    return 'Network error. Please check your connection.';
  }

  static handleGoogleDriveError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return 'Google Drive storage quota exceeded.';
      }
      if (error.message.includes('permission')) {
        return 'Insufficient permissions to access Google Drive.';
      }
      if (error.message.includes('rate limit')) {
        return 'Too many requests to Google Drive. Please try again later.';
      }
    }
    return 'Error accessing Google Drive.';
  }
}