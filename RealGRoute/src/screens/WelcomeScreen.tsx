import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primaryGradient: ['#E8F4F8', '#F0F8FF', '#E6E6FA'],
  primaryText: '#2C3E50',
  secondaryText: '#5D6D7E',
  cardBg: '#FFFFFF',
  shadow: '#C8D6E5',
};

export default function WelcomeScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Transición automática después de 2 segundos
    const timer = setTimeout(() => {
      navigation.navigate('Login' as never);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.gradient}
      />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🧠</Text>
        </View>
        <Text style={styles.appName}>RealGRoute</Text>
        <Text style={styles.subtitle}>Navigate Safely in Bogotá</Text>
        <Text style={styles.version}>v3.0 - Intelligence + Auth Edition</Text>
      </View>
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
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: COLORS.secondaryText,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});