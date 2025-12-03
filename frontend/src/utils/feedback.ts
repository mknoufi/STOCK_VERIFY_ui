/**
 * Feedback Utility Functions
 * Provides reusable feedback mechanisms for user interactions
 */

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackOptions {
    duration?: number;
    type?: FeedbackType;
}

/**
 * Show temporary feedback message
 * @param message - Message to display
 * @param updateFn - State update function
 * @param options - Feedback options (duration, type)
 * @returns Cleanup function
 */
export const showFeedback = (
    message: string,
    updateFn: (feedback: string) => void,
    options: FeedbackOptions = {}
): (() => void) => {
    const { duration = 2000 } = options;

    updateFn(message);

    const timer = setTimeout(() => {
        updateFn('');
    }, duration);

    // Return cleanup function
    return () => clearTimeout(timer);
};

/**
 * Create a feedback manager hook
 * @param updateFn - State update function
 */
export const createFeedbackManager = (updateFn: (feedback: string) => void) => {
    let currentTimer: ReturnType<typeof setTimeout> | null = null;

    return {
        show: (message: string, duration = 2000) => {
            // Clear existing timer
            if (currentTimer) {
                clearTimeout(currentTimer);
            }

            updateFn(message);

            currentTimer = setTimeout(() => {
                updateFn('');
                currentTimer = null;
            }, duration);
        },

        clear: () => {
            if (currentTimer) {
                clearTimeout(currentTimer);
                currentTimer = null;
            }
            updateFn('');
        },

        cleanup: () => {
            if (currentTimer) {
                clearTimeout(currentTimer);
            }
        }
    };
};

/**
 * Format feedback message with emoji
 */
export const formatFeedback = (message: string, type: FeedbackType): string => {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    return `${icons[type]} ${message}`;
};
