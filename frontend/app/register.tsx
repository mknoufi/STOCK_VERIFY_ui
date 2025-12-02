import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { storage } from '../services/asyncStorageService';
import { useAuthStore } from '../store/authStore';
import { registerUser } from '../services/api';
import { AppLogo } from '../components/AppLogo';

export default function Register() {
  const [formData, setFormData] = React.useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    employee_id: '',
    phone: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    // Validation
    if (!formData.username || !formData.password || !formData.full_name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await registerUser({
        username: formData.username.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        employee_id: formData.employee_id.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      // Save token and user data
      await storage.set('token', response.token);
      await storage.set('user', response.user);

      // Update auth store
      useAuthStore.setState({
        token: response.token,
        user: response.user,
      });

      // Navigate based on role
      if (response.user.role === 'staff') {
        router.replace('/staff/home');
      } else {
        router.replace('/supervisor/dashboard');
      }
    } catch (error: any) {
      let errorMessage = 'Unable to register. Please try again.';

      // Use structured error message if available
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'object' && errorData.detail) {
          if (typeof errorData.detail === 'object' && errorData.detail.message) {
            errorMessage = errorData.detail.message;
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Provide helpful context
      if (errorMessage.includes('already exists') || errorMessage.includes('Username')) {
        errorMessage = 'Username already exists. Please choose a different username.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED')) {
        errorMessage = 'Connection timeout. Please check your connection and try again.';
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to server. Please check if the backend server is running.';
      }

      // Add fix button based on error type
      let fixButton: { text: string; onPress: () => void } | undefined;

      if (errorMessage.includes('already exists') || errorMessage.includes('Username')) {
        fixButton = {
          text: 'Choose Different Username',
          onPress: () => {
            setFormData({ ...formData, username: '' });
            // Focus will be handled by component state
          }
        };
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED')) {
        fixButton = {
          text: 'Retry Registration',
          onPress: () => {
            setTimeout(() => handleRegister(), 500);
          }
        };
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
        fixButton = {
          text: 'Check Connection & Retry',
          onPress: () => {
            setTimeout(() => handleRegister(), 1000);
          }
        };
      } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        fixButton = {
          text: 'Fix Form',
          onPress: () => {
            // Scroll to top or highlight required fields
            // Form validation will handle highlighting
          }
        };
      }

      Alert.alert(
        'Registration Failed',
        errorMessage,
        fixButton ? [
          { text: 'Cancel', style: 'cancel' },
          fixButton
        ] : [{ text: 'OK' }]
      );
      console.error('Registration error details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#0d0d0d', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <AppLogo size="medium" showText={true} variant="default" />
          <Text style={styles.subtitle}>Join the Stock Verification Team</Text>
        </View>

        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Username <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Enter username"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Employee ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.employee_id}
                onChangeText={(text) => setFormData({ ...formData, employee_id: text })}
                placeholder="Enter employee ID (optional)"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone number (optional)"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Re-enter password"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLinkButton}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    flexGrow: 1,
    ...(Platform.OS === 'web' ? {
      maxWidth: 500,
      width: '100%',
      alignSelf: 'center',
      paddingTop: 40,
      paddingBottom: 40,
    } : {}),
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: '#2a2a2a',
    ...(Platform.OS === 'web' ? {
      borderRadius: 12,
      marginTop: 20,
    } : {}),
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 8,
  },
  required: {
    color: '#FF5252',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    color: '#888',
    fontSize: 14,
  },
  loginLinkButton: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
