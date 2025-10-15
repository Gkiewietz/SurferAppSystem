import { useAuth } from '@/providers/auth-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Lock, Mail, MapPin, User, Waves } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, isFirebaseConfigured } = useAuth();
  const insets = useSafeAreaInsets();

  const handleRegister = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in username and password');
      return;
    }

    if (isFirebaseConfigured && !formData.email.trim()) {
      setError('Email is required for cloud sync');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Attempting registration for username:', formData.username);
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        location: formData.location,
      });
      console.log('Registration successful, navigating to dashboard');
      router.replace('./(tabs)/dashboard');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Waves size={50} color="#ffffff" />
              <Text style={styles.title}>Join Surf Sense</Text>
              <Text style={styles.subtitle}>Start tracking your sessions</Text>
              {isFirebaseConfigured && (
                <View style={styles.firebaseIndicator}>
                  <View style={styles.firebaseDot} />
                  <Text style={styles.firebaseText}>Cloud sync enabled</Text>
                </View>
              )}
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <User size={20} color="#0891b2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#64748b"
                  value={formData.username}
                  onChangeText={(value) => updateFormData('username', value)}
                  autoCapitalize="none"
                  testID="username-input"
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail size={20} color="#0891b2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isFirebaseConfigured ? "Email (required)" : "Email (optional)"}
                  placeholderTextColor="#64748b"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  testID="email-input"
                />
              </View>

              <View style={styles.inputContainer}>
                <MapPin size={20} color="#0891b2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Location (optional)"
                  placeholderTextColor="#64748b"
                  value={formData.location}
                  onChangeText={(value) => updateFormData('location', value)}
                  testID="location-input"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#0891b2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry
                  testID="password-input"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#0891b2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#64748b"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureTextEntry
                  testID="confirm-password-input"
                />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                testID="register-button"
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.back()}
                testID="login-link"
              >
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
    paddingBottom: 40,
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
  registerButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  loginLinkBold: {
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