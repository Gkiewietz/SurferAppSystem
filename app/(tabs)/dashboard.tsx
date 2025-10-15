import { useAuth } from '@/providers/auth-provider';
import { useSensor } from '@/providers/sensor-provider';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import {
    Activity, BarChart3, Bluetooth, Clock, Download, FolderOpen, History, MapPin, Play, Square, Thermometer, Wifi, WifiOff
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { user, isLoading, isFirebaseConfigured, isFirebaseOnline } = useAuth();
  const insets = useSafeAreaInsets();
  
  console.log('Dashboard - user:', user);
  console.log('Dashboard - isLoading:', isLoading);
  const { 
    isConnected, 
    isScanning, 
    currentData, 
    isRecording,
    startScanning, 
    stopScanning,
    startRecording,
    stopRecording,
    location,
    connectedDevice,
    sensorFiles,
    readSensorFiles,
    downloadSensorFile
  } = useSensor();



  const handleScanToggle = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleRecordingToggle = () => {
    if (!isConnected) {
      console.log('No sensor connected - please connect first');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    console.log('Dashboard - No user found, showing login message');
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Please log in to continue</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('./(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user.username}</Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIndicator}>
                {isConnected ? (
                  <Wifi size={20} color="#10b981" />
                ) : (
                  <WifiOff size={20} color="#ef4444" />
                )}
                <Text style={[
                  styles.statusText,
                  { color: isConnected ? '#10b981' : '#ef4444' }
                ]}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording</Text>
                </View>
              )}
            </View>

            <View style={styles.firebaseStatus}>
              <View style={styles.firebaseIndicator}>
                <View style={[
                  styles.firebaseDot,
                  { backgroundColor: isFirebaseConfigured && isFirebaseOnline ? '#10b981' : '#ef4444' }
                ]} />
                <Text style={styles.firebaseText}>
                  Firebase: {isFirebaseConfigured ? (isFirebaseOnline ? 'Connected' : 'Offline') : 'Not Configured'}
                </Text>
              </View>
              {isFirebaseConfigured && isFirebaseOnline && (
                <Text style={styles.firebaseSubtext}>Data syncing to cloud</Text>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isScanning && styles.actionButtonActive
                ]}
                onPress={handleScanToggle}
                testID="scan-button"
              >
                <Bluetooth size={20} color={isScanning ? '#ffffff' : '#0891b2'} />
                <Text style={[
                  styles.actionButtonText,
                  isScanning && styles.actionButtonTextActive
                ]}>
                  {isScanning ? 'Stop Scan' : 'Scan Sensors'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isRecording && styles.recordingButton,
                  !isConnected && styles.actionButtonDisabled
                ]}
                onPress={handleRecordingToggle}
                disabled={!isConnected}
                testID="record-button"
              >
                {isRecording ? (
                  <Square size={20} color="#ffffff" />
                ) : (
                  <Play size={20} color={isConnected ? '#ef4444' : '#94a3b8'} />
                )}
                <Text style={[
                  styles.actionButtonText,
                  isRecording && styles.actionButtonTextActive,
                  !isConnected && styles.actionButtonTextDisabled
                ]}>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {currentData && (
            <View style={styles.dataGrid}>
              <View style={styles.dataCard}>
                <Thermometer size={24} color="#f97316" />
                <Text style={styles.dataValue}>{currentData.temperature}°C</Text>
                <Text style={styles.dataLabel}>Temperature</Text>
              </View>

              <View style={styles.dataCard}>
                <Activity size={24} color="#8b5cf6" />
                <Text style={styles.dataValue}>{currentData.accelerometer.magnitude.toFixed(2)}</Text>
                <Text style={styles.dataLabel}>Acceleration</Text>
              </View>

              <View style={styles.dataCard}>
                <Clock size={24} color="#06b6d4" />
                <Text style={styles.dataValue}>
                  {new Date(currentData.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.dataLabel}>Last Update</Text>
              </View>

              <View style={styles.dataCard}>
                <MapPin size={24} color="#10b981" />
                <Text style={styles.dataValue}>
                  {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'No GPS'}
                </Text>
                <Text style={styles.dataLabel}>Location</Text>
              </View>
            </View>
          )}

          {isConnected && connectedDevice && (
            <View style={styles.sensorFilesCard}>
              <View style={styles.sensorFilesHeader}>
                <FolderOpen size={24} color="#0891b2" />
                <Text style={styles.sensorFilesTitle}>Sensor Files</Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={readSensorFiles}
                >
                  <Download size={16} color="#0891b2" />
                  <Text style={styles.refreshButtonText}>Scan Files</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.deviceInfo}>
                Connected to: {connectedDevice.name}
              </Text>
              
              {sensorFiles.length > 0 ? (
                <ScrollView style={styles.filesList} horizontal showsHorizontalScrollIndicator={false}>
                  {sensorFiles.map((file) => (
                    <TouchableOpacity
                      key={file.name}
                      style={styles.fileCard}
                      onPress={() => downloadSensorFile(file.name)}
                    >
                      <Text style={styles.fileName}>{file.name}</Text>
                      <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
                      <Text style={styles.fileDate}>
                        {new Date(file.lastModified).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noFilesText}>
                  No files found. Tap &ldquo;Scan Files&rdquo; to check for sensor data.
                </Text>
              )}
            </View>
          )}

          {!isConnected && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How to Start a Session</Text>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Tap &ldquo;Scan Sensors&rdquo; to connect to your surf sensor</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Once connected, tap &ldquo;Start Recording&rdquo; to begin</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Your session data will be saved automatically</Text>
              </View>
            </View>
          )}

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('./(tabs)/data')}
              testID="view-data-button"
            >
              <BarChart3 size={32} color="#0891b2" />
              <Text style={styles.quickActionTitle}>View Data</Text>
              <Text style={styles.quickActionSubtitle}>Charts and analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('./(tabs)/history')}
              testID="view-history-button"
            >
              <History size={32} color="#0891b2" />
              <Text style={styles.quickActionTitle}>History</Text>
              <Text style={styles.quickActionSubtitle}>Past sessions</Text>
            </TouchableOpacity>
          </View>
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
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: '#0891b2',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0891b2',
  },
  actionButtonTextActive: {
    color: '#ffffff',
  },
  actionButtonTextDisabled: {
    color: '#94a3b8',
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  dataCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 12,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  sensorFilesCard: {
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
  sensorFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sensorFilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#0891b2',
    fontWeight: '500',
  },
  deviceInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  filesList: {
    maxHeight: 120,
  },
  fileCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  noFilesText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  firebaseStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  firebaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  firebaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  firebaseText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  firebaseSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    marginLeft: 14,
  },
  instructionsCard: {
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
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0891b2',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});