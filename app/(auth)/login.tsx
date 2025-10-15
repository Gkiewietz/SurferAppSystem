import { useAuth } from '@/providers/auth-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Lock, Mail, Waves } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isFirebaseConfigured } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Attempting login with:', emailOrUsername);
      await login(emailOrUsername, password);
      console.log('Login successful, navigating to dashboard');
      router.replace('./(tabs)/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0891b2', '#0e7490', '#155e75']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Waves size={60} color="#ffffff" />
            <Text style={styles.title}>Surf Sense</Text>
            <Text style={styles.subtitle}>Connect. Track. Analyze.</Text>
            {isFirebaseConfigured && (
              <View style={styles.firebaseIndicator}>
                <View style={styles.firebaseDot} />
                <Text style={styles.firebaseText}>Cloud sync enabled</Text>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#0891b2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={isFirebaseConfigured ? "Email or Username" : "Username"}
                placeholderTextColor="#64748b"
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
                autoCapitalize="none"
                keyboardType={isFirebaseConfigured ? "email-address" : "default"}
                testID="email-username-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#0891b2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="password-input"
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              testID="login-button"
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('./(auth)/register')}
              testID="register-link"              
            >

              <Text style={styles.registerLinkText}>
                Don&apos;t have an account? <Text style={styles.registerLinkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#1e293b',
  },
  loginButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  registerLinkText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  registerLinkBold: {
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  firebaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  firebaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  firebaseText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
});