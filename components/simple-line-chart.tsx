import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  x: number;
  y: number;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  color: string;
  label: string;
}

export function SimpleLineChart({ data, width, height, color, label }: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minY = Math.min(...data.map(d => d.y));
  const maxY = Math.max(...data.map(d => d.y));
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));

  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  const getX = (dataX: number) => padding + ((dataX - minX) / xRange) * chartWidth;
  const getY = (dataY: number) => padding + chartHeight - ((dataY - minY) / yRange) * chartHeight;

  const pathData = data.map((point, index) => {
    const x = getX(point.x);
    const y = getY(point.y);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => 
    minY + (yRange * i) / (yTicks - 1)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Svg width={width} height={height}>
        {yTickValues.map((value, index) => {
          const y = getY(value);
          return (
            <React.Fragment key={index}>
              <Line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <SvgText
                x={padding - 10}
                y={y + 4}
                fontSize="10"
                fill="#64748b"
                textAnchor="end"
              >
                {value.toFixed(1)}
              </SvgText>
            </React.Fragment>
          );
        })}
        
        <Path
          d={pathData}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {data.map((point, index) => (
          <Circle
            key={index}
            cx={getX(point.x)}
            cy={getY(point.y)}
            r={3}
            fill={color}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});