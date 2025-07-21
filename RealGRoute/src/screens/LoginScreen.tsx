import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { safeRoutesAPI, UserLogin, UserRegistration } from '../services/api';

const { width, height } = Dimensions.get('window');

// 🎨 Colores consistentes
const COLORS = {
  primaryGradient: ['#E8F4F8', '#F0F8FF', '#E6E6FA'],
  accent: '#7B68EE',
  secondary: '#98D8C8',
  primaryText: '#2C3E50',
  secondaryText: '#5D6D7E',
  lightText: '#FFFFFF',
  cardBg: '#FFFFFF',
  inputBg: '#F8F9FA',
  inputBorder: '#E9ECEF',
  error: '#FF6B6B',
  success: '#51CF66',
  shadow: '#C8D6E5',
};

export default function LoginScreen() {
  const navigation = useNavigation();
  
  // 🔄 Estados
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // 🔐 Login form
  const [loginData, setLoginData] = useState<UserLogin>({
    username: '',
    password: ''
  });
  
  // 🛡️ Register form
  const [registerData, setRegisterData] = useState<UserRegistration>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });

  // 🚀 Verificar auth existente
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log('🔍 Checking existing auth...');
      
      const authState = await safeRoutesAPI.getAuthState();
      
      if (authState.isAuthenticated) {
        console.log('✅ User already authenticated:', authState.user?.username);
        
        const isValid = await safeRoutesAPI.validateToken();
        
        if (isValid) {
          console.log('🚀 Redirecting to Home...');
          navigation.navigate('Home' as never);
          return;
        }
      }
      
      console.log('❌ No valid auth found');
    } catch (error) {
      console.log('⚠️ Auth check error:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  // 🔍 VALIDACIÓN DE EMAIL MEJORADA
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // 🔐 Manejar Login
  const handleLogin = async () => {
    if (!loginData.username.trim() || !loginData.password.trim()) {
      Alert.alert('❌ Error', 'Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 Attempting login...');
      
      const response = await safeRoutesAPI.login(loginData);
      
      console.log('✅ Login successful:', response.user.username);
      
      Alert.alert(
        '🎉 ¡Bienvenido!',
        `Hola ${response.user.full_name}`,
        [
          {
            text: 'Continuar',
            onPress: () => navigation.navigate('Home' as never)
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert(
        '🚨 Error de inicio de sesión',
        `${error}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🛡️ VALIDACIÓN Y REGISTER MEJORADOS
  const handleRegister = async () => {
    // 🔍 VALIDACIONES DETALLADAS
    if (!registerData.username.trim()) {
      Alert.alert('❌ Error', 'El nombre de usuario es requerido');
      return;
    }

    if (registerData.username.length < 3) {
      Alert.alert('❌ Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!registerData.email.trim()) {
      Alert.alert('❌ Error', 'El email es requerido');
      return;
    }

    if (!isValidEmail(registerData.email)) {
      Alert.alert('❌ Error', 'Por favor ingresa un email válido (ejemplo: usuario@email.com)');
      return;
    }

    if (!registerData.full_name.trim()) {
      Alert.alert('❌ Error', 'El nombre completo es requerido');
      return;
    }

    if (!registerData.password.trim()) {
      Alert.alert('❌ Error', 'La contraseña es requerida');
      return;
    }

    if (registerData.password.length < 6) {
      Alert.alert('❌ Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🛡️ Attempting registration...');
      console.log('📋 Registration data:', {
        username: registerData.username,
        email: registerData.email,
        full_name: registerData.full_name,
        phone: registerData.phone || 'N/A',
        password_length: registerData.password.length
      });
      
      const user = await safeRoutesAPI.register(registerData);
      
      console.log('✅ Registration successful:', user.username);
      
      Alert.alert(
        '🎉 ¡Registro exitoso!',
        `Bienvenido ${user.full_name}. Ahora puedes iniciar sesión.`,
        [
          {
            text: 'Iniciar Sesión',
            onPress: () => {
              setIsLogin(true);
              setLoginData({
                username: registerData.username,
                password: registerData.password
              });
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // 🔍 MANEJO ESPECÍFICO DE ERROR 422
      let errorMessage = 'Error desconocido en el registro';
      
      if (error instanceof Error) {
        if (error.message.includes('422')) {
          errorMessage = 'Error de validación:\n\n• Verifica que el email sea válido\n• El username debe ser único\n• Todos los campos obligatorios deben estar completos';
        } else if (error.message.includes('400')) {
          errorMessage = 'Datos inválidos. Verifica la información ingresada.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        '🚨 Error de registro',
        errorMessage,
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Pantalla de carga
  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={COLORS.primaryGradient} style={styles.gradient} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingIcon}>🛡️</Text>
          <Text style={styles.loadingTitle}>RealGRoute</Text>
          <Text style={styles.loadingText}>Verificando autenticación...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={COLORS.primaryGradient} style={styles.gradient} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 🎯 Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.appTitle}>RealGRoute</Text>
          <Text style={styles.appSubtitle}>Navigate Safely in Bogotá</Text>
        </View>

        {/* 🔄 Toggle Login/Register */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              Iniciar Sesión
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        {/* 📝 Form Container */}
        <View style={styles.formContainer}>
          {isLogin ? (
            // 🔐 LOGIN FORM
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>👤 Usuario</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu_usuario"
                  value={loginData.username}
                  onChangeText={(text) => setLoginData({...loginData, username: text})}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🔒 Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChangeText={(text) => setLoginData({...loginData, password: text})}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[COLORS.accent, '#9575CD']}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitText}>
                    {isLoading ? '⏳ Iniciando sesión...' : '🚀 Iniciar Sesión'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            // 🛡️ REGISTER FORM MEJORADO
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>👤 Usuario * (3+ caracteres)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="mi_usuario_unico"
                  value={registerData.username}
                  onChangeText={(text) => setRegisterData({...registerData, username: text.toLowerCase().trim()})}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📧 Email * (formato válido)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="mi@email.com"
                  value={registerData.email}
                  onChangeText={(text) => setRegisterData({...registerData, email: text.toLowerCase().trim()})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>👨‍💼 Nombre Completo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mi Nombre Completo"
                  value={registerData.full_name}
                  onChangeText={(text) => setRegisterData({...registerData, full_name: text})}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📱 Teléfono (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+57 300 123 4567"
                  value={registerData.phone}
                  onChangeText={(text) => setRegisterData({...registerData, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🔒 Contraseña * (6+ caracteres)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={registerData.password}
                  onChangeText={(text) => setRegisterData({...registerData, password: text})}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[COLORS.secondary, '#76C7C0']}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitText}>
                    {isLoading ? '⏳ Registrando...' : '🛡️ Crear Cuenta'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 💡 Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔐 Tus datos están protegidos con cifrado JWT
          </Text>
          <Text style={styles.footerSubtext}>
            v3.0 - Balanced Intelligence + Auth
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos iguales que antes...
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  
  // 🔄 Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.secondaryText,
  },

  // 🎯 Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },

  // 🔄 Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.accent,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondaryText,
  },
  toggleTextActive: {
    color: COLORS.lightText,
  },

  // 📝 Form
  formContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.primaryText,
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: COLORS.lightText,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 💡 Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.secondaryText,
    opacity: 0.7,
  },
});