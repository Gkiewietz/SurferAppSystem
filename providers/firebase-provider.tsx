import { auth, db } from '@/config/firebase';
import createContextHook from '@nkzw/create-context-hook'; //check
import {
    User as FirebaseUser,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth'; //check 
import {
    Timestamp,
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    where
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  location?: string;
  createdAt: number;
}

interface SensorData {
  id?: string;
  userId: string;
  serialNumber: string;
  timestamp: number;
  temperature: number;
  accelerometer: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  sessionId: string;
}

interface Session {
  id?: string;
  userId: string;
  startTime: number;
  endTime?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  dataCount: number;
}

export const [FirebaseProvider, useFirebase] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Check if Firebase is properly configured
  const isConfigured = useMemo(() => {
    try {
      return auth.app.options.apiKey !== "your-api-key";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      console.log('Firebase not configured - using local storage fallback');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('Firebase auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      // Set loading to false immediately to speed up UI
      setIsLoading(false);
      
      if (firebaseUser) {
        // Set basic user info immediately from Firebase Auth
        const basicUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          location: undefined,
          createdAt: Date.now(),
        };
        
        setUser(basicUser);
        setIsOnline(true);
        
        // Fetch additional user data from Firestore in background
        try {
          console.log('Fetching additional user data from Firestore for UID:', firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Additional user data retrieved from Firestore:', userData);
            // Update user with Firestore data
            setUser({
              id: firebaseUser.uid,
              username: userData.username || basicUser.username,
              email: firebaseUser.email || '',
              location: userData.location,
              createdAt: userData.createdAt || Date.now(),
            });
          } else {
            console.log('No user document found in Firestore for UID:', firebaseUser.uid);
            // Keep the basic user info even if no Firestore doc exists
          }
        } catch (error) {
          console.error('Error fetching additional user data from Firestore:', error);
          // Keep the basic user info even if Firestore fetch fails
        }
      } else {
        console.log('No Firebase user - setting user to null');
        setUser(null);
      }
    });

    return unsubscribe;
  }, [isConfigured]);

  const register = useCallback(async (userData: {
    username: string;
    email: string;
    password: string;
    location?: string;
  }) => {
    if (!isConfigured) {
      throw new Error('Firebase not configured. Please set up your Firebase config.');
    }

    try {
      console.log('Creating Firebase user for:', userData.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const newUser = {
        username: userData.username,
        email: userData.email,
        location: userData.location,
        createdAt: Date.now(),
      };

      console.log('Saving user data to Firestore...');
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      console.log('User data saved to Firestore successfully');

      setUser({
        id: userCredential.user.uid,
        ...newUser,
      });
      
      console.log('Firebase user registration completed successfully');
    } catch (error: any) {
      console.error('Firebase registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      throw new Error(error.message || 'Registration failed');
    }
  }, [isConfigured]);

  const login = useCallback(async (email: string, password: string) => {
    if (!isConfigured) {
      throw new Error('Firebase not configured. Please set up your Firebase config.');
    }

    if (!email.trim() || !password.trim()) {
      throw new Error('Email and password are required');
    }

    if (email.length > 100 || password.length > 100) {
      throw new Error('Email or password too long');
    }

    try {
      console.log('Attempting Firebase login for:', email.trim());
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      console.log('Firebase login successful');
    } catch (error: any) {
      console.error('Firebase login error:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      throw new Error(error.message || 'Login failed');
    }
  }, [isConfigured]);

  const logout = useCallback(async () => {
    if (!isConfigured) {
      console.log('Firebase not configured, clearing user locally');
      setUser(null);
      return;
    }

    try {
      console.log('Signing out from Firebase...');
      await signOut(auth);
      console.log('Firebase sign out successful');
      setUser(null);
    } catch (error) {
      console.error('Firebase logout error:', error);
      // Even if Firebase logout fails, clear the local user
      setUser(null);
      // Don't throw error - let the auth provider handle cleanup
      console.log('Firebase logout failed, but local user cleared');
    }
  }, [isConfigured]);

  const saveSensorData = useCallback(async (data: Omit<SensorData, 'id' | 'userId'>) => {
    if (!isConfigured || !user) {
      console.log('Cannot save sensor data to Firebase - not configured or user not authenticated');
      throw new Error('Firebase not configured or user not authenticated');
    }

    try {
      const sensorData = {
        ...data,
        userId: user.id,
        timestamp: data.timestamp || Date.now(),
      };

      console.log('Saving sensor data to Firebase for user:', user.id);
      const docRef = await addDoc(collection(db, 'sensorData'), sensorData);
      console.log('Sensor data saved to Firebase with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving sensor data to Firebase:', error);
      throw error;
    }
  }, [isConfigured, user]);

  const saveSession = useCallback(async (sessionData: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    location: string;
    averageSpeed: number;
    dataPoints: number;
    avgTemp: number;
    maxTemp: number;
    minTemp: number;
    maxAccel: number;
    avgAccel: number;
    distance: number;
    maxSpeed: number;
  }) => {
    if (!isConfigured || !user) {
      console.log('Cannot save session to Firebase - not configured or user not authenticated');
      throw new Error('Firebase not configured or user not authenticated');
    }

    try {
      const sessionDoc = {
        userId: user.id,
        startTime: Timestamp.fromDate(sessionData.startTime),
        endTime: Timestamp.fromDate(sessionData.endTime),
        durationMinutes: sessionData.durationMinutes,
        location: sessionData.location,
        averageSpeed: sessionData.averageSpeed,
        dataPoints: sessionData.dataPoints,
        avgTemp: sessionData.avgTemp,
        maxTemp: sessionData.maxTemp,
        minTemp: sessionData.minTemp,
        maxAccel: sessionData.maxAccel,
        avgAccel: sessionData.avgAccel,
        distance: sessionData.distance,
        maxSpeed: sessionData.maxSpeed,
        createdAt: Timestamp.now(),
      };

      console.log('Saving session to Firebase for user:', user.id);
      const docRef = await addDoc(collection(db, 'users', user.id, 'sessions'), sessionDoc);
      console.log('Session saved to Firebase with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving session to Firebase:', error);
      throw error;
    }
  }, [isConfigured, user]);

  const createSession = useCallback(async (location?: { latitude: number; longitude: number }) => {
    if (!isConfigured || !user) {
      console.log('Cannot create Firebase session - not configured or user not authenticated');
      throw new Error('Firebase not configured or user not authenticated');
    }

    try {
      console.log('Creating Firebase session for user:', user.id);
      const session: Omit<Session, 'id'> = {
        userId: user.id,
        startTime: Date.now(),
        location,
        dataCount: 0,
      };

      const docRef = await addDoc(collection(db, 'sessions'), session);
      console.log('Firebase session created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating Firebase session:', error);
      throw error;
    }
  }, [isConfigured, user]);

  const getUserSessions = useCallback(async () => {
    if (!isConfigured || !user) {
      return [];
    }

    try {
      // Get sessions from user's subcollection
      const q = query(
        collection(db, 'users', user.id, 'sessions'),
        orderBy('startTime', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to numbers for compatibility
          startTime: data.startTime?.toMillis ? data.startTime.toMillis() : data.startTime,
          endTime: data.endTime?.toMillis ? data.endTime.toMillis() : data.endTime,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        };
      });
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }, [isConfigured, user]);

  const getSessionData = useCallback(async (sessionId: string) => {
    if (!isConfigured || !user) {
      return [];
    }

    try {
      const q = query(
        collection(db, 'sensorData'),
        where('sessionId', '==', sessionId),
        where('userId', '==', user.id),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SensorData[];
    } catch (error) {
      console.error('Error fetching session data:', error);
      return [];
    }
  }, [isConfigured, user]);

  return useMemo(() => ({
    user,
    isLoading,
    isOnline,
    isConfigured,
    login,
    register,
    logout,
    saveSensorData,
    saveSession,
    createSession,
    getUserSessions,
    getSessionData,
  }), [
    user, 
    isLoading, 
    isOnline, 
    isConfigured,
    login, 
    register, 
    logout,
    saveSensorData,
    saveSession,
    createSession,
    getUserSessions,
    getSessionData
  ]);
});