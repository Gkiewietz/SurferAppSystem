import { useSensor } from '@/providers/sensor-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, Calendar, Clock, MapPin, Thermometer, TrendingUp } from 'lucide-react-native';
import React from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const { historicalSessions } = useSensor();
  const insets = useSafeAreaInsets();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSessionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => router.push(`./sensor-details?sessionId=${item.id}`)}
      testID={`session-${item.id}`}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionDate}>
          <Calendar size={16} color="#0891b2" />
          <Text style={styles.sessionDateText}>{formatDate(item.startTime)}</Text>
        </View>
        <Text style={styles.sessionTime}>{formatTime(item.startTime)}</Text>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.statText}>{formatDuration(item.duration)}</Text>
        </View>
        <View style={styles.statItem}>
          <Thermometer size={14} color="#f97316" />
          <Text style={styles.statText}>{item.avgTemp.toFixed(1)}°C</Text>
        </View>
        <View style={styles.statItem}>
          <Activity size={14} color="#8b5cf6" />
          <Text style={styles.statText}>{item.maxAccel.toFixed(1)}</Text>
        </View>
        {item.location && (
          <View style={styles.statItem}>
            <MapPin size={14} color="#10b981" />
            <Text style={styles.statText}>GPS</Text>
          </View>
        )}
      </View>

      <View style={styles.sessionFooter}>
        <Text style={styles.dataPointsText}>{item.dataPoints} data points</Text>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push(`./sensor-details?sessionId=${item.id}`)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Session History</Text>
            <Text style={styles.subtitle}>
              {historicalSessions.length} recorded sessions
            </Text>
          </View>

          {historicalSessions.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Quick Stats</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <TrendingUp size={20} color="#0891b2" />
                  <Text style={styles.summaryValue}>
                    {historicalSessions.reduce((acc, session) => acc + session.duration, 0)} min
                  </Text>
                  <Text style={styles.summaryLabel}>Total Time</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Thermometer size={20} color="#f97316" />
                  <Text style={styles.summaryValue}>
                    {(historicalSessions.reduce((acc, session) => acc + session.avgTemp, 0) / historicalSessions.length).toFixed(1)}°C
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Temp</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Activity size={20} color="#8b5cf6" />
                  <Text style={styles.summaryValue}>
                    {Math.max(...historicalSessions.map(s => s.maxAccel)).toFixed(1)}
                  </Text>
                  <Text style={styles.summaryLabel}>Max Accel</Text>
                </View>
              </View>
            </View>
          )}

          {historicalSessions.length > 0 ? (
            <FlatList
              data={historicalSessions}
              renderItem={renderSessionItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sessionsList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start recording sessions to build your history
              </Text>
            </View>
          )}

          {historicalSessions.length > 1 && (
            <TouchableOpacity
              style={styles.compareButton}
              onPress={() => router.push('./data-comparison')}
              testID="compare-sessions-button"
            >
              <TrendingUp size={20} color="#ffffff" />
              <Text style={styles.compareButtonText}>Compare Sessions</Text>
            </TouchableOpacity>
          )}
        </View>
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
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionsList: {
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sessionTime: {
    fontSize: 14,
    color: '#64748b',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataPointsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#0891b2',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
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
  compareButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0891b2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  compareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});