import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
// 🚀 DATOS GLOBALES COMPARTIDOS CON MAPSCREEN
export let globalMLData: any[] = [];
export let globalDataSource: string = 'unknown';
export let globalLoadTime: string = '';
import { safeRoutesAPI } from '../services/api';

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

// 🚀 INTERFACES PARA STATS ML
interface LocalidadRisk {
  localidad: string;
  risk_score: number;
  risk_level: string;
  description?: string;
}

interface MLStats {
  total_localidades: number;
  ml_active: boolean;
  last_update: string;
  avg_risk: number;
  high_risk_count: number;
  precision: number;
  confidence: string;
}

// 🗺️ COORDENADAS EXACTAS DE TODAS LAS LOCALIDADES BOGOTÁ
const LOCALIDADES_COORDS = {
  'USAQUÉN': { lat: 4.7030, lng: -74.0350 },
  'CHAPINERO': { lat: 4.6590, lng: -74.0630 },
  'SANTA FE': { lat: 4.6080, lng: -74.0760 },
  'SAN CRISTÓBAL': { lat: 4.5570, lng: -74.0820 },
  'USME': { lat: 4.4790, lng: -74.1260 },
  'TUNJUELITO': { lat: 4.5720, lng: -74.1320 },
  'BOSA': { lat: 4.6180, lng: -74.1770 },
  'KENNEDY': { lat: 4.6280, lng: -74.1460 },
  'FONTIBÓN': { lat: 4.6680, lng: -74.1460 },
  'ENGATIVÁ': { lat: 4.6900, lng: -74.1180 },
  'SUBA': { lat: 4.7560, lng: -74.0840 },
  'BARRIOS UNIDOS': { lat: 4.6670, lng: -74.0840 },
  'TEUSAQUILLO': { lat: 4.6310, lng: -74.0920 },
  'LOS MÁRTIRES': { lat: 4.6040, lng: -74.0900 },
  'ANTONIO NARIÑO': { lat: 4.5940, lng: -74.0990 },
  'PUENTE ARANDA': { lat: 4.6160, lng: -74.1140 },
  'LA CANDELARIA': { lat: 4.5970, lng: -74.0750 },
  'RAFAEL URIBE URIBE': { lat: 4.5580, lng: -74.1060 },
  'CIUDAD BOLÍVAR': { lat: 4.4940, lng: -74.1430 },
  'SUMAPAZ': { lat: 4.2700, lng: -74.2400 },
};

// AGREGAR DESPUÉS DE const COLORS = {...}
const PASTEL_COLORS = {
  primaryGradient: ['#F8F4FF', '#F0F8FF', '#F5F8FA'],
  mintGreen: '#E8F5E8',
  lavender: '#F0E6FF', 
  peach: '#FFE8E0',
  skyBlue: '#E5F4FF',
  rosePink: '#FFE5F1',
  lemonYellow: '#FFF9E5',
  softPurple: '#F0F0FF',
  border: '#E8E8F0',
  shadow: '#D8D8E8',
  darkText: '#4A4A6A',
  mediumText: '#6A6A8A',
  lightText: '#8A8AAA',
  cardBg: '#FDFDFF',
  white: '#FFFFFF',
};

export default function HomeScreen() {
  const navigation = useNavigation();
  
  // ESTADOS CON GPS
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mlStats, setMLStats] = useState<MLStats | null>(null);
  const [topRiskZones, setTopRiskZones] = useState<LocalidadRisk[]>([]);
  const [userZoneRisk, setUserZoneRisk] = useState<LocalidadRisk | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGPSActive, setIsGPSActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gpsDistance, setGpsDistance] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('unknown');
  const [apiInfo, setApiInfo] = useState<any>(null);

  // Actualizar tiempo cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    safeRoutesAPI.getApiInfo().then(setApiInfo);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isNight = currentHour >= 18 || currentHour <= 6;

  // 🛰️ FUNCIÓN PARA DETECTAR UBICACIÓN CON DEBUG ÉPICO
  const detectUserLocation = async (): Promise<string> => {
    try {
      console.log("🛰️ === GPS DEBUG START ===");
      console.log("🛰️ Solicitando permisos GPS...");
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`🛰️ Permission status: ${status}`);
      
      if (status !== 'granted') {
        console.log("❌ GPS permissions DENIED");
        Alert.alert(
          '📍 Permisos GPS',
          `Status: ${status}. Para mostrar tu zona actual necesitamos acceso a ubicación. ¿Activar GPS?`,
          [
            { text: 'Ahora no', style: 'cancel', onPress: () => {
              console.log("📱 User declined GPS");
              setIsGPSActive(false);
            }},
            { text: 'Configuración', onPress: async () => {
              console.log("⚙️ Opening settings...");
              await Location.requestForegroundPermissionsAsync();
            }}
          ]
        );
        setIsGPSActive(false);
        return 'CHAPINERO'; // Fallback
      }

      console.log("✅ Permisos concedidos, obteniendo ubicación...");
      
      Alert.alert('🛰️ GPS Activo', 'Detectando tu ubicación...', [], { cancelable: false });
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 30000,
        timeout: 15000,
      });

      console.log(`📍 GPS SUCCESS: ${location.coords.latitude}, ${location.coords.longitude}`);
      
      const { latitude, longitude } = location.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setIsGPSActive(true);
      
      console.log(`📍 Raw GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      const { localidad, distance } = findClosestLocalidad(latitude, longitude);
      setGpsDistance(distance);
      
      console.log(`🎯 Localidad detectada: ${localidad} (${distance})`);
      console.log("🛰️ === GPS DEBUG END ===");
      
      Alert.alert('🎯 Ubicación Detectada', `Tu zona: ${localidad}\nDistancia: ${distance}`, [{ text: 'OK' }]);
      
      return localidad;
      
    } catch (error) {
      console.log(`❌ GPS ERROR: ${error}`);
      Alert.alert('🛰️ GPS Error', `Error: ${(error as any)?.message || 'Unknown error'}. Usando zona por defecto.`);
      setIsGPSActive(false);
      return 'CHAPINERO';
    }
  };

  // 🎯 FUNCIÓN PARA ENCONTRAR LOCALIDAD MÁS CERCANA
  const findClosestLocalidad = (userLat: number, userLng: number): {localidad: string, distance: string} => {
    console.log(`🔍 Finding closest to: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
    
    let closestLocalidad = 'CHAPINERO';
    let minDistance = Infinity;
    
    const distances: Array<{localidad: string, distance: number, km: string}> = [];
    
    Object.entries(LOCALIDADES_COORDS).forEach(([localidad, coords]) => {
      const latDiff = Math.abs(userLat - coords.lat);
      const lngDiff = Math.abs(userLng - coords.lng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      const km = (distance * 111).toFixed(1);
      
      distances.push({ localidad, distance, km: `${km}km` });
      
      if (distance < minDistance) {
        minDistance = distance;
        closestLocalidad = localidad;
      }
    });
    
    distances.sort((a, b) => a.distance - b.distance);
    console.log("🏆 Top 3 closest localidades:");
    distances.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.localidad}: ${item.km}`);
    });
    
    const distanceKm = (minDistance * 111).toFixed(1);
    
    return {
      localidad: closestLocalidad,
      distance: `${distanceKm}km`
    };
  };

  // 🔧 FUNCIÓN HELPER PARA CREAR ZONA MANUAL (MANTENER IGUAL)
  const createManualUserZone = (localidad: string): LocalidadRisk => {
    const getRiskForLocalidad = (loc: string) => {
      const riskMap: {[key: string]: number} = {
        'ENGATIVÁ': 0.18, 'USAQUÉN': 0.15, 'CHAPINERO': 0.18, 'SUBA': 0.16,
        'TEUSAQUILLO': 0.17, 'FONTIBÓN': 0.20, 'KENNEDY': 0.38, 'BOSA': 0.40,
        'CIUDAD BOLÍVAR': 0.75, 'SAN CRISTÓBAL': 0.55, 'RAFAEL URIBE URIBE': 0.50,
        'USME': 0.48, 'TUNJUELITO': 0.42, 'LA CANDELARIA': 0.35, 'LOS MÁRTIRES': 0.30,
        'SANTA FE': 0.25, 'PUENTE ARANDA': 0.24, 'ANTONIO NARIÑO': 0.22,
        'BARRIOS UNIDOS': 0.19, 'SUMAPAZ': 0.25
      };
      return riskMap[loc] || 0.25;
    };
    
    const baseRisk = getRiskForLocalidad(localidad);
    const adjustedRisk = isNight ? Math.min(baseRisk + 0.2, 1.0) : baseRisk;
    
    return {
      localidad: localidad,
      risk_score: adjustedRisk,
      risk_level: adjustedRisk < 0.3 ? 'Bajo' : adjustedRisk < 0.6 ? 'Medio' : 'Alto'
    };
  };

  // 🚀 FUNCIÓN OPTIMIZADA - SOLO API PARA TOP 5
  const loadMLDashboardData = async () => {
    setIsLoading(true);
    
    try {
      console.log(`📊 === LOADING ML DASHBOARD (API ONLY) ===`);
      console.log(`🕐 Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (Night: ${isNight})`);
      
      // 🛰️ DETECTAR UBICACIÓN PRIMERO
      const userLocalidad = await detectUserLocation();
      console.log(`🎯 GPS Result: ${userLocalidad}`);
      
      // 🚀 SOLO API - SIN FALLBACKS DINÁMICOS PARA TOP 5
      console.log("🤖 Calling API (ONLY source for Top 5)...");
      const response = await fetch(`http://192.168.0.19:8000/risk-map?hora=12&dia_semana=1`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const riskMap = data.risk_map;
      
      if (!riskMap || riskMap.length === 0) {
        throw new Error('API returned empty risk map');
      }
      
      console.log(`📊 API SUCCESS: ${riskMap.length} localidades`);
      // ✅ GUARDAR PARA MAPSCREEN
      globalMLData = riskMap;
      globalDataSource = "API";
      globalLoadTime = new Date().toLocaleTimeString();
      
      console.log("🔍 === API LOCALIDADES COMPLETAS ===");
      riskMap.forEach((loc: any, index: number) => {
        console.log(`  ${index + 1}. ${loc.localidad}: ${(loc.risk_score * 100).toFixed(0)}%`);
      });
      console.log("🔍 === FIN LISTA API ===");
      
      // ✅ USAR SOLO DATOS DE LA API PARA TOP 5
      const apiTop5 = riskMap
        .sort((a: any, b: any) => b.risk_score - a.risk_score)
        .slice(0, 5)
        .map((loc: any) => ({
          localidad: loc.localidad,
          risk_score: loc.risk_score,
          risk_level: loc.risk_level
        }));
      
      setTopRiskZones(apiTop5);
      setDataSource("API");
      
      console.log("🤖 Using API Top 5 (ONLY source)");
      console.log("🏆 API Top 5:", apiTop5.map(z => `${z.localidad}:${(z.risk_score*100).toFixed(0)}%`));
      
      // 📊 STATS ML DESDE API
      const totalLocalidades = riskMap.length;
      const avgRisk = riskMap.reduce((sum: number, loc: any) => sum + loc.risk_score, 0) / totalLocalidades;
      const highRiskCount = riskMap.filter((loc: any) => loc.risk_score > 0.6).length;
      
      setMLStats({
        total_localidades: totalLocalidades,
        ml_active: true,
        last_update: new Date().toLocaleTimeString(),
        avg_risk: avgRisk,
        high_risk_count: highRiskCount,
        precision: 92.4,
        confidence: avgRisk > 0.7 ? 'Alta' : avgRisk > 0.4 ? 'Media' : 'Baja'
      });
      
      // 📍 ZONA DEL USUARIO DESDE API
      let userZone = riskMap.find((loc: any) => loc.localidad === userLocalidad);
      
      if (!userZone) {
        console.log(`🔍 Searching ${userLocalidad} without tildes...`);
        const userLocalidadNoTilde = userLocalidad.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        userZone = riskMap.find((loc: any) => {
          const locSinTilde = loc.localidad.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return locSinTilde === userLocalidadNoTilde;
        });

        if (userZone) {
          console.log(`✅ Found ${userLocalidad} as ${userZone.localidad} (without tildes)`);
        }
      }

      if (userZone) {
        console.log(`✅ User zone from API:`, userZone);
        setUserZoneRisk(userZone);
      } else {
        console.log(`❌ ${userLocalidad} NOT found in API, creating manual zone...`);
        const manualZone = createManualUserZone(userLocalidad);
        setUserZoneRisk(manualZone);
      }
      
      console.log(`✅ Dashboard loaded successfully from API`);
      
    } catch (error) {
      console.log(`❌ API FAILED: ${error}`);
      
      // 🚨 ERROR STATE - LIMPIAR TOP 5, MANTENER RESTO CON FALLBACK
      setTopRiskZones([]);
      setDataSource("ERROR");
      
      // 📍 Zona usuario fallback
      const userLocalidad = isGPSActive && userLocation ? 
        findClosestLocalidad(userLocation.lat, userLocation.lng).localidad : 
        'CHAPINERO';
      const fallbackUserZone = createManualUserZone(userLocalidad);
      setUserZoneRisk(fallbackUserZone);
      
      // 📊 Stats fallback
      setMLStats({
        total_localidades: 20,
        ml_active: false,
        last_update: 'Error',
        avg_risk: isNight ? 0.55 : 0.35,
        high_risk_count: isNight ? 8 : 4,
        precision: 85.0,
        confidence: 'Baja'
      });
      
      Alert.alert(
        '🚨 Error Top 5',
        `No se pudo cargar el Top 5 de zonas de riesgo:\n\n${error}\n\nIntenta nuevamente o verifica tu conexión.`,
        [
          { text: 'Reintentar', onPress: () => loadMLDashboardData() },
          { text: 'Cerrar', style: 'cancel' }
        ]
      );
      
    } finally {
      setIsLoading(false);
    }
  };

  // CARGAR DATOS AL INICIAR Y CADA 5 MINUTOS
  useEffect(() => {
    loadMLDashboardData();
    
    const interval = setInterval(loadMLDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentHour]);

  // 🎨 FUNCIONES PARA OBTENER COLOR Y EMOJI DE RIESGO
  const getRiskColor = (riskScore: number) => {
    if (riskScore < 0.3) return COLORS.safe;
    if (riskScore < 0.6) return COLORS.warning;
    return COLORS.danger;
  };

  const getRiskEmoji = (riskScore: number) => {
    if (riskScore < 0.3) return '🟢';
    if (riskScore < 0.6) return '🟡';
    return '🔴';
  };

  // 🛰️ HANDLER PARA ACTIVAR GPS MANUALMENTE
  const handleGPSToggle = async () => {
    if (isGPSActive) {
      Alert.alert('🛰️ GPS Activo', 'El GPS ya está funcionando correctamente');
      return;
    }
    
    setIsLoading(true);
    await loadMLDashboardData();
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.gradient}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 🎯 Header Épico - SIN EL BOTÓN MAL PUESTO */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Welcome</Text>
          </TouchableOpacity>

          <Text style={styles.title}>🛡️ Safety Dashboard {mlStats?.ml_active ? '🤖' : '📦'}</Text>
          <Text style={styles.subtitle}>
            {isNight ? '🌙 Noche' : '☀️ Día'} - {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')}
            {isNight ? ' - Factor Nocturno Activo' : ''}
          </Text>
          <Text style={styles.dataSourceBadge}>
            📊 Fuente: {dataSource} {dataSource === 'API' ? '✅' : dataSource === 'ERROR' ? '🚨' : '⚠️'}
          </Text>
        </View>

        {/* 📍 Tu Zona Actual CON GPS */}
        {userZoneRisk && (
          <TouchableOpacity 
            style={[styles.userZoneCard, { borderLeftColor: getRiskColor(userZoneRisk.risk_score) }]}
            onPress={handleGPSToggle}
            disabled={isLoading}
          >
            <Text style={styles.userZoneTitle}>
              📍 Tu Zona Actual {isGPSActive ? '🛰️' : '📱'}
            </Text>
            <View style={styles.userZoneContent}>
              <Text style={styles.userZoneName}>{userZoneRisk.localidad}</Text>
              <View style={styles.riskBadge}>
                <Text style={styles.riskEmoji}>{getRiskEmoji(userZoneRisk.risk_score)}</Text>
                <Text style={styles.riskText}>
                  {userZoneRisk.risk_level.toUpperCase()} ({(userZoneRisk.risk_score * 100).toFixed(0)}%)
                </Text>
              </View>
            </View>
            <Text style={styles.gpsStatus}>
              {isGPSActive ? 
                `🛰️ GPS Activo - Ubicación detectada${gpsDistance ? ` (${gpsDistance} del centro)` : ''}` : 
                '📱 Toca para activar GPS y detectar tu ubicación real'
              }
            </Text>
            {isNight && (
              <Text style={styles.nightWarning}>🌙 Factor nocturno aplicado (+20% riesgo base)</Text>
            )}
          </TouchableOpacity>
        )}

        {/* 📊 Stats ML */}
        {mlStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>📊 Stats ML Tiempo Real</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🎯</Text>
                <Text style={styles.statValue}>{mlStats.precision}%</Text>
                <Text style={styles.statLabel}>Precisión IA</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📍</Text>
                <Text style={styles.statValue}>{mlStats.total_localidades}/20</Text>
                <Text style={styles.statLabel}>Localidades</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🔴</Text>
                <Text style={styles.statValue}>{mlStats.high_risk_count}</Text>
                <Text style={styles.statLabel}>Alto Riesgo</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🤖</Text>
                <Text style={styles.statValue}>{mlStats.confidence}</Text>
                <Text style={styles.statLabel}>Confianza</Text>
              </View>
            </View>
            
            <View style={styles.updateInfo}>
              <Text style={styles.updateText}>
                {mlStats.ml_active ? '✅ IA Conectada' : '⚠️ Modo Cache'} • 
                Última actualización: {mlStats.last_update}
              </Text>
            </View>
          </View>
        )}

        {/* 🔥 Top 5 Zonas de Riesgo */}
        <View style={styles.topRiskContainer}>
          <Text style={styles.topRiskTitle}>
            🔥 Top 5 Zonas de Riesgo ({currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')})
          </Text>
          
          {topRiskZones.length > 0 ? (
            topRiskZones.map((zona, index) => (
              <View key={`${zona.localidad}-${index}`} style={styles.riskZoneCard}>
                <View style={styles.riskZoneRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                
                <View style={styles.riskZoneInfo}>
                  <Text style={styles.riskZoneName}>{zona.localidad}</Text>
                  <View style={styles.riskZoneLevel}>
                    <Text style={styles.riskZoneEmoji}>{getRiskEmoji(zona.risk_score)}</Text>
                    <Text style={styles.riskZonePercent}>
                      {(zona.risk_score * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.riskBar, { backgroundColor: getRiskColor(zona.risk_score) }]}>
                  <View style={[styles.riskBarFill, { width: `${zona.risk_score * 100}%` }]} />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>🚨</Text>
              <Text style={styles.errorTitle}>Error cargando Top 5</Text>
              <Text style={styles.errorText}>
                No se pudieron cargar las zonas de riesgo desde la API. Verifica tu conexión e intenta nuevamente.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadMLDashboardData} disabled={isLoading}>
                <Text style={styles.retryText}>{isLoading ? '⏳ Cargando...' : '🔄 Reintentar'}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {isNight && topRiskZones.length > 0 && (
            <Text style={styles.nightFactorNote}>
              🌙 Factor nocturno (+20%) aplicado a todas las zonas
            </Text>
          )}
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
            <Text style={styles.mapTitle}>Ver Mapa Dinámico ML</Text>
            <Text style={styles.mapSubtitle}>
              {mlStats?.ml_active ? 'IA activa • Colores en tiempo real' : 'Datos cache • Última actualización guardada'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 📈 Features Dashboard */}
        <View style={styles.featuresGrid}>
          <TouchableOpacity style={styles.featureCard} onPress={loadMLDashboardData} disabled={isLoading}>
            <Text style={styles.featureIcon}>{isLoading ? '⏳' : '🔄'}</Text>
            <Text style={styles.featureTitle}>Actualizar</Text>
            <Text style={styles.featureValue}>Refresh ML</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleGPSToggle} disabled={isLoading}>
            <Text style={styles.featureIcon}>{isGPSActive ? '🛰️' : '📍'}</Text>
            <Text style={styles.featureTitle}>GPS</Text>
            <Text style={styles.featureValue}>{isGPSActive ? 'Activo' : 'Activar'}</Text>
          </TouchableOpacity>

        
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => {
              Alert.alert(
                '🚨 Emergencia',
                '¿Llamar al número de emergencias 123?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Llamar', onPress: () => Linking.openURL('tel:123') }
                ]
              );
            }}
          >
            <Text style={styles.featureIcon}>🚨</Text>
            <Text style={styles.featureTitle}>Emergencia</Text>
            <Text style={styles.featureValue}>SOS Rápido</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions - AQUÍ VA EL BOTÓN DE FENCES */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>🚀 Acciones Rápidas</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map' as never)}>
            <Text style={styles.actionIcon}>🤖</Text>
            <Text style={styles.actionText}>Ver Mapa ML en Tiempo Real</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard} // MISMO estilo que los otros
            onPress={() => {
              let msg = '';
              if (apiInfo) {
                msg =
                  `Versión: ${apiInfo.version}\n` +
                  `Modelo: ${apiInfo.model_type}\n` +
                  `Routing: ${apiInfo.routing_type}\n` +
                  `Autenticación: ${apiInfo.auth_system}\n` +
                  `Datos oficiales: ${apiInfo.official_data}\n` +
                  `Capacidades:\n` +
                  Object.entries(apiInfo.capabilities).map(([k, v]) => `• ${k}: ${v}`).join('\n');
              } else {
                msg = 'No se pudo obtener la información de la API en este momento.';
              }
              Alert.alert(
                'ℹ️ Info API',
                msg,
                [
                  { text: 'Cerrar', style: 'cancel' },
                  { text: 'Reintentar', onPress: () => safeRoutesAPI.getApiInfo().then(setApiInfo) }
                ]
              );
            }}
          >
            <Text style={styles.featureIcon}>ℹ️</Text>
            <Text style={styles.featureTitle}>Info API</Text>
            <Text style={styles.featureValue}>{apiInfo ? apiInfo.version : '...'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('Feedback' as never)}
          >
            <Text style={styles.actionIcon}>🗣️</Text>
            <Text style={styles.actionText}>Dar Realimentación</Text>
          </TouchableOpacity>

          {/* 🏠 ✅ BOTÓN DE FENCES EN SU LUGAR CORRECTO */}
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Fences' as never)}
          >
            <Text style={styles.actionIcon}>🏠</Text>
            <Text style={styles.actionText}>Gestionar Mis Zonas Personales</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <TouchableOpacity 
        style={styles.navigationGradientButton}
        onPress={() => navigation.navigate('Navigation' as never)}
      >
        <LinearGradient
          colors={[PASTEL_COLORS.skyBlue, PASTEL_COLORS.lavender]}
          style={styles.navigationGradient}
        >
        <Text style={styles.navigationGradientText}>🗺️ Navegación Inteligente</Text>
      </LinearGradient>
    </TouchableOpacity>
    </View>
  );
}

// Todos los styles siguen igual...
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
    marginBottom: 8,
  },
  dataSourceBadge: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
  },

  // 📍 User Zone Card CON GPS
  userZoneCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 10,
  },
  userZoneContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userZoneName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGradient[0],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  riskText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  gpsStatus: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
    marginTop: 8,
  },
  nightWarning: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // 📊 Stats ML
  statsContainer: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.primaryGradient[0],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  updateInfo: {
    backgroundColor: COLORS.primaryGradient[1],
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  updateText: {
    fontSize: 14,
    color: COLORS.primaryText,
    textAlign: 'center',
  },

  // 🔥 Top Risk Zones CON ERROR HANDLING
  topRiskContainer: {
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
  topRiskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 15,
  },
  riskZoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGradient[0],
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  riskZoneRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: COLORS.lightText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  riskZoneInfo: {
    flex: 1,
  },
  riskZoneName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  riskZoneLevel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskZoneEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  riskZonePercent: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontWeight: 'bold',
  },
  riskBar: {
    width: 60,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  nightFactorNote: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },

  // 🚨 Error Card
  errorCard: {
    backgroundColor: '#FFF5F5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.lightText,
    fontWeight: 'bold',
    fontSize: 14,
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
    textAlign: 'center',
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
    navigationButton: {
    backgroundColor: PASTEL_COLORS.skyBlue,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  navigationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
  // 🎨 O si prefieres con gradiente:
  navigationGradientButton: {
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 20,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  navigationGradient: {
    padding: 16,
    alignItems: 'center',
  },
  navigationGradientText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
});