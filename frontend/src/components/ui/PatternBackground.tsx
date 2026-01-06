/**
 * PatternBackground Component
 *
 * Renders various pattern overlays for visual variety:
 * - Dots, Grid, Waves, Aurora, Mesh, Circuit, Hexagon
 *
 * Works with ThemeContext for dynamic pattern selection
 */

import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Defs,
  Pattern as SvgPattern,
  Rect,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useThemeContext, PatternType } from "../../context/ThemeContext";

interface PatternBackgroundProps {
  pattern?: PatternType;
  opacity?: number;
  color?: string;
  secondaryColor?: string;
  size?: "small" | "medium" | "large";
  animated?: boolean;
}

// Pattern size configurations
const PATTERN_SIZES = {
  small: { spacing: 20, size: 2 },
  medium: { spacing: 40, size: 4 },
  large: { spacing: 60, size: 6 },
};

export const PatternBackground: React.FC<PatternBackgroundProps> = ({
  pattern: patternProp,
  opacity = 0.15,
  color,
  secondaryColor,
  size = "medium",
  animated: _animated = false,
}) => {
  const { width, height } = useWindowDimensions();
  const themeContext = useThemeContext();
  const pattern = patternProp ?? themeContext.pattern;
  const primaryColor = color ?? themeContext.theme.colors.accent;
  const secondary = secondaryColor ?? themeContext.theme.colors.accentLight;

  const { spacing, size: dotSize } = PATTERN_SIZES[size];

  const patternContent = useMemo(() => {
    if (pattern === "none") return null;

    switch (pattern) {
      case "dots":
        return (
          <DotsPattern
            spacing={spacing}
            size={dotSize}
            color={primaryColor}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "grid":
        return (
          <GridPattern
            spacing={spacing}
            color={primaryColor}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "waves":
        return (
          <WavesPattern
            color={primaryColor}
            secondaryColor={secondary}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "aurora":
        return (
          <AuroraPattern
            color={primaryColor}
            secondaryColor={secondary}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "mesh":
        return (
          <MeshPattern
            spacing={spacing}
            color={primaryColor}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "circuit":
        return (
          <CircuitPattern
            spacing={spacing}
            color={primaryColor}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      case "hexagon":
        return (
          <HexagonPattern
            spacing={spacing}
            color={primaryColor}
            opacity={opacity}
            width={width}
            height={height}
          />
        );
      default:
        return null;
    }
  }, [
    pattern,
    spacing,
    dotSize,
    primaryColor,
    secondary,
    opacity,
    width,
    height,
  ]);

  if (!patternContent) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {patternContent}
    </View>
  );
};

// Dots Pattern
const DotsPattern: React.FC<{
  spacing: number;
  size: number;
  color: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ spacing, size, color, opacity, width, height }) => {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern
          id="dots"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <Circle
            cx={spacing / 2}
            cy={spacing / 2}
            r={size}
            fill={color}
            opacity={opacity}
          />
        </SvgPattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
};

// Grid Pattern
const GridPattern: React.FC<{
  spacing: number;
  color: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ spacing, color, opacity, width, height }) => {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern
          id="grid"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <Line
            x1="0"
            y1="0"
            x2={spacing}
            y2="0"
            stroke={color}
            strokeWidth="0.5"
            opacity={opacity}
          />
          <Line
            x1="0"
            y1="0"
            x2="0"
            y2={spacing}
            stroke={color}
            strokeWidth="0.5"
            opacity={opacity}
          />
        </SvgPattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
};

// Waves Pattern
const WavesPattern: React.FC<{
  color: string;
  secondaryColor: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ color, secondaryColor, opacity, width, height }) => {
  const waveHeight = 60;
  const waveCount = Math.ceil(height / waveHeight) + 2;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop
            offset="50%"
            stopColor={secondaryColor}
            stopOpacity={opacity * 0.7}
          />
          <Stop offset="100%" stopColor={color} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      {Array.from({ length: waveCount }).map((_, i) => {
        const y = i * waveHeight;
        return (
          <Path
            key={i}
            d={`M0,${y} Q${width / 4},${y - 20} ${width / 2},${y} T${width},${y}`}
            stroke="url(#waveGradient)"
            strokeWidth="2"
            fill="none"
          />
        );
      })}
    </Svg>
  );
};

// Aurora Pattern (gradient blobs)
const AuroraPattern: React.FC<{
  color: string;
  secondaryColor: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ color, secondaryColor, opacity, width, height }) => {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="aurora1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity * 0.6} />
          <Stop offset="100%" stopColor={secondaryColor} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="aurora2" x1="1" y1="0" x2="0" y2="1">
          <Stop
            offset="0%"
            stopColor={secondaryColor}
            stopOpacity={opacity * 0.5}
          />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx={width * 0.2} cy={height * 0.3} r={200} fill="url(#aurora1)" />
      <Circle cx={width * 0.8} cy={height * 0.5} r={250} fill="url(#aurora2)" />
      <Circle cx={width * 0.5} cy={height * 0.8} r={180} fill="url(#aurora1)" />
    </Svg>
  );
};

