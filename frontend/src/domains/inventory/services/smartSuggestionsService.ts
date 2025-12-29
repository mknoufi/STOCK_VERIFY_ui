import { AnalyticsService, RecentItemsService } from "@/services/enhancedFeatures";

export interface SuggestionItem {
  id: string;
  type: "quantity" | "location" | "reason" | "action" | "photo" | "workflow";
  title: string;
  subtitle?: string;
  icon: string;
  confidence: number;
  data: any;
  action?: () => void;
}

export interface SuggestionContext {
  sessionId?: string;
  itemCode?: string;
  scannedItem?: any;
  quantity?: number;
  floorNo?: string;
  rackNo?: string;
  lastAction?: string;
  timeSpent?: number;
  recentActivity?: string[];
}

export class SmartSuggestionsService {
  private static instance: SmartSuggestionsService;
  private suggestionHistory: Map<string, SuggestionItem[]> = new Map();
  private userPatterns: Map<string, any> = new Map();

  static getInstance(): SmartSuggestionsService {
    if (!SmartSuggestionsService.instance) {
      SmartSuggestionsService.instance = new SmartSuggestionsService();
    }
    return SmartSuggestionsService.instance;
  }

  // Get contextual suggestions based on current state
  async getSuggestions(context: SuggestionContext): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    try {
      // Quantity suggestions
      const quantitySuggestions = await this.getQuantitySuggestions(context);
      suggestions.push(...quantitySuggestions);

      // Location suggestions
      const locationSuggestions = await this.getLocationSuggestions(context);
      suggestions.push(...locationSuggestions);

      // Variance reason suggestions
      const reasonSuggestions = await this.getReasonSuggestions(context);
      suggestions.push(...reasonSuggestions);

      // Quick action suggestions
      const actionSuggestions = await this.getActionSuggestions(context);
      suggestions.push(...actionSuggestions);

      // Photo suggestions
      const photoSuggestions = await this.getPhotoSuggestions(context);
      suggestions.push(...photoSuggestions);

      // Workflow suggestions
      const workflowSuggestions = await this.getWorkflowSuggestions(context);
      suggestions.push(...workflowSuggestions);

      // Sort by confidence and return top suggestions
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6); // Limit to top 6 suggestions
    } catch (error) {
      console.error("Error getting suggestions:", error);
      return [];
    }
  }

  // Quantity suggestions based on historical data
  private async getQuantitySuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    if (context.itemCode && context.scannedItem) {
      try {
        // Get historical data for this item
        const recentItems = await RecentItemsService.getRecentItems(
          context.itemCode,
        );
        const avgQuantity = this.calculateAverageQuantity(recentItems);

        if (avgQuantity && avgQuantity > 0) {
          suggestions.push({
            id: `quantity-avg-${context.itemCode}`,
            type: "quantity",
            title: `Usually count ${avgQuantity}`,
            subtitle: "Based on your history",
            icon: "trending-up",
            confidence: 0.8,
            data: { suggestedQuantity: avgQuantity },
            action: () => console.log(`Suggested quantity: ${avgQuantity}`),
          });
        }

        // Smart bulk suggestions
        if (context.scannedItem.category === "Electronics") {
          suggestions.push({
            id: "quantity-bulk-electronics",
            type: "quantity",
            title: "Electronics bulk count",
            subtitle: "Scan 5-10 units efficiently",
            icon: "cube-outline",
            confidence: 0.7,
            data: { suggestedQuantities: [1, 5, 10] },
            action: () => console.log("Electronics bulk count suggested"),
          });
        }

        // Stock-based suggestion
        const systemStock =
          context.scannedItem.stock_qty || context.scannedItem.current_stock;
        if (systemStock && systemStock > 0) {
          suggestions.push({
            id: "quantity-system-stock",
            type: "quantity",
            title: `System shows ${systemStock}`,
            subtitle: "Verify against physical count",
            icon: "server-outline",
            confidence: 0.6,
            data: { systemStock },
            action: () => console.log(`System stock: ${systemStock}`),
          });
        }
      } catch (error) {
        console.warn("Error getting quantity suggestions:", error);
      }
    }

    return suggestions;
  }

  // Location suggestions based on recent activity
  private async getLocationSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    if (context.sessionId) {
      try {
        // Get recent locations from analytics
        const recentActivity = await AnalyticsService.getRecentActivity(
          context.sessionId,
        );
        const commonLocations = this.extractCommonLocations(recentActivity);

        commonLocations.forEach((location, index) => {
          suggestions.push({
            id: `location-recent-${index}`,
            type: "location",
            title: `${location.floor} - ${location.rack}`,
            subtitle: `Visited ${location.count} times`,
            icon: "location-outline",
            confidence: Math.max(0.5, 0.9 - index * 0.2),
            data: location,
            action: () =>
              console.log(`Navigate to: ${location.floor} - ${location.rack}`),
          });
        });

        // Nearest rack suggestions
        if (context.floorNo) {
          suggestions.push({
            id: "location-adjacent-racks",
            type: "location",
            title: "Check adjacent racks",
            subtitle: "Often items are stored nearby",
            icon: "navigate-outline",
            confidence: 0.7,
            data: { floorNo: context.floorNo },
            action: () => console.log("Suggest adjacent racks"),
          });
        }
      } catch (error) {
        console.warn("Error getting location suggestions:", error);
      }
    }

    return suggestions;
  }

  // Variance reason suggestions
  private async getReasonSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    if (context.scannedItem && context.quantity) {
      const systemStock =
        context.scannedItem.stock_qty || context.scannedItem.current_stock;

      if (
        systemStock &&
        Math.abs(context.quantity - systemStock) > systemStock * 0.1
      ) {
        // High variance detected
        const commonReasons = [
          { code: "damaged", label: "Damaged Items", confidence: 0.8 },
          { code: "lost", label: "Lost/Missing", confidence: 0.7 },
          {
            code: "new_stock",
            label: "New Stock Not Updated",
            confidence: 0.6,
          },
          { code: "theft", label: "Theft/Security Issue", confidence: 0.5 },
        ];

        commonReasons.forEach((reason) => {
          suggestions.push({
            id: `reason-${reason.code}`,
            type: "reason",
            title: reason.label,
            subtitle: "Common for this variance",
            icon: "warning-outline",
            confidence: reason.confidence,
            data: reason,
            action: () => console.log(`Select reason: ${reason.code}`),
          });
        });
      }
    }

    return suggestions;
  }

  // Quick action suggestions
  private async getActionSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    // Time-based suggestions
    if (context.timeSpent && context.timeSpent > 300) {
      // 5 minutes
      suggestions.push({
        id: "action-bulk-mode",
        type: "action",
        title: "Switch to Bulk Mode",
        subtitle: "Speed up your counting",
        icon: "albums-outline",
        confidence: 0.8,
        data: {},
        action: () => console.log("Switch to bulk mode"),
      });
    }

    // Photo suggestions
    if (context.scannedItem && context.scannedItem.mrp > 1000) {
      suggestions.push({
        id: "action-photo-required",
        type: "photo",
        title: "Add Photo Required",
        subtitle: "High-value items need verification",
        icon: "camera-outline",
        confidence: 0.9,
        data: {},
        action: () => console.log("Open camera for photo"),
      });
    }

    // Serial number suggestions
    if (context.scannedItem && context.scannedItem.category === "Electronics") {
      suggestions.push({
        id: "action-serial-scan",
        type: "action",
        title: "Enable Serial Tracking",
        subtitle: "Required for electronics",
        icon: "qr-code-outline",
        confidence: 0.7,
        data: {},
        action: () => console.log("Enable serial tracking"),
      });
    }

    return suggestions;
  }

  // Photo suggestions
  private async getPhotoSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    if (context.scannedItem) {
      // Auto-photo suggestions based on item value
      if (context.scannedItem.mrp > 500) {
        suggestions.push({
          id: "photo-item-verification",
          type: "photo",
          title: "Item Verification Photo",
          subtitle: "For high-value items",
          icon: "shield-checkmark-outline",
          confidence: 0.8,
          data: { photoType: "verification" },
          action: () => console.log("Take verification photo"),
        });
      }

      // Serial photo for electronics
      if (context.scannedItem.category === "Electronics") {
        suggestions.push({
          id: "photo-serial-number",
          type: "photo",
          title: "Capture Serial Number",
          subtitle: "Important for warranty",
          icon: "barcode-outline",
          confidence: 0.7,
          data: { photoType: "serial" },
          action: () => console.log("Capture serial photo"),
        });
      }

      // Condition photo for damaged items
      if (
        context.quantity &&
        context.scannedItem.stock_qty &&
        context.quantity < context.scannedItem.stock_qty
      ) {
        suggestions.push({
          id: "photo-condition",
          type: "photo",
          title: "Document Condition",
          subtitle: "Show why count differs",
          icon: "document-text-outline",
          confidence: 0.6,
          data: { photoType: "condition" },
          action: () => console.log("Take condition photo"),
        });
      }
    }

    return suggestions;
  }

  // Workflow suggestions
  private async getWorkflowSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    // Session-based workflow suggestions
    if (context.recentActivity && context.recentActivity.length > 10) {
      suggestions.push({
        id: "workflow-complete-session",
        type: "workflow",
        title: "Complete Session",
        subtitle: "You've counted many items",
        icon: "checkmark-circle-outline",
        confidence: 0.8,
        data: {},
        action: () => console.log("Suggest session completion"),
      });
    }

    // Break suggestion
    if (context.timeSpent && context.timeSpent > 1800) {
      // 30 minutes
      suggestions.push({
        id: "workflow-take-break",
        type: "workflow",
        title: "Take a Break",
        subtitle: "30+ minutes of counting",
        icon: "cafe-outline",
        confidence: 0.9,
        data: {},
        action: () => console.log("Suggest break"),
      });
    }

    // Quality check suggestion
    if (context.quantity && context.scannedItem) {
      const systemStock = context.scannedItem.stock_qty;
      if (
        systemStock &&
        Math.abs(context.quantity - systemStock) > systemStock * 0.2
      ) {
        suggestions.push({
          id: "workflow-quality-check",
          type: "workflow",
          title: "Quality Check Recommended",
          subtitle: "Large variance detected",
          icon: "clipboard-outline",
          confidence: 0.8,
          data: {},
          action: () => console.log("Suggest quality check"),
        });
      }
    }

    return suggestions;
  }

  // Helper methods
  private calculateAverageQuantity(recentItems: any[]): number {
    if (!recentItems || recentItems.length === 0) return 0;

    const quantities = recentItems
      .map((item) => item.counted_qty)
      .filter((qty) => qty && qty > 0);

    if (quantities.length === 0) return 0;

    const sum = quantities.reduce((a, b) => a + b, 0);
    return Math.round(sum / quantities.length);
  }

  private extractCommonLocations(
    activity: any[],
  ): { floor: string; rack: string; count: number }[] {
    const locationCounts = new Map<string, number>();

    activity.forEach((item) => {
      if (item.floor_no && item.rack_no) {
        const key = `${item.floor_no}-${item.rack_no}`;
        locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
      }
    });

    return Array.from(locationCounts.entries())
      .map(([key, count]) => {
        const parts = key.split("-");
        const floor = parts[0] || "";
        const rack = parts.slice(1).join("-") || "";
        return { floor, rack, count };
      })
      .filter((loc) => loc.floor && loc.rack)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  // Track user interactions to improve suggestions
  async trackSuggestionInteraction(
    suggestionId: string,
    action: "viewed" | "clicked" | "dismissed",
  ): Promise<void> {
    try {
      await AnalyticsService.trackEvent("suggestion_interaction", {
        suggestion_id: suggestionId,
        action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("Error tracking suggestion interaction:", error);
    }
  }

  // Update user patterns based on actions
  async updateUserPattern(pattern: string, value: any): Promise<void> {
    const patterns = this.userPatterns.get(pattern) || [];
    patterns.push({ value, timestamp: Date.now() });
    this.userPatterns.set(pattern, patterns);
  }

  // Get personalized suggestions based on user patterns
  async getPersonalizedSuggestions(
    context: SuggestionContext,
  ): Promise<SuggestionItem[]> {
    const suggestions = await this.getSuggestions(context);

    // Apply user pattern weighting
    return suggestions.map((suggestion) => {
      const pattern = this.userPatterns.get(suggestion.type);
      if (pattern) {
        const recentActions = pattern.filter(
          (p: { value: any; timestamp: number }) =>
            Date.now() - p.timestamp < 7 * 24 * 60 * 60 * 1000, // Last 7 days
        );
        if (recentActions.length > 0) {
          suggestion.confidence = Math.min(1.0, suggestion.confidence + 0.1);
        }
      }
      return suggestion;
    });
  }
}

export const smartSuggestionsService = SmartSuggestionsService.getInstance();
