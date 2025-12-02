/**
 * Search Utility Functions
 * Provides fuzzy search and filtering capabilities
 */

/**
 * Simple fuzzy match scoring
 * @param pattern - Search pattern
 * @param str - String to search in
 * @returns Match score (0-100)
 */
export const fuzzyMatch = (pattern: string, str: string): number => {
    if (!pattern || !str) return 0;

    const patternLower = pattern.toLowerCase();
    const strLower = str.toLowerCase();

    // Exact match
    if (strLower === patternLower) return 100;

    // Contains match
    if (strLower.includes(patternLower)) return 80;

    // Character sequence match
    let patternIdx = 0;
    let score = 0;

    for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
        if (strLower[i] === patternLower[patternIdx]) {
            score += 1;
            patternIdx++;
        }
    }

    return patternIdx === patternLower.length
        ? (score / pattern.length) * 50
        : 0;
};

interface SearchableItem {
    item_name?: string;
    item_code?: string;
    barcode?: string;
    category?: string;
    [key: string]: any;
}

interface SearchResult<T> {
    item: T;
    score: number;
}

/**
 * Perform fuzzy search on items array
 * @param query - Search query string
 * @param items - Array of items to search
 * @param options - Search options
 * @returns Top matching items sorted by relevance
 */
export const performFuzzySearch = <T extends SearchableItem>(
    query: string,
    items: T[],
    options: {
        maxResults?: number;
        minScore?: number;
        fields?: (keyof T)[];
    } = {}
): T[] => {
    const {
        maxResults = 10,
        minScore = 30,
        fields = ['item_name', 'item_code', 'barcode', 'category']
    } = options;

    if (!query || !items || items.length === 0) {
        return [];
    }

    const results: SearchResult<T>[] = items
        .map(item => {
            // Calculate scores for each field
            const scores = fields.map(field =>
                fuzzyMatch(query, String(item[field] || ''))
            );

            // Use maximum score across all fields
            const maxScore = Math.max(...scores);

            return { item, score: maxScore };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    return results.map(result => result.item);
};

/**
 * Highlight matching text in search results
 * @param text - Original text
 * @param query - Search query
 * @returns Text with highlighted matches
 */
export const highlightMatches = (text: string, query: string): string => {
    if (!query || !text) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
};

/**
 * Advanced multi-field search with filters
 */
export interface SearchFilters {
    barcode?: string;
    category?: string;
    priceRange?: [number, number];
    inStock?: boolean;
}

export const advancedSearch = <T extends SearchableItem>(
    items: T[],
    query: string,
    filters: SearchFilters = {}
): T[] => {
    // First apply filters
    let filtered = items;

    if (filters.barcode) {
        filtered = filtered.filter(item =>
            item.barcode?.includes(filters.barcode!)
        );
    }

    if (filters.category) {
        filtered = filtered.filter(item =>
            item.category === filters.category
        );
    }

    if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        filtered = filtered.filter(item => {
            const price = Number(item.mrp || 0);
            return price >= min && price <= max;
        });
    }

    if (filters.inStock !== undefined) {
        filtered = filtered.filter(item => {
            const stock = Number(item.stock_qty || 0);
            return filters.inStock ? stock > 0 : stock === 0;
        });
    }

    // Then apply fuzzy search if query provided
    if (query) {
        return performFuzzySearch(query, filtered);
    }

    return filtered;
};

/**
 * Extract number from text (useful for voice input)
 */
export const extractNumber = (text: string): string => {
    const match = text.match(/\d+\.?\d*/);
    return match ? match[0] : '';
};
