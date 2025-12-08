/**
 * Export Service
 * Handles data export to CSV, Excel, and JSON formats
 */

import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

export interface ExportOptions {
  filename?: string;
  headers?: string[];
  format?: "csv" | "json" | "txt";
}

export class ExportService {
  /**
   * Export data to CSV format
   */
  static async exportToCSV(
    data: any[],
    options: ExportOptions = {},
  ): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      const filename = options.filename || `export_${Date.now()}.csv`;
      const headers = options.headers || Object.keys(data[0]);

      // Generate CSV content
      let csvContent = headers.join(",") + "\n";

      data.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (value === null || value === undefined) {
            return "";
          }
          const stringValue = String(value).replace(/"/g, '""');
          if (
            stringValue.includes(",") ||
            stringValue.includes("\n") ||
            stringValue.includes('"')
          ) {
            return `"${stringValue}"`;
          }
          return stringValue;
        });
        csvContent += values.join(",") + "\n";
      });

      await this.saveAndShareFile(csvContent, filename, "text/csv");
    } catch (error: any) {
      __DEV__ && console.error("CSV export error:", error);
      Alert.alert("Export Error", error.message || "Failed to export CSV");
      throw error;
    }
  }

  /**
   * Export data to JSON format
   */
  static async exportToJSON(
    data: any[],
    options: ExportOptions = {},
  ): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      const filename = options.filename || `export_${Date.now()}.json`;
      const jsonContent = JSON.stringify(data, null, 2);

      await this.saveAndShareFile(jsonContent, filename, "application/json");
    } catch (error: any) {
      __DEV__ && console.error("JSON export error:", error);
      Alert.alert("Export Error", error.message || "Failed to export JSON");
      throw error;
    }
  }

  /**
   * Export data to text format
   */
  static async exportToText(
    data: any[],
    options: ExportOptions = {},
  ): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      const filename = options.filename || `export_${Date.now()}.txt`;
      const headers = options.headers || Object.keys(data[0]);

      let textContent = headers.join("\t") + "\n";

      data.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          return value === null || value === undefined ? "" : String(value);
        });
        textContent += values.join("\t") + "\n";
      });

      await this.saveAndShareFile(textContent, filename, "text/plain");
    } catch (error: any) {
      __DEV__ && console.error("Text export error:", error);
      Alert.alert("Export Error", error.message || "Failed to export text");
      throw error;
    }
  }

  /**
   * Export sessions to CSV
   */
  static async exportSessions(sessions: any[]): Promise<void> {
    const headers = [
      "id",
      "warehouse",
      "staff_user",
      "staff_name",
      "status",
      "started_at",
      "closed_at",
      "total_items",
      "total_variance",
    ];
    await this.exportToCSV(sessions, {
      filename: `sessions_${Date.now()}.csv`,
      headers,
    });
  }

  /**
   * Export sessions with detailed count lines
   */
  static async exportSessionsWithDetails(sessions: any[]): Promise<void> {
    try {
      __DEV__ && console.log("📊 [Export] Exporting sessions with details...");

      // Transform sessions into detailed rows
      const detailedData: any[] = [];

      sessions.forEach((session: any) => {
        detailedData.push({
          session_id: session.id,
          warehouse: session.warehouse,
          staff_name: session.staff_name,
          status: session.status,
          started_at: session.started_at,
          closed_at: session.closed_at,
          total_items: session.total_items || 0,
          total_variance: session.total_variance || 0,
          counted_items: session.counted_items || 0,
          pending_items: session.pending_items || 0,
        });
      });

      const headers = [
        "session_id",
        "warehouse",
        "staff_name",
        "status",
        "started_at",
        "closed_at",
        "total_items",
        "total_variance",
        "counted_items",
        "pending_items",
      ];

      await this.exportToCSV(detailedData, {
        filename: `session_details_${Date.now()}.csv`,
        headers,
      });

      __DEV__ &&
        console.log("✅ [Export] Sessions with details exported successfully");
    } catch (error: any) {
      __DEV__ &&
        console.error(
          "❌ [Export] Failed to export sessions with details:",
          error,
        );
      throw error;
    }
  }

  /**
   * Export variance report
   */
  static async exportVarianceReport(sessions: any[]): Promise<void> {
    try {
      __DEV__ && console.log("📊 [Export] Exporting variance report...");

      const varianceData = sessions.map((session: any) => ({
        session_id: session.id,
        warehouse: session.warehouse,
        staff_name: session.staff_name,
        status: session.status,
        started_at: session.started_at,
        total_items: session.total_items || 0,
        counted_items: session.counted_items || 0,
        total_variance: session.total_variance || 0,
        variance_percentage:
          session.total_items > 0
            ? (
                (Math.abs(session.total_variance || 0) / session.total_items) *
                100
              ).toFixed(2)
            : "0",
      }));

      const headers = [
        "session_id",
        "warehouse",
        "staff_name",
        "status",
        "started_at",
        "total_items",
        "counted_items",
        "total_variance",
        "variance_percentage",
      ];

      await this.exportToCSV(varianceData, {
        filename: `variance_report_${Date.now()}.csv`,
        headers,
      });

      __DEV__ &&
        console.log("✅ [Export] Variance report exported successfully");
    } catch (error: any) {
      __DEV__ &&
        console.error("❌ [Export] Failed to export variance report:", error);
      throw error;
    }
  }

  /**
   * Export summary report
   */
  static async exportSummaryReport(sessions: any[]): Promise<void> {
    try {
      __DEV__ && console.log("📊 [Export] Exporting summary report...");

      // Calculate summary statistics
      const totalSessions = sessions.length;
      const openSessions = sessions.filter(
        (s: any) => s.status === "OPEN",
      ).length;
      const closedSessions = sessions.filter(
        (s: any) => s.status === "CLOSED",
      ).length;
      const reconciledSessions = sessions.filter(
        (s: any) => s.status === "RECONCILE",
      ).length;
      const totalItems = sessions.reduce(
        (sum: number, s: any) => sum + (s.total_items || 0),
        0,
      );
      const totalVariance = sessions.reduce(
        (sum: number, s: any) => sum + Math.abs(s.total_variance || 0),
        0,
      );

      const summaryData = [
        { metric: "Total Sessions", value: totalSessions },
        { metric: "Open Sessions", value: openSessions },
        { metric: "Closed Sessions", value: closedSessions },
        { metric: "Reconciled Sessions", value: reconciledSessions },
        { metric: "Total Items Counted", value: totalItems },
        { metric: "Total Variance", value: totalVariance.toFixed(2) },
        {
          metric: "Average Variance per Session",
          value: (totalVariance / totalSessions || 0).toFixed(2),
        },
      ];

      await this.exportToCSV(summaryData, {
        filename: `summary_report_${Date.now()}.csv`,
        headers: ["metric", "value"],
      });

      __DEV__ &&
        console.log("✅ [Export] Summary report exported successfully");
    } catch (error: any) {
      __DEV__ &&
        console.error("❌ [Export] Failed to export summary report:", error);
      throw error;
    }
  }

  /**
   * Export count lines to CSV
   */
  static async exportCountLines(countLines: any[]): Promise<void> {
    const headers = [
      "id",
      "session_id",
      "item_code",
      "item_name",
      "barcode",
      "erp_qty",
      "counted_qty",
      "variance",
      "variance_reason",
      "variance_note",
      "remark",
      "counted_by",
      "counted_at",
      "status",
      "approved_by",
      "approved_at",
    ];
    await this.exportToCSV(countLines, {
      filename: `count_lines_${Date.now()}.csv`,
      headers,
    });
  }

  /**
   * Export items to CSV
   */
  static async exportItems(items: any[]): Promise<void> {
    const headers = [
      "item_code",
      "item_name",
      "barcode",
      "stock_qty",
      "mrp",
      "category",
      "warehouse",
      "uom_code",
      "uom_name",
    ];
    await this.exportToCSV(items, {
      filename: `items_${Date.now()}.csv`,
      headers,
    });
  }

  /**
   * Save file and share it
   */
  private static async saveAndShareFile(
    content: string,
    filename: string,
    mimeType: string,
  ): Promise<void> {
    try {
      // Use new expo-file-system v19 API
      const file = new File(Paths.cache, filename);

      // Write file
      await file.write(content);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType,
          dialogTitle: `Share ${filename}`,
        });
      } else {
        // Fallback: show alert with file location
        Alert.alert("Export Complete", `File saved to: ${file.uri}`, [
          { text: "OK" },
        ]);
      }
    } catch (error: any) {
      __DEV__ && console.error("File save/share error:", error);
      throw new Error(`Failed to save or share file: ${error.message}`);
    }
  }
}