// Mesh Pattern (connected dots)
const MeshPattern: React.FC<{
  spacing: number;
  color: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ spacing, color, opacity, width, height }) => {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern
          id="mesh"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          {/* Diagonal lines */}
          <Line
            x1="0"
            y1="0"
            x2={spacing}
            y2={spacing}
            stroke={color}
            strokeWidth="0.5"
            opacity={opacity * 0.5}
          />
          <Line
            x1={spacing}
            y1="0"
            x2="0"
            y2={spacing}
            stroke={color}
            strokeWidth="0.5"
            opacity={opacity * 0.5}
          />
          {/* Dots at intersections */}
          <Circle cx="0" cy="0" r="2" fill={color} opacity={opacity} />
          <Circle cx={spacing} cy="0" r="2" fill={color} opacity={opacity} />
          <Circle cx="0" cy={spacing} r="2" fill={color} opacity={opacity} />
          <Circle
            cx={spacing}
            cy={spacing}
            r="2"
            fill={color}
            opacity={opacity}
          />
          <Circle
            cx={spacing / 2}
            cy={spacing / 2}
            r="3"
            fill={color}
            opacity={opacity * 0.8}
          />
        </SvgPattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh)" />
    </Svg>
  );
};

// Circuit Pattern
const CircuitPattern: React.FC<{
  spacing: number;
  color: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ spacing, color, opacity, width, height }) => {
  const circuitSpacing = spacing * 2;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern
          id="circuit"
          width={circuitSpacing}
          height={circuitSpacing}
          patternUnits="userSpaceOnUse"
        >
          {/* Horizontal line */}
          <Line
            x1="0"
            y1={circuitSpacing / 2}
            x2={circuitSpacing * 0.3}
            y2={circuitSpacing / 2}
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          {/* Vertical connector */}
          <Line
            x1={circuitSpacing * 0.3}
            y1={circuitSpacing / 2}
            x2={circuitSpacing * 0.3}
            y2={circuitSpacing * 0.3}
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          {/* Top horizontal */}
          <Line
            x1={circuitSpacing * 0.3}
            y1={circuitSpacing * 0.3}
            x2={circuitSpacing * 0.7}
            y2={circuitSpacing * 0.3}
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          {/* Down connector */}
          <Line
            x1={circuitSpacing * 0.7}
            y1={circuitSpacing * 0.3}
            x2={circuitSpacing * 0.7}
            y2={circuitSpacing * 0.7}
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          {/* Bottom horizontal */}
          <Line
            x1={circuitSpacing * 0.7}
            y1={circuitSpacing * 0.7}
            x2={circuitSpacing}
            y2={circuitSpacing * 0.7}
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          {/* Nodes */}
          <Circle
            cx={circuitSpacing * 0.3}
            cy={circuitSpacing * 0.3}
            r="3"
            fill={color}
            opacity={opacity}
          />
          <Circle
            cx={circuitSpacing * 0.7}
            cy={circuitSpacing * 0.7}
            r="3"
            fill={color}
            opacity={opacity}
          />
        </SvgPattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#circuit)" />
    </Svg>
  );
};

// Hexagon Pattern
const HexagonPattern: React.FC<{
  spacing: number;
  color: string;
  opacity: number;
  width: number;
  height: number;
}> = ({ spacing, color, opacity, width, height }) => {
  const hexSize = spacing * 0.8;
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);

  // Hexagon path
  const hexPath = (cx: number, cy: number, size: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(
        `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`,
      );
    }
    return `M${points.join(" L")} Z`;
  };

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern
          id="hexagon"
          width={hexWidth * 1.5}
          height={hexHeight}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d={hexPath(hexSize, hexHeight / 2, hexSize * 0.9)}
            stroke={color}
            strokeWidth="1"
            fill="none"
            opacity={opacity}
          />
          <Path
            d={hexPath(hexSize * 2.5, hexHeight / 2, hexSize * 0.9)}
            stroke={color}
            strokeWidth="1"
            fill="none"
            opacity={opacity}
          />
        </SvgPattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#hexagon)" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});

export default PatternBackground;
