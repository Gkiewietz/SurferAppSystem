import { useAuth } from '@/providers/auth-provider'; //look
import { useFirebase } from '@/providers/firebase-provider'; //look
import { useStorage } from '@/providers/storage-provider'; //look
import createContextHook from '@nkzw/create-context-hook'; //look
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location'; //look
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

// Web Bluetooth API types
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<any>;
    };
  }
}

interface SensorData {
  serialNumber: string;
  timestamp: number;
  temperature: number;
  accelerometer: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
  magnetometer?: {
    x: number;
    y: number;
    z: number;
  };
}

interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
  serviceUUIDs?: string[];
}

interface SensorFile {
  name: string;
  size: number;
  lastModified: number;
  data?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface SessionData extends SensorData {
  location?: LocationData;
}

interface HistoricalSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  dataPoints: number;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  location?: LocationData;
  data: SessionData[];
  deviceInfo?: {
    serialNumber: string;
    deviceName?: string;
  };
}

export const [SensorProvider, useSensor] = createContextHook(() => {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [historicalSessions, setHistoricalSessions] = useState<HistoricalSession[]>([]);
  const [localSessions, setLocalSessions] = useState<HistoricalSession[]>([]);
  const [dataInterval, setDataInterval] = useState<NodeJS.Timeout | null>(null);
  const [availableDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [sensorFiles, setSensorFiles] = useState<SensorFile[]>([]);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [bluetoothCharacteristic, setBluetoothCharacteristic] = useState<any>(null);

  const { getItem, setItem, removeItem } = useStorage();
  const { saveSensorData, saveSession, createSession, getUserSessions, user: firebaseUser, isConfigured } = useFirebase();
  const { registerSyncCallback } = useAuth();

  const getCurrentLocation = useCallback(async () => {
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation({
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }, []);

  const loadHistoricalSessions = useCallback(async () => {
    try {
      // Load Firebase sessions if configured and user is authenticated
      let firebaseSessions: any[] = [];
      if (isConfigured && firebaseUser) {
        try {
          firebaseSessions = await getUserSessions();
          console.log('Loaded Firebase sessions:', firebaseSessions.length);
        } catch (error) {
          console.error('Error loading Firebase sessions:', error);
        }
      }
      
      // Load local database sessions (last 5)
      const stored = await getItem('historicalSessions');
      let localDbSessions: any[] = [];
      if (stored) {
        localDbSessions = JSON.parse(stored);
      }
      
      // Merge Firebase and local database sessions, remove duplicates
      const allDbSessions = [...firebaseSessions, ...localDbSessions];
      const uniqueDbSessions = allDbSessions.reduce((acc: any[], session) => {
        if (!acc.find(s => s.id === session.id)) {
          acc.push(session);
        }
        return acc;
      }, []).sort((a, b) => b.startTime - a.startTime);
      
      // Show only last 5 sessions from combined database
      setHistoricalSessions(uniqueDbSessions.slice(0, 5));
      
      // Load local sessions (current login session)
      const localStored = await getItem('localSessions');
      if (localStored) {
        setLocalSessions(JSON.parse(localStored));
      }
    } catch (error) {
      console.error('Error loading historical sessions:', error);
    }
  }, [getItem, isConfigured, firebaseUser, getUserSessions]);

  const saveLocalSessions = useCallback(async (sessions: HistoricalSession[]) => {
    if (!sessions || sessions.length === 0) {
      console.log('No sessions to save');
      return;
    }
    
    try {
      await setItem('localSessions', JSON.stringify(sessions));
      console.log('Local sessions saved:', sessions.length);
    } catch (error) {
      console.error('Error saving local sessions:', error);
    }
  }, [setItem]);

  const syncSessionsToDatabase = useCallback(async (sessions: HistoricalSession[]) => {
    try {
      // Get existing database sessions
      const stored = await getItem('historicalSessions');
      const existingSessions = stored ? JSON.parse(stored) : [];
      
      // Merge local sessions with database sessions
      const allSessions = [...sessions, ...existingSessions];
      
      // Sort by start time (newest first) and remove duplicates
      const uniqueSessions = allSessions.reduce((acc: HistoricalSession[], session) => {
        if (!acc.find(s => s.id === session.id)) {
          acc.push(session);
        }
        return acc;
      }, []).sort((a, b) => b.startTime - a.startTime);
      
      // Save all sessions to database
      await setItem('historicalSessions', JSON.stringify(uniqueSessions));
      
      // Update displayed sessions (last 5 from database)
      setHistoricalSessions(uniqueSessions.slice(0, 5));
      
      console.log('Sessions synced to database:', uniqueSessions.length);
    } catch (error) {
      console.error('Error syncing sessions to database:', error);
    }
  }, [getItem, setItem]);

  // Function to sync local sessions to database (called on logout)
  const syncLocalSessionsToDatabase = useCallback(async () => {
    if (localSessions.length > 0) {
      await syncSessionsToDatabase(localSessions);
      // Clear local sessions after syncing
      await removeItem('localSessions');
      setLocalSessions([]);
      console.log('Local sessions synced to database and cleared');
    }
  }, [localSessions, syncSessionsToDatabase, removeItem]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    loadHistoricalSessions();
    requestLocationPermission();
    // Register sync callback with auth provider
    registerSyncCallback(syncLocalSessionsToDatabase);
  }, [loadHistoricalSessions, requestLocationPermission, registerSyncCallback, syncLocalSessionsToDatabase]);





  const handleBluetoothData = useCallback((event: any) => {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const data = decoder.decode(value);
    
    try {
      // Parse incoming sensor data
      const parsedData = JSON.parse(data);
      const sensorData: SensorData = {
        serialNumber: parsedData.serialNumber || connectedDevice?.id || 'UNKNOWN',
        timestamp: Date.now(),
        temperature: parsedData.temperature || 0,
        accelerometer: {
          x: parsedData.accel?.x || 0,
          y: parsedData.accel?.y || 0,
          z: parsedData.accel?.z || 0,
          magnitude: Math.sqrt(
            Math.pow(parsedData.accel?.x || 0, 2) +
            Math.pow(parsedData.accel?.y || 0, 2) +
            Math.pow(parsedData.accel?.z || 0, 2)
          )
        },
        gyroscope: parsedData.gyro,
        magnetometer: parsedData.mag
      };
      
      setCurrentData(sensorData);
      
      if (isRecording) {
        const sessionPoint: SessionData = {
          ...sensorData,
          location: location || undefined,
        };
        setSessionData(prev => [...prev, sessionPoint]);
      }
    } catch (parseError) {
      console.log('Error parsing sensor data:', parseError);
      // Fallback to raw data
      console.log('Raw data received:', data);
    }
  }, [connectedDevice, location, isRecording]);

  // Web Bluetooth API functions
  const connectWebBluetooth = useCallback(async () => {
    if (Platform.OS !== 'web' || !navigator.bluetooth) {
      console.log('Web Bluetooth not supported on this platform');
      return false;
    }

    try {
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'device_information', '12345678-1234-1234-1234-123456789abc']
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt?.connect();
      
      if (server) {
        setBluetoothDevice(device);
        setConnectedDevice({
          id: device.id,
          name: device.name || 'Unknown Device'
        });
        setIsConnected(true);
        
        // Try to get device information
        try {
          const services = await server.getPrimaryServices();
          console.log('Available services:', services.length);
          
          // Look for data service
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics();
              for (const characteristic of characteristics) {
                if (characteristic.properties.read || characteristic.properties.notify) {
                  setBluetoothCharacteristic(characteristic);
                  
                  // Set up notifications if supported
                  if (characteristic.properties.notify) {
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', handleBluetoothData);
                  }
                  break;
                }
              }
            } catch (charError) {
              console.log('Error accessing characteristics:', charError);
            }
          }
        } catch (serviceError) {
          console.log('Error accessing services:', serviceError);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      console.log('Connection Error: Failed to connect to Bluetooth device');
      return false;
    }
    return false;
  }, [handleBluetoothData]);

  const readSensorFiles = useCallback(async () => {
    if (!bluetoothCharacteristic) {
      console.log('Error: No sensor connected');
      return;
    }

    try {
      // Send command to list files
      const encoder = new TextEncoder();
      const command = encoder.encode(JSON.stringify({ command: 'list_files' }));
      
      if (bluetoothCharacteristic.properties.write) {
        await bluetoothCharacteristic.writeValue(command);
        
        // Read response
        if (bluetoothCharacteristic.properties.read) {
          const response = await bluetoothCharacteristic.readValue();
          const decoder = new TextDecoder();
          const fileList = JSON.parse(decoder.decode(response));
          
          setSensorFiles(fileList.files || []);
        }
      }
    } catch (error) {
      console.error('Error reading sensor files:', error);
      console.log('Error: Failed to read sensor files');
    }
  }, [bluetoothCharacteristic]);

  const downloadSensorFile = useCallback(async (fileName: string) => {
    if (!bluetoothCharacteristic) {
      console.log('Error: No sensor connected');
      return null;
    }

    try {
      const encoder = new TextEncoder();
      const command = encoder.encode(JSON.stringify({ 
        command: 'download_file', 
        filename: fileName 
      }));
      
      if (bluetoothCharacteristic.properties.write) {
        await bluetoothCharacteristic.writeValue(command);
        
        // Read file data
        if (bluetoothCharacteristic.properties.read) {
          const response = await bluetoothCharacteristic.readValue();
          const decoder = new TextDecoder();
          const fileData = decoder.decode(response);
          
          // Saving to local storage
          const fileUri = `${FileSystem.documentDirectory}${fileName}`; //look
          await FileSystem.writeAsStringAsync(fileUri, fileData);
          
          return fileUri;
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      console.log('Error: Failed to download file');
    }
    return null;
  }, [bluetoothCharacteristic]);

  const generateMockSensorData = (): SensorData => {
    const accelX = Math.random() * 2 - 1;
    const accelY = Math.random() * 2 - 1;
    const accelZ = Math.random() * 2 - 1;
    
    return {
      serialNumber: 'SURF-001-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: Date.now(),
      temperature: 20 + Math.random() * 15 + Math.sin(Date.now() / 10000) * 5,
      accelerometer: {
        x: accelX,
        y: accelY,
        z: accelZ,
        magnitude: Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ)
      },
      gyroscope: {
        x: Math.random() * 0.5 - 0.25,
        y: Math.random() * 0.5 - 0.25,
        z: Math.random() * 0.5 - 0.25
      }
    };
  };

  const startScanning = useCallback(async () => {
    setIsScanning(true);
    
    if (Platform.OS === 'web') {
      // Use Web Bluetooth API
      const connected = await connectWebBluetooth();
      setIsScanning(false);
      
      if (connected) {
        getCurrentLocation();
        console.log('Real sensor connected via Web Bluetooth');
      } else {
        // Fallback to mock for demo
        setTimeout(() => {
          setIsConnected(true);
          setConnectedDevice({
            id: 'mock-device',
            name: 'Mock Surf Sensor'
          });
          getCurrentLocation();
          console.log('Mock sensor connected for demo');
        }, 1000);
      }
    } else {
      // For native apps, you would use react-native-ble-plx here
      // This is a placeholder for when you build a standalone app
      console.log('Native Bluetooth: For real Bluetooth connectivity on mobile, you need to build a standalone app with react-native-ble-plx. Using mock data for now.');
      
      setTimeout(() => {
        setIsConnected(true);
        setIsScanning(false);
        setConnectedDevice({
          id: 'native-mock-device',
          name: 'Native Mock Sensor'
        });
        getCurrentLocation();
        console.log('Native mock sensor connected');
      }, 2000);
    }
  }, [connectWebBluetooth, getCurrentLocation]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isConnected) return;

    const sessionId = Date.now().toString();
    setCurrentSession(sessionId);
    setIsRecording(true);
    setSessionData([]);

    // Create Firebase session if configured
    if (isConfigured && firebaseUser) {
      try {
        await createSession(location || undefined);
        console.log('Firebase session created successfully');
      } catch (error) {
        console.error('Failed to create Firebase session:', error);
      }
    }

    const interval = setInterval(async () => {
      const newData = generateMockSensorData();
      setCurrentData(newData);
      
      const sessionPoint: SessionData = {
        ...newData,
        location: location || undefined,
      };
      
      setSessionData(prev => [...prev, sessionPoint]);

      // Save to Firebase if configured
      if (isConfigured && firebaseUser) {
        try {
          await saveSensorData({
            serialNumber: newData.serialNumber,
            timestamp: newData.timestamp,
            temperature: newData.temperature,
            accelerometer: newData.accelerometer.magnitude,
            location: location ? {
              latitude: location.latitude,
              longitude: location.longitude
            } : undefined,
            sessionId
          });
          console.log('Sensor data saved to Firebase');
        } catch (error) {
          console.error('Failed to save sensor data to Firebase:', error);
        }
      }
    }, 1000);

    setDataInterval(interval); //look
  }, [isConnected, location, isConfigured, firebaseUser, createSession, saveSensorData]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !currentSession) return;

    setIsRecording(false);
    
    if (dataInterval) {
      clearInterval(dataInterval);
      setDataInterval(null);
    }

    if (sessionData.length > 0) {
      const startTime = sessionData[0].timestamp;
      const endTime = sessionData[sessionData.length - 1].timestamp;
      const temperatures = sessionData.map(d => d.temperature);
      const accelerations = sessionData.map(d => d.accelerometer.magnitude);

      // Calculate distance and speed from accelerometer data
      let totalDistance = 0;
      let maxSpeed = 0;
      let totalSpeed = 0;
      
      for (let i = 1; i < sessionData.length; i++) {
        const timeDiff = (sessionData[i].timestamp - sessionData[i-1].timestamp) / 1000; // seconds
        const accelMag = sessionData[i].accelerometer.magnitude;
        const speed = accelMag * timeDiff; // simplified speed calculation
        totalSpeed += speed;
        maxSpeed = Math.max(maxSpeed, speed);
        totalDistance += speed * timeDiff;
      }
      
      const avgSpeed = sessionData.length > 1 ? totalSpeed / (sessionData.length - 1) : 0;

      const newSession: HistoricalSession = {
        id: currentSession,
        startTime,
        endTime,
        duration: Math.floor((endTime - startTime) / 1000),
        dataPoints: sessionData.length,
        avgTemp: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
        maxTemp: Math.max(...temperatures),
        minTemp: Math.min(...temperatures),
        maxAccel: Math.max(...accelerations),
        avgAccel: accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
        distance: totalDistance,
        maxSpeed,
        avgSpeed,
        location: location || undefined,
        data: [...sessionData],
        deviceInfo: connectedDevice ? {
          serialNumber: connectedDevice.id,
          deviceName: connectedDevice.name
        } : undefined,
      };

      // Add to local sessions (current login session)
      const updatedLocalSessions = [newSession, ...localSessions];
      setLocalSessions(updatedLocalSessions);
      await saveLocalSessions(updatedLocalSessions);
      
      // Also sync to Firebase if configured
      if (isConfigured && firebaseUser) {
        try {
          await saveSession({
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            durationMinutes: Math.floor((endTime - startTime) / 60000),
            location: location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown',
            averageSpeed: avgSpeed,
            dataPoints: sessionData.length,
            avgTemp: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
            maxTemp: Math.max(...temperatures),
            minTemp: Math.min(...temperatures),
            maxAccel: Math.max(...accelerations),
            avgAccel: accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
            distance: totalDistance,
            maxSpeed,
          });
          console.log('Session data synced to Firebase successfully');
        } catch (error) {
          console.error('Failed to sync session to Firebase:', error);
        }
      } else {
        console.log('Session saved locally - will sync to database on logout');
      }


    }

    setCurrentSession(null);
    setSessionData([]);
  }, [isRecording, currentSession, dataInterval, sessionData, location, localSessions, saveLocalSessions, connectedDevice, isConfigured, firebaseUser, saveSession]);

  const disconnectSensor = useCallback(async () => {
    try {
      if (bluetoothDevice && bluetoothDevice.gatt?.connected) {
        await bluetoothDevice.gatt.disconnect();
      }
      
      setIsConnected(false);
      setConnectedDevice(null);
      setBluetoothDevice(null);
      setBluetoothCharacteristic(null);
      setSensorFiles([]);
      
      if (isRecording) {
        stopRecording();
      }
    } catch (error) {
      console.error('Error disconnecting sensor:', error);
    }
  }, [bluetoothDevice, isRecording, stopRecording]);

  const clearAllData = useCallback(async () => {
    try {
      await removeItem('historicalSessions');
      await removeItem('localSessions');
      setHistoricalSessions([]);
      setLocalSessions([]);
      setSessionData([]);
      setCurrentData(null);
      setCurrentSession(null);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }, [removeItem]);

  // Combine local and database sessions for display
  const allDisplaySessions = useMemo(() => {
    const combined = [...localSessions, ...historicalSessions];
    // Remove duplicates and sort by start time (newest first)
    const unique = combined.reduce((acc: HistoricalSession[], session) => {
      if (!acc.find(s => s.id === session.id)) {
        acc.push(session);
      }
      return acc;
    }, []).sort((a, b) => b.startTime - a.startTime);
    
    return unique;
  }, [localSessions, historicalSessions]);



  return useMemo(() => ({
    isConnected,
    isScanning,
    isRecording,
    currentData,
    sessionData,
    currentSession,
    location,
    historicalSessions: allDisplaySessions, // Combined local + database sessions
    localSessions,
    availableDevices,
    connectedDevice,
    sensorFiles,
    startScanning,
    stopScanning,
    startRecording,
    stopRecording,
    disconnectSensor,
    readSensorFiles,
    downloadSensorFile,
    clearAllData,
    syncLocalSessionsToDatabase,
  }), [
    isConnected,
    isScanning,
    isRecording,
    currentData,
    sessionData,
    currentSession,
    location,
    allDisplaySessions,
    localSessions,
    availableDevices,
    connectedDevice,
    sensorFiles,
    startScanning,
    stopScanning,
    startRecording,
    stopRecording,
    disconnectSensor,
    readSensorFiles,
    downloadSensorFile,
    clearAllData,
    syncLocalSessionsToDatabase,
  ]);
});