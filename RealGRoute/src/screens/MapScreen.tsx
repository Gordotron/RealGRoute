import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// 🎨 Colores épicos
const COLORS = {
  primaryGradient: ['#E8F4F8', '#F0F8FF'],
  accent: '#7B68EE',
  danger: '#FF6B6B',
  warning: '#FFE066',
  safe: '#51CF66',
  primaryText: '#2C3E50',
  lightText: '#FFFFFF',
  cardBg: '#FFFFFF',
  shadow: '#C8D6E5',
};

// 📍 TODAS LAS 20 LOCALIDADES DE BOGOTÁ CON COORDENADAS PRECISAS Y RIESGO BASE
const BOGOTA_LOCALIDADES = [
  {
    id: 1,
    name: 'USAQUÉN',
    latitude: 4.7030,
    longitude: -74.0350,
    riskScore: 0.15,
    description: 'Zona norte segura y comercial',
  },
  {
    id: 2,
    name: 'CHAPINERO',
    latitude: 4.6590,
    longitude: -74.0630,
    riskScore: 0.18,
    description: 'Zona comercial y residencial segura',
  },
  {
    id: 3,
    name: 'SANTA FE',
    latitude: 4.6080,
    longitude: -74.0760,
    riskScore: 0.25,
    description: 'Centro histórico con precaución nocturna',
  },
  {
    id: 4,
    name: 'SAN CRISTÓBAL',
    latitude: 4.5570,
    longitude: -74.0820,
    riskScore: 0.55,
    description: 'Zona sur con vigilancia moderada',
  },
  {
    id: 5,
    name: 'USME',
    latitude: 4.4790,
    longitude: -74.1260,
    riskScore: 0.48,
    description: 'Periferia sur con precaución',
  },
  {
    id: 6,
    name: 'TUNJUELITO',
    latitude: 4.5720,
    longitude: -74.1320,
    riskScore: 0.42,
    description: 'Zona residencial sur',
  },
  {
    id: 7,
    name: 'BOSA',
    latitude: 4.6180,
    longitude: -74.1770,
    riskScore: 0.40,
    description: 'Zona residencial occidental',
  },
  {
    id: 8,
    name: 'KENNEDY',
    latitude: 4.6280,
    longitude: -74.1460,
    riskScore: 0.38,
    description: 'Gran localidad occidental',
  },
  {
    id: 9,
    name: 'FONTIBÓN',
    latitude: 4.6680,
    longitude: -74.1460,
    riskScore: 0.20,
    description: 'Zona aeroportuaria segura',
  },
  {
    id: 10,
    name: 'ENGATIVÁ',
    latitude: 4.6900,
    longitude: -74.1180,
    riskScore: 0.18,
    description: 'Zona noroccidental segura',
  },
  {
    id: 11,
    name: 'SUBA',
    latitude: 4.7560,
    longitude: -74.0840,
    riskScore: 0.16,
    description: 'Zona norte residencial tranquila',
  },
  {
    id: 12,
    name: 'BARRIOS UNIDOS',
    latitude: 4.6670,
    longitude: -74.0840,
    riskScore: 0.19,
    description: 'Zona central norte',
  },
  {
    id: 13,
    name: 'TEUSAQUILLO',
    latitude: 4.6310,
    longitude: -74.0920,
    riskScore: 0.17,
    description: 'Zona central segura',
  },
  {
    id: 14,
    name: 'LOS MÁRTIRES',
    latitude: 4.6040,
    longitude: -74.0900,
    riskScore: 0.30,
    description: 'Centro con precaución',
  },
  {
    id: 15,
    name: 'ANTONIO NARIÑO',
    latitude: 4.5940,
    longitude: -74.0990,
    riskScore: 0.22,
    description: 'Zona central sur',
  },
  {
    id: 16,
    name: 'PUENTE ARANDA',
    latitude: 4.6160,
    longitude: -74.1140,
    riskScore: 0.24,
    description: 'Zona industrial y comercial',
  },
  {
    id: 17,
    name: 'LA CANDELARIA',
    latitude: 4.5970,
    longitude: -74.0750,
    riskScore: 0.35,
    description: 'Centro histórico turístico',
  },
  {
    id: 18,
    name: 'RAFAEL URIBE URIBE',
    latitude: 4.5580,
    longitude: -74.1060,
    riskScore: 0.50,
    description: 'Zona suroriental',
  },
  {
    id: 19,
    name: 'CIUDAD BOLÍVAR',
    latitude: 4.4940,
    longitude: -74.1430,
    riskScore: 0.75,
    description: 'Zona sur con alto riesgo nocturno',
  },
  {
    id: 20,
    name: 'SUMAPAZ',
    latitude: 4.2700,
    longitude: -74.2400,
    riskScore: 0.25,
    description: 'Zona rural montañosa',
  },
];

// 🗺️ Estilo de mapa MEJORADO con más detalles
const mapStyleDetailed = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#f8f8f8"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#333333"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#ffffff"}, {"weight": 2}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#d9d9d9"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#f5f5f5"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#cccccc"}, {"weight": 1}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#a3ccff"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{"color": "#c8e6c9"}]
  }
];

export default function MapScreen() {
  const navigation = useNavigation();
  const [selectedZone, setSelectedZone] = useState(null);
  
  // ⏰ HORA CORRECTA COLOMBIA (UTC-5)
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto
    
    return () => clearInterval(timer);
  }, []);
  
  // Hora de Colombia (UTC-5)
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isNight = currentHour >= 18 || currentHour <= 6;

  // 🎯 Función para obtener color según riesgo - CORREGIDA
  const getRiskColor = (riskScore: number) => {
    // 🚀 APLICAR FACTOR NOCTURNO AQUÍ UNA SOLA VEZ
    let adjustedScore = riskScore;
    if (isNight) {
      adjustedScore = Math.min(riskScore + 0.2, 1.0); // +20% nocturno, máximo 100%
    }
    
    console.log(`🎨 Color for ${riskScore.toFixed(3)} -> ${adjustedScore.toFixed(3)} (night: ${isNight})`);
    
    if (adjustedScore < 0.3) return COLORS.safe;
    if (adjustedScore < 0.6) return COLORS.warning;
    return COLORS.danger;
  };

  // 🎯 Función para obtener texto de riesgo - CORREGIDA
  const getRiskText = (riskScore: number) => {
    // 🚀 APLICAR FACTOR NOCTURNO AQUÍ UNA SOLA VEZ
    let adjustedScore = riskScore;
    if (isNight) {
      adjustedScore = Math.min(riskScore + 0.2, 1.0);
    }
    
    console.log(`📝 Text for ${riskScore.toFixed(3)} -> ${adjustedScore.toFixed(3)} (night: ${isNight})`);
    
    if (adjustedScore < 0.3) return 'SEGURO';
    if (adjustedScore < 0.6) return 'PRECAUCIÓN';
    return 'ALTO RIESGO';
  };

  // 🎯 Función para obtener score ajustado (para mostrar en UI)
  const getAdjustedScore = (riskScore: number) => {
    let adjustedScore = riskScore;
    if (isNight) {
      adjustedScore = Math.min(riskScore + 0.2, 1.0);
    }
    return adjustedScore;
  };

  // 🎯 Manejo de selección de zona - CORREGIDO
  const handleZonePress = (localidad) => {
    setSelectedZone(localidad);
    
    // 🚀 CALCULAR UNA SOLA VEZ EL SCORE AJUSTADO
    const adjustedScore = getAdjustedScore(localidad.riskScore);
    const riskText = getRiskText(localidad.riskScore);
    const displayScore = Math.min(adjustedScore * 100, 100).toFixed(0);

    console.log(`🔍 Zone pressed: ${localidad.name}`);
    console.log(`  Base risk: ${localidad.riskScore.toFixed(3)}`);
    console.log(`  Adjusted: ${adjustedScore.toFixed(3)}`);
    console.log(`  Display: ${displayScore}%`);
    console.log(`  Level: ${riskText}`);
    console.log(`  Night: ${isNight}`);

    Alert.alert(
      `📍 ${localidad.name}`,
      `🛡️ Nivel: ${riskText}\n📊 Score: ${displayScore}%\n🕐 Hora: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}\n${isNight ? '🌙 Factor nocturno aplicado (+20%)\n' : '☀️ Horario diurno\n'}📝 ${localidad.description}`,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Navegar Aquí', 
          onPress: () => {
            Alert.alert('🚧 Próximamente', 'Navegación inteligente en desarrollo');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 🗺️ Mapa principal CON MÁS DETALLE */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyleDetailed}
        initialRegion={{
          latitude: 4.6097,
          longitude: -74.0817,
          latitudeDelta: 0.25, // Más zoom para ver calles
          longitudeDelta: 0.25, // Más zoom para ver calles
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={false}
        showsBuildings={true} // Mostrar edificios
        showsPointsOfInterest={true} // Mostrar puntos de interés
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {/* 📍 TODAS LAS 20 LOCALIDADES con círculos de riesgo */}
        {BOGOTA_LOCALIDADES.map((localidad) => {
          // 🚀 CALCULAR COLOR Y SCORE AJUSTADO UNA SOLA VEZ
          const adjustedScore = getAdjustedScore(localidad.riskScore);
          const circleColor = getRiskColor(localidad.riskScore);
          
          return (
            <React.Fragment key={localidad.id}>
              {/* Círculo de riesgo */}
              <Circle
                center={{
                  latitude: localidad.latitude,
                  longitude: localidad.longitude,
                }}
                radius={1500} // 1.5km radius
                fillColor={`${circleColor}20`} // Transparente
                strokeColor={circleColor}
                strokeWidth={2}
              />
              
              {/* Marcador principal */}
              <Marker
                coordinate={{
                  latitude: localidad.latitude,
                  longitude: localidad.longitude,
                }}
                onPress={() => handleZonePress(localidad)}
                title={localidad.name}
                description={`${getRiskText(localidad.riskScore)} (${(adjustedScore * 100).toFixed(0)}%)`}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* 🎨 Header con gradiente */}
      <LinearGradient
        colors={[COLORS.primaryGradient[0], 'transparent']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🗺️ Mapa de Riesgo</Text>
          <Text style={styles.headerSubtitle}>
            Colombia: {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')} {isNight ? '🌙' : '☀️'}
            {isNight ? ' - Factor Nocturno Activo' : ' - Horario Diurno'}
          </Text>
        </View>
      </LinearGradient>

      {/* 📊 Panel de leyenda MEJORADO CON CONSISTENCIA */}
      <View style={styles.legendPanel}>
        <Text style={styles.legendTitle}>🛡️ Niveles de Riesgo</Text>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.safe }]} />
          <Text style={styles.legendText}>Seguro (0-30%)</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Precaución (30-60%)</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.legendText}>Alto Riesgo (60%+)</Text>
        </View>
        
        <Text style={styles.legendFooter}>
          {isNight ? '🌙 +20% riesgo nocturno aplicado' : '☀️ Valores base diurnos'}
        </Text>
      </View>

      {/* 🚀 Botón de acción flotante CON DEBUG */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => {
          // 🔍 DEBUG INFO
          const engativa = BOGOTA_LOCALIDADES.find(l => l.name === 'ENGATIVÁ');
          if (engativa) {
            const adjustedScore = getAdjustedScore(engativa.riskScore);
            Alert.alert(
              '🔍 Debug ENGATIVÁ',
              `Base: ${(engativa.riskScore * 100).toFixed(0)}%\nAjustado: ${(adjustedScore * 100).toFixed(0)}%\nNoche: ${isNight}\nNivel: ${getRiskText(engativa.riskScore)}\nColor: ${getRiskColor(engativa.riskScore) === COLORS.safe ? '🟢' : getRiskColor(engativa.riskScore) === COLORS.warning ? '🟡' : '🔴'}`
            );
          }
        }}
      >
        <LinearGradient
          colors={[COLORS.accent, '#9575CD']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>🔍</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* 📍 Contador de localidades */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>20 Localidades</Text>
        <Text style={styles.counterSubtext}>{isNight ? '🌙 Nocturno' : '☀️ Diurno'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  
  // 🎨 Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
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
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.primaryText,
    opacity: 0.8,
    textAlign: 'center',
  },

  // 📊 Leyenda MEJORADA
  legendPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 200,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: COLORS.primaryText,
  },
  legendFooter: {
    fontSize: 12,
    color: COLORS.primaryText,
    opacity: 0.7,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // 🚀 FAB
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 24,
  },

  // 📍 Counter Badge ACTUALIZADO
  counterBadge: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
  },
  counterText: {
    color: COLORS.lightText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  counterSubtext: {
    color: COLORS.lightText,
    fontSize: 10,
    opacity: 0.8,
  },
});