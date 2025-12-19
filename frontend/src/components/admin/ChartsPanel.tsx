import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ModernCard } from "../ModernCard";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../../styles/modernDesignSystem";
import { SimpleLineChart as LineChart } from "../charts/SimpleLineChart";
import { SimpleBarChart as BarChart } from "../charts/SimpleBarChart";
import { SimplePieChart as PieChart } from "../charts/SimplePieChart";

interface ChartsPanelProps {
  sessionChartData?: any[];
  statusChartData?: any[];
  userActivityData?: any[];
  varianceTrendData?: any[];
  staffPerformanceData?: any[];
}

const ChartsPanel: React.FC<ChartsPanelProps> = ({
  sessionChartData = [],
  statusChartData = [],
  userActivityData = [],
  varianceTrendData = [],
  staffPerformanceData = [],
}) => {
  return (
    <View>
      <ModernCard
        variant="elevated"
        title="Sessions Over Time"
        icon="trending-up"
      >
        {sessionChartData.length > 0 ? (
          <LineChart
            data={sessionChartData}
            color={modernColors.primary[500]}
            showGrid
            showPoints
            title="Daily Session Count"
            yAxisLabel="Sessions"
            xAxisLabel="Date"
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No session data available</Text>
          </View>
        )}
      </ModernCard>

      <View style={styles.row}>
        <ModernCard
          variant="elevated"
          title="Session Status Distribution"
          icon="pie-chart"
          style={styles.chartCard}
        >
          {statusChartData.length > 0 ? (
            <PieChart data={statusChartData} showLegend />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No status data available</Text>
            </View>
          )}
        </ModernCard>

        <ModernCard
          variant="elevated"
          title="Top Users by Activity"
          icon="people"
          style={styles.chartCard}
        >
          {userActivityData.length > 0 ? (
            <BarChart data={userActivityData} showValues />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No user activity data</Text>
            </View>
          )}
        </ModernCard>
      </View>

      <View style={styles.row}>
        <ModernCard
          variant="elevated"
          title="Variance Trend"
          icon="trending-up"
          style={styles.chartCard}
        >
          {varianceTrendData.length > 0 ? (
            <LineChart
              data={varianceTrendData}
              color={modernColors.error.main}
              showGrid
              showPoints
              title="Daily Variance Count"
              yAxisLabel="Variances"
              xAxisLabel="Date"
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No variance data available</Text>
            </View>
          )}
        </ModernCard>

        <ModernCard
          variant="elevated"
          title="Staff Performance"
          icon="people"
          style={styles.chartCard}
        >
          {staffPerformanceData.length > 0 ? (
            <BarChart
              data={staffPerformanceData}
              showValues
              title="Sessions per Staff"
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No staff performance data</Text>
            </View>
          )}
        </ModernCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: modernSpacing.md,
  },
  chartCard: {
    flex: 1,
  },
  empty: {
    padding: modernSpacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
});

export default ChartsPanel;
