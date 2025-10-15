import { useFirebase } from '@/providers/firebase-provider';
import { useStorage } from '@/providers/storage-provider';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  location?: string;
  createdAt: number;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncSessionsCallback, setSyncSessionsCallback] = useState<(() => Promise<void>) | null>(null);
  const storage = useStorage();
  const firebase = useFirebase();

  // Function to register the sync callback from sensor provider
  const registerSyncCallback = useCallback((callback: () => Promise<void>) => {
    setSyncSessionsCallback(() => callback);
  }, []);

  const loadStoredUser = useCallback(async () => {
    try {
      console.log('Loading stored user...');
      
      // If Firebase is configured and has a user, use that
      if (firebase.isConfigured && firebase.user) {
        console.log('Using Firebase user:', firebase.user);
        setUser(firebase.user);
        setIsLoading(false);
        return;
      }
      
      // Otherwise, check local storage quickly
      const storedUser = await storage.getItem('user');
      console.log('Stored user data:', storedUser);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('Parsed user:', parsedUser);
          setUser(parsedUser);
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          // Clear invalid stored user data
          await storage.removeItem('user');
        }
      } else {
        console.log('No stored user found');
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storage, firebase.isConfigured, firebase.user]);

  useEffect(() => {
    // Load stored user immediately, don't wait for Firebase
    // Firebase will override if it has a user
    loadStoredUser();
  }, [loadStoredUser]);
  
  // Update user when Firebase user changes
  useEffect(() => {
    if (firebase.isConfigured) {
      if (firebase.user) {
        console.log('Firebase user updated, setting as current user');
        setUser(firebase.user);
        // Save Firebase user to local storage for persistence
        storage.setItem('user', JSON.stringify(firebase.user));
      } else if (!firebase.user && user && !firebase.isLoading) {
        console.log('Firebase user logged out, clearing current user');
        setUser(null);
        storage.removeItem('user');
        // Clear local sessions on logout - they should now be in database
        storage.removeItem('localSessions');
        storage.removeItem('currentSession');
      }
    }
  }, [firebase.user, firebase.isConfigured, firebase.isLoading, user, storage]);

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    // Input validation
    if (!emailOrUsername.trim() || !password.trim()) {
      throw new Error('Email/username and password are required');
    }
    if (emailOrUsername.length > 100 || password.length > 100) {
      throw new Error('Email/username or password too long');
    }
    
    const sanitizedEmailOrUsername = emailOrUsername.trim();
    const sanitizedPassword = password.trim();
    
    try {
      console.log('Attempting login for:', sanitizedEmailOrUsername);
      
      // If Firebase is configured, try Firebase login first
      if (firebase.isConfigured) {
        // Check if it's an email (contains @) or username
        if (sanitizedEmailOrUsername.includes('@')) {
          console.log('Using Firebase login with email');
          await firebase.login(sanitizedEmailOrUsername, sanitizedPassword);
          return; // Firebase will handle setting the user via auth state change
        } else {
          // For username, we need to find the email first from local storage
          const storedUsers = await storage.getItem('users');
          const users = storedUsers ? JSON.parse(storedUsers) : [];
          const foundUser = users.find((u: any) => u.username === sanitizedEmailOrUsername);
          
          if (foundUser && foundUser.email) {
            console.log('Found email for username, using Firebase login');
            await firebase.login(foundUser.email, sanitizedPassword);
            return;
          }
        }
      }
      
      // Fallback to local authentication
      console.log('Using local authentication');
      const storedUsers = await storage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      console.log('Found users:', users.length);
      
      const foundUser = users.find((u: any) => 
        (u.username === sanitizedEmailOrUsername || u.email === sanitizedEmailOrUsername) && u.password === sanitizedPassword
      );

      if (!foundUser) {
        console.log('User not found or invalid password');
        throw new Error('Invalid credentials');
      }

      const { password: _, ...userWithoutPassword } = foundUser;
      console.log('Local login successful, setting user:', userWithoutPassword);
      setUser(userWithoutPassword);
      await storage.setItem('user', JSON.stringify(userWithoutPassword));
      console.log('User data saved to storage');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [storage, firebase]);

  const register = useCallback(async (userData: {
    username: string;
    email?: string;
    password: string;
    location?: string;
  }) => {
    try {
      console.log('Attempting registration for:', userData.username);
      
      // If Firebase is configured and email is provided, use Firebase
      if (firebase.isConfigured && userData.email) {
        console.log('Using Firebase registration');
        await firebase.register({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          location: userData.location,
        });
        return; // Firebase will handle setting the user via auth state change
      }
      
      // Fallback to local registration
      console.log('Using local registration');
      const storedUsers = await storage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      
      const existingUser = users.find((u: any) => 
        u.username === userData.username || (userData.email && u.email === userData.email)
      );
      if (existingUser) {
        console.log('Username or email already exists');
        throw new Error('Username or email already exists');
      }

      const newUser = {
        id: Date.now().toString(),
        username: userData.username,
        email: userData.email,
        location: userData.location,
        password: userData.password,
        createdAt: Date.now(),
      };

      users.push(newUser);
      await storage.setItem('users', JSON.stringify(users));
      console.log('User registered and saved to users list');

      const { password: _, ...userWithoutPassword } = newUser;
      console.log('Setting registered user:', userWithoutPassword);
      setUser(userWithoutPassword);
      await storage.setItem('user', JSON.stringify(userWithoutPassword));
      console.log('User data saved to storage');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }, [storage, firebase]);

  const logout = useCallback(async () => {
    try {
      console.log('Logging out user');
      
      // Sync local sessions to database before logout
      if (syncSessionsCallback) {
        console.log('Syncing local sessions to database...');
        try {
          await syncSessionsCallback();
        } catch (syncError) {
          console.error('Error syncing sessions during logout:', syncError);
          // Continue with logout even if sync fails
        }
      }
      
      // If Firebase is configured, logout from Firebase
      if (firebase.isConfigured && firebase.user) {
        console.log('Logging out from Firebase');
        try {
          await firebase.logout();
        } catch (firebaseError) {
          console.error('Firebase logout error:', firebaseError);
          // Continue with local logout even if Firebase logout fails
        }
      }
      
      // Always clear local data regardless of Firebase logout success
      await storage.removeItem('user');
      // Clear local sessions on logout - they should now be in database
      await storage.removeItem('localSessions');
      await storage.removeItem('currentSession');
      setUser(null);
      console.log('User logged out successfully - local sessions synced and cleared');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there are errors
      try {
        await storage.removeItem('user');
        await storage.removeItem('localSessions');
        await storage.removeItem('currentSession');
        setUser(null);
        console.log('Force logout completed after error');
      } catch (cleanupError) {
        console.error('Error during force logout cleanup:', cleanupError);
        // At minimum, clear the user state
        setUser(null);
      }
    }
  }, [storage, syncSessionsCallback, firebase]);

  return useMemo(() => ({
    user,
    login,
    register,
    logout,
    isLoading: isLoading,
    registerSyncCallback,
    isFirebaseConfigured: firebase.isConfigured,
    isFirebaseOnline: firebase.isOnline,
  }), [user, isLoading, firebase.isConfigured, firebase.isOnline, login, register, logout, registerSyncCallback]);
});