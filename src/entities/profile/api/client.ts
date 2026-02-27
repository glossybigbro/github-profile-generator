import { Octokit } from '@octokit/rest';
import { GitHubError, isGitHubError } from '../model/github-dto';

import { GITHUB_API_CONFIG } from '../config/api-constants';

/**
 * Default Octokit instance (unauthenticated or env-based)
 */
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
    request: {
        timeout: GITHUB_API_CONFIG.TIMEOUT_MS,
    }
});

/**
 * Create a new Octokit instance with the given token
 * Used by the Editor frontend when the user provides their GitHub PAT
 */
export function createAuthenticatedOctokit(token: string): Octokit {
    return new Octokit({
        auth: token,
        request: {
            timeout: GITHUB_API_CONFIG.TIMEOUT_MS,
        }
    });
}

/**
 * Get the best available Octokit instance.
 * If a token is provided, creates an authenticated instance.
 * Otherwise, returns the default (unauthenticated) instance.
 */
export function getOctokit(token?: string): Octokit {
    if (token && token.trim().length > 0) {
        return createAuthenticatedOctokit(token);
    }
    return octokit;
}


/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = GITHUB_API_CONFIG.RETRY.MAX_ATTEMPTS,
    baseDelay: number = GITHUB_API_CONFIG.RETRY.BASE_DELAY_MS
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on 404 (user not found) or 403 (rate limit)
            if (isGitHubError(error) && GITHUB_API_CONFIG.RETRY.NO_RETRY_STATUSES.includes(error.status as any)) {
                throw error;
            }

            // If this was the last attempt, throw
            if (attempt === maxRetries) {
                throw error;
            }

            // Wait before retrying (exponential backoff)
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// Export for use in Entities
export { octokit };
