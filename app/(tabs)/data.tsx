import { SimpleLineChart } from '@/components/simple-line-chart';
import { StatsCard } from '@/components/stats-card';
import { useSensor } from '@/providers/sensor-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Thermometer, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



export default function DataScreen() {
  const { sessionData, currentSession } = useSensor();
  const [selectedTab, setSelectedTab] = useState<'temperature' | 'accelerometer'>('temperature');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const temperatureData = sessionData.map((point, index) => ({
    x: index,
    y: point.temperature,
  }));

  const accelerometerData = sessionData.map((point, index) => ({
    x: index,
    y: point.accelerometer,
  }));

  const stats = React.useMemo(() => {
    if (sessionData.length === 0) return null;

    const temperatures = sessionData.map(d => d.temperature);
    const accelerations = sessionData.map(d => d.accelerometer);

    return {
      avgTemp: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      maxTemp: Math.max(...temperatures),
      minTemp: Math.min(...temperatures),
      
      duration: sessionData.length > 0 ? 
        (sessionData[sessionData.length - 1].timestamp - sessionData[0].timestamp) / 1000 / 60 : 0,
    };
  }, [sessionData]);
    
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Data Analysis</Text>
            <Text style={styles.subtitle}>
              {currentSession ? 'Current Session' : 'No Active Session'}
            </Text>
          </View>

          {stats && (
            <View style={styles.statsGrid}>
              <StatsCard
                icon={<Thermometer size={20} color="#f97316" />}
                title="Avg Temperature"
                value={`${stats.avgTemp.toFixed(1)}°C`}
                subtitle={`Range: ${stats.minTemp.toFixed(1)}°C - ${stats.maxTemp.toFixed(1)}°C`}
              />
             {/* <StatsCard
                icon={<Activity size={20} color="#8b5cf6" />}
                title="Max Acceleration"
                value={stats.maxAccel.toFixed(2)}
                subtitle={`Avg: ${stats.avgAccel.toFixed(2)}`}
          />*/}
              <StatsCard
                icon={<TrendingUp size={20} color="#10b981" />}
                title="Session Duration"
                value={`${stats.duration.toFixed(1)} min`}
                subtitle={`${sessionData.length} data points`}
              />
            </View>
          )}

          {sessionData.length > 0 && (
            <View style={styles.chartSection}>
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    selectedTab === 'temperature' && styles.tabActive
                  ]}
                  onPress={() => setSelectedTab('temperature')}
                  testID="temperature-tab"
                >
                  <Thermometer size={16} color={selectedTab === 'temperature' ? '#ffffff' : '#64748b'} />
                  <Text style={[
                    styles.tabText,
                    selectedTab === 'temperature' && styles.tabTextActive
                  ]}>
                    Temperature
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tab,
                    selectedTab === 'accelerometer' && styles.tabActive
                  ]}
                  onPress={() => setSelectedTab('accelerometer')}
                  testID="accelerometer-tab"
                >
                  <Activity size={16} color={selectedTab === 'accelerometer' ? '#ffffff' : '#64748b'} />
                  <Text style={[
                    styles.tabText,
                    selectedTab === 'accelerometer' && styles.tabTextActive
                  ]}>
                    Acceleration
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chartContainer}>
                <SimpleLineChart
                  data=({selectedTab === 'temperature' ? temperatureData : accelerometerData})
                  width={width - 60}
                  height={200}
                  color={selectedTab === 'temperature' ? '#f97316' : '#8b5cf6'}
                  label={selectedTab === 'temperature' ? 'Temperature (°C)' : 'Acceleration'}
                />
              </View>
            </View>
          )}

          {sessionData.length === 0 && (
            <View style={styles.emptyState}>
              <TrendingUp size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Data Available</Text>
              <Text style={styles.emptySubtitle}>
                Start recording to see real-time data visualization
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0891b2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  chartContainer: {
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});