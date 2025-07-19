import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primaryGradient: ['#E8F4F8', '#F0F8FF'],
  accent: '#7B68EE',
  primaryText: '#2C3E50',
  secondaryText: '#5D6D7E',
  lightText: '#FFFFFF',
  cardBg: '#FFFFFF',
  safe: '#51CF66',
  warning: '#FFE066',
  danger: '#FF6B6B',
  shadow: '#C8D6E5',
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour <= 6;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.gradient}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 🎯 Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Welcome</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>🛡️ Safety Dashboard</Text>
          <Text style={styles.subtitle}>
            {isNight ? '🌙 Noche' : '☀️ Día'} - {currentHour}:00
          </Text>
        </View>

        {/* 🚨 Status actual */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>📍 Estado Actual</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isNight ? COLORS.warning : COLORS.safe }]} />
            <Text style={styles.statusText}>
              {isNight ? 'Precaución Nocturna' : 'Condiciones Seguras'}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {isNight 
              ? 'Evita zonas poco iluminadas y mantente alerta'
              : 'Condiciones normales, mantén precauciones básicas'
            }
          </Text>
        </View>

        {/* 🗺️ Acceso al mapa */}
        <TouchableOpacity 
          style={styles.mapCard}
          onPress={() => navigation.navigate('Map' as never)}
        >
          <LinearGradient
            colors={[COLORS.accent, '#9575CD']}
            style={styles.mapGradient}
          >
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapTitle}>Ver Mapa Interactivo</Text>
            <Text style={styles.mapSubtitle}>Riesgo en tiempo real por zonas</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 📊 Features Dashboard */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureTitle}>IA Predictiva</Text>
            <Text style={styles.featureValue}>85% Precisión</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureTitle}>Alertas</Text>
            <Text style={styles.featureValue}>24/7 Activo</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🚨</Text>
            <Text style={styles.featureTitle}>Emergencia</Text>
            <Text style={styles.featureValue}>SOS Rápido</Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureTitle}>Ubicación</Text>
            <Text style={styles.featureValue}>GPS Activo</Text>
          </View>
        </View>

        {/* 🎯 Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>🚀 Acciones Rápidas</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Analizar Zona</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🛣️</Text>
            <Text style={styles.actionText}>Planear Ruta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>Contactos de Emergencia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingTop: 50,
  },
  
  // 🎯 Header
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: COLORS.primaryText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondaryText,
  },

  // 🚨 Status
  statusCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.secondaryText,
    lineHeight: 20,
  },

  // 🗺️ Map Card
  mapCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  mapGradient: {
    padding: 24,
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.lightText,
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: COLORS.lightText,
    opacity: 0.9,
  },

  // 📊 Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: COLORS.cardBg,
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  featureValue: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },

  // 🚀 Actions
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: COLORS.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontWeight: '500',
  },
});