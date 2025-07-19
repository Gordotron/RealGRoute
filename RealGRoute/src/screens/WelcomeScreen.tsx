import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// 🎨 Paleta de colores pálidos contrastantes
const COLORS = {
  primaryGradient: ['#E8F4F8', '#F0F8FF', '#E6E6FA'],
  accent: '#7B68EE',
  secondary: '#98D8C8',
  tertiary: '#FFE4E6',
  primaryText: '#2C3E50',
  secondaryText: '#5D6D7E',
  lightText: '#FFFFFF',
  cardBg: '#FFFFFF',
  buttonBg: '#7B68EE',
  shadow: '#C8D6E5',
};

export default function WelcomeScreen() {
  const navigation = useNavigation();
  
  // 🎬 Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🚀 Secuencia de animaciones épica
    Animated.sequence([
      // Fade in principal
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Slide up del contenido
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Aparición del botón
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Home' as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* 🌈 Gradiente de fondo */}
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 🛡️ Contenido principal */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* 🎯 Logo y título */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🛡️</Text>
          </View>
          <Text style={styles.appName}>RealGRoute</Text>
          <Text style={styles.subtitle}>Navigate Safely in Bogotá</Text>
        </View>

        {/* ✨ Características principales */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🤖</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>AI-Powered Predictions</Text>
              <Text style={styles.featureText}>Real-time crime risk analysis</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🗺️</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Smart Routes</Text>
              <Text style={styles.featureText}>Safest paths to your destination</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📱</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Live Monitoring</Text>
              <Text style={styles.featureText}>24/7 safety companion</Text>
            </View>
          </View>
        </View>

        {/* 🎨 Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Your Urban Safety Companion</Text>
        </View>
      </Animated.View>

      {/* 🚀 Botón de inicio */}
      <Animated.View
        style={[
          styles.buttonContainer,
          { opacity: buttonAnim, transform: [{ scale: buttonAnim }] },
        ]}
      >
        <TouchableOpacity style={styles.startButton} onPress={handleGetStarted}>
          <LinearGradient
            colors={[COLORS.buttonBg, COLORS.accent]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Start Navigation 🚀</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  
  // 🛡️ Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.secondaryText,
    textAlign: 'center',
    fontWeight: '300',
  },

  // ✨ Features
  featuresContainer: {
    width: '100%',
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },

  // 🎨 Tagline
  taglineContainer: {
    backgroundColor: COLORS.tertiary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontWeight: '500',
    textAlign: 'center',
  },

  // 🚀 Button
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.lightText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});