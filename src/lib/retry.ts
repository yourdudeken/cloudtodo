export class RetryStrategy {
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_DELAY = 1000; // 1 second

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES,
    initialDelay: number = this.INITIAL_DELAY
  ): Promise<T> {
    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw lastError!;
  }
}