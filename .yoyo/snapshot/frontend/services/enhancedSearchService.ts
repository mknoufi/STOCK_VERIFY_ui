/**
 * Enhanced Search Service
 * Improved search with partial matching, autocomplete, and smart suggestions
 */

import api from './api';
import { searchItemsInCache } from './offlineStorage';
import { isOnline } from './api';

export interface SearchResult {
  item_code: string;
  item_name: string;
  barcode: string;
  stock_qty: number;
  mrp: number;
  category: string;
  warehouse: string;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  floor?: string;
  rack?: string;
  subcategory?: string;
  uom_name?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  minChars?: number;
  searchFields?: ('name' | 'code' | 'barcode' | 'category')[];
}

/**
 * Enhanced Search Service
 */
export class EnhancedSearchService {
  private static readonly MIN_CHARS = 4;
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 50;

  /**
   * Smart search with partial matching anywhere in name
   */
  static async searchItems(options: SearchOptions): Promise<SearchResult[]> {
    const {
      query,
      limit = this.DEFAULT_LIMIT,
      minChars = this.MIN_CHARS,
      searchFields = ['name', 'code', 'barcode', 'category'],
    } = options;

    const trimmedQuery = query.trim();

    // Don't search if query is too short
    if (trimmedQuery.length < minChars) {
      return [];
    }

    // If it's a complete barcode (numeric, 6+ digits), do direct lookup
    if (/^\d{6,}$/.test(trimmedQuery)) {
      try {
        if (isOnline()) {
          const response = await api.get(`/erp/items/barcode/${encodeURIComponent(trimmedQuery)}`);
          if (response.data) {
            return [{
              ...response.data,
              score: 100,
              matchType: 'exact' as const,
            }];
          }
        }
      } catch (error) {
        // Continue to fuzzy search if barcode lookup fails
      }
    }

    try {
      // Try backend search first if online
      if (isOnline()) {
        const response = await api.get(`/erp/items/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`);
        if (response.data && response.data.length > 0) {
          return response.data.map((item: any, index: number) => ({
            ...item,
            score: 100 - index, // First results have higher score
            matchType: 'partial' as const,
          }));
        }
      }
    } catch (error) {
      console.error('Backend search error:', error);
    }

    // Fallback to cache search
    try {
      const cachedItems = await searchItemsInCache(trimmedQuery);
      if (cachedItems.length > 0) {
        return cachedItems.slice(0, limit).map((item: any, index: number) => ({
          ...item,
          score: 90 - index,
          matchType: 'partial' as const,
        }));
      }
    } catch (error) {
      console.error('Cache search error:', error);
    }

    return [];
  }

  /**
   * Search with enhanced scoring
   */
  static searchWithScoring(items: any[], query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery || lowerQuery.length < this.MIN_CHARS) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const item of items) {
      const scores = {
        name: this.calculateScore(item.item_name || '', lowerQuery),
        code: this.calculateScore(item.item_code || '', lowerQuery),
        barcode: this.calculateScore(item.barcode || '', lowerQuery),
        category: this.calculateScore(item.category || '', lowerQuery),
      };

      const maxScore = Math.max(scores.name, scores.code, scores.barcode, scores.category);
      const matchType = maxScore >= 100 ? 'exact' : maxScore >= 50 ? 'partial' : 'fuzzy';

      if (maxScore > 0) {
        results.push({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          barcode: item.barcode || '',
          stock_qty: item.stock_qty || 0,
          mrp: item.mrp || 0,
          category: item.category || 'General',
          warehouse: item.warehouse || 'Main',
          score: maxScore,
          matchType,
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Limit results
    return results.slice(0, this.DEFAULT_LIMIT);
  }

  /**
   * Calculate match score with smart partial matching
   */
  private static calculateScore(text: string, query: string): number {
    if (!text) return 0;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match
    if (lowerText === lowerQuery) return 100;

    // Starts with query
    if (lowerText.startsWith(lowerQuery)) return 80;

    // Contains query anywhere (partial match)
    if (lowerText.includes(lowerQuery)) return 60;

    // Word boundary match (matches at word start)
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerQuery)) return 70;
      if (word.includes(lowerQuery)) return 50;
    }

    // Fuzzy match - all query characters appear in order
    if (this.fuzzyMatch(lowerText, lowerQuery)) {
      return 40;
    }

    // Character count match (for very short queries)
    if (lowerQuery.length <= 3) {
      let matches = 0;
      for (const char of lowerQuery) {
        if (lowerText.includes(char)) matches++;
      }
      if (matches === lowerQuery.length) return 30;
    }

    return 0;
  }

  /**
   * Fuzzy match - checks if all query characters appear in order
   */
  private static fuzzyMatch(text: string, query: string): boolean {
    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }

    return queryIndex === query.length;
  }

  /**
   * Highlight matched text
   */
  static highlightMatch(text: string, query: string): string {
    if (!query || !text) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '**$1**'); // Use ** for marking, UI will handle styling
  }

  /**
   * Get search suggestions (for autocomplete)
   */
  static async getSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < this.MIN_CHARS) {
      return [];
    }

    try {
      const results = await this.searchItems({ query, limit });
      return results.map(result => result.item_name).slice(0, limit);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
}
