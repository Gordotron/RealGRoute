import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { safeRoutesAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// 🌸 COLORES PASTEL HERMOSOS
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
  
  // 🎯 COLORES ESPECÍFICOS PARA NAVEGACIÓN
  safetyGreen: '#E8F5E8',
  safetyGreenBorder: '#B3F0B3',
  speedBlue: '#E5F4FF',
  speedBlueBorder: '#B3D9FF',
  riskRed: '#FFE5E5',
  riskRedBorder: '#FFB3B3',
};

// 🎨 TIPOS DE PREFERENCIA
const PREFERENCIAS = {
  seguridad: {
    icon: '🛡️',
    name: 'Seguridad',
    color: PASTEL_COLORS.safetyGreen,
    borderColor: PASTEL_COLORS.safetyGreenBorder,
    description: 'Prioriza rutas más seguras'
  },
  tiempo: {
    icon: '⚡',
    name: 'Tiempo',
    color: PASTEL_COLORS.speedBlue,
    borderColor: PASTEL_COLORS.speedBlueBorder,
    description: 'Prioriza rutas más rápidas'
  }
};

// 🛣️ INTERFACE PARA UBICACIÓN
interface LocationPoint {
  lat: number;
  lng: number;
  address?: string;
  timestamp?: number;
}

// 🛣️ INTERFACE PARA RUTA
interface RouteData {
  route_points: Array<{ lat: number; lng: number; risk_level?: string }>;
  statistics: {
    distancia?: number;
    tiempo?: number;
    risk_score?: number;
  };
  recommendations: string[];
  origin_info: {
    risk_score: number;
    zone_type: string;
  };
  destination_info: {
    risk_score: number;
    zone_type: string;
  };
}

export default function NavigationScreen() {
  const navigation = useNavigation();
  
  // 🔄 Estados principales
  const [origen, setOrigen] = useState<LocationPoint | null>(null);
  const [destino, setDestino] = useState<LocationPoint | null>(null);
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [preferencia, setPreferencia] = useState<'seguridad' | 'tiempo'>('seguridad');
  const [sensibilidadRiesgo, setSensibilidadRiesgo] = useState(0.6);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  
  // 🗺️ Estado del mapa
  const [mapRegion, setMapRegion] = useState({
    latitude: 4.6097,
    longitude: -74.0817,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  // 🛰️ Inicializar GPS al cargar
  useEffect(() => {
    initializeLocation();
  }, []);

  // 🛰️ Inicializar ubicación GPS
  const initializeLocation = async () => {
    try {
      console.log('🛰️ Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        console.log('✅ Location permissions granted');
        getCurrentLocation();
      } else {
        console.log('❌ Location permissions denied');
        Alert.alert(
          '📍 Permisos de Ubicación',
          'Para una mejor experiencia, permite el acceso a tu ubicación',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting location:', error);
    }
  };

  // 📍 Obtener ubicación actual
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('🛰️ Getting current location...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 30000,
        timeout: 10000,
      });
      
      const { latitude, longitude } = location.coords;
      console.log(`📍 Current location: ${latitude}, ${longitude}`);
      
      // Validar que esté en Bogotá (aproximadamente)
      if (latitude >= 4.0 && latitude <= 5.0 && longitude >= -75.0 && longitude <= -73.0) {
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        console.log('✅ Location updated to current position');
      } else {
        console.log('⚠️ Location outside Bogotá bounds, using default');
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      Alert.alert('📍 Error GPS', 'No se pudo obtener tu ubicación actual');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 🗺️ Manejar toque en el mapa
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    console.log(`🗺️ Map pressed at: ${latitude}, ${longitude}`);
    
    // Validar que esté dentro de Bogotá
    if (latitude < 4.0 || latitude > 5.0 || longitude < -75.0 || longitude > -73.0) {
      Alert.alert(
        '🗺️ Fuera de Cobertura', 
        'Por favor selecciona un punto dentro de Bogotá'
      );
      return;
    }

    const newPoint: LocationPoint = {
      lat: latitude,
      lng: longitude,
      timestamp: Date.now()
    };

    if (isSelectingOrigin) {
      setOrigen(newPoint);
      setIsSelectingOrigin(false);
      Alert.alert(
        '✅ Origen Seleccionado',
        `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        [{ text: 'Perfecto' }]
      );
    } else if (isSelectingDestination) {
      setDestino(newPoint);
      setIsSelectingDestination(false);
      Alert.alert(
        '✅ Destino Seleccionado',
        `🎯 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        [{ text: 'Perfecto' }]
      );
    }
  };

  // 🚀 Calcular ruta inteligente
  const calculateRoute = async () => {
    if (!origen || !destino) {
      Alert.alert(
        '📍 Puntos Requeridos', 
        'Por favor selecciona origen y destino en el mapa'
      );
      return;
    }

    // Validar distancia mínima
    const distance = Math.sqrt(
      Math.pow(origen.lat - destino.lat, 2) + 
      Math.pow(origen.lng - destino.lng, 2)
    );

    if (distance < 0.001) {
      Alert.alert(
        '🤔 Puntos Muy Cercanos', 
        'El origen y destino están muy cerca. Selecciona puntos más distantes.'
      );
      return;
    }

    try {
      setIsCalculating(true);
      console.log('🛣️ Calculating intelligent route...');

      const routeRequest = {
        origen_lat: origen.lat,
        origen_lng: origen.lng,
        destino_lat: destino.lat,
        destino_lng: destino.lng,
        hora: new Date().getHours(),
        dia_semana: new Date().getDay() || 7,
        preferencia: preferencia,
        sensibilidad_riesgo: sensibilidadRiesgo
      };

      console.log('📋 Route request:', routeRequest);
      const response = await safeRoutesAPI.getIntelligentRoute(routeRequest);
      
      console.log('✅ Route calculated successfully');
      setRouteData(response);

      // 🎯 Ajustar vista del mapa a la ruta
      if (response.route_points && response.route_points.length > 0) {
        const lats = response.route_points.map(p => p.lat);
        const lngs = response.route_points.map(p => p.lng);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        setMapRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: (maxLat - minLat) * 1.3,
          longitudeDelta: (maxLng - minLng) * 1.3,
        });
      }

      Alert.alert(
        '🎉 Ruta Calculada',
        'Tu ruta inteligente está lista. Revisa las estadísticas y recomendaciones.',
        [{ text: 'Ver Ruta' }]
      );
      const response12 = await safeRoutesAPI.getIntelligentRoute(routeRequest);
      console.log('🔍 RouteData response:', response12); // <--- AGREGA ESTA LÍNEA
      setRouteData(response12);

    } catch (error) {
      console.error('❌ Error calculating route:', error);
      Alert.alert(
        '❌ Error de Conexión', 
        `No se pudo calcular la ruta: ${error}`
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // 🔄 Auto-calcular cuando cambian parámetros
  useEffect(() => {
    if (origen && destino) {
      const timer = setTimeout(() => {
        calculateRoute();
      }, 1500); // Debounce de 1.5 segundos
      
      return () => clearTimeout(timer);
    }
  }, [origen, destino, preferencia, sensibilidadRiesgo]);

  // 🎨 Render selector de puntos
  const renderPointSelector = () => (
    <View style={styles.pointSelectorContainer}>
      <Text style={styles.sectionTitle}>📍 Selecciona Origen y Destino</Text>
      
      {/* 🚀 Origen */}
      <View style={styles.pointCard}>
        <TouchableOpacity
          style={[
            styles.pointButton,
            isSelectingOrigin && styles.pointButtonActive,
            origen && styles.pointButtonSelected
          ]}
          onPress={() => {
            setIsSelectingOrigin(true);
            setIsSelectingDestination(false);
            Alert.alert(
              '📍 Modo Origen',
              'Ahora toca cualquier punto en el mapa para seleccionar tu origen',
              [{ text: 'Entendido' }]
            );
          }}
        >
          <Text style={styles.pointIcon}>🚀</Text>
          <View style={styles.pointDetails}>
            <Text style={styles.pointTitle}>
              {origen ? 'Origen Seleccionado' : 'Seleccionar Origen'}
            </Text>
            {origen ? (
              <Text style={styles.pointCoords}>
                📍 {origen.lat.toFixed(4)}, {origen.lng.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.pointHint}>Toca aquí y luego en el mapa</Text>
            )}
          </View>
          {origen && (
            <TouchableOpacity 
              style={styles.clearPointButton}
              onPress={(e) => {
                e.stopPropagation();
                setOrigen(null);
                setRouteData(null);
              }}
            >
              <Text style={styles.clearPointIcon}>❌</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* 🎯 Destino */}
      <View style={styles.pointCard}>
        <TouchableOpacity
          style={[
            styles.pointButton,
            isSelectingDestination && styles.pointButtonActive,
            destino && styles.pointButtonSelected
          ]}
          onPress={() => {
            setIsSelectingDestination(true);
            setIsSelectingOrigin(false);
            Alert.alert(
              '🎯 Modo Destino',
              'Ahora toca cualquier punto en el mapa para seleccionar tu destino',
              [{ text: 'Entendido' }]
            );
          }}
        >
          <Text style={styles.pointIcon}>🎯</Text>
          <View style={styles.pointDetails}>
            <Text style={styles.pointTitle}>
              {destino ? 'Destino Seleccionado' : 'Seleccionar Destino'}
            </Text>
            {destino ? (
              <Text style={styles.pointCoords}>
                🎯 {destino.lat.toFixed(4)}, {destino.lng.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.pointHint}>Toca aquí y luego en el mapa</Text>
            )}
          </View>
          {destino && (
            <TouchableOpacity 
              style={styles.clearPointButton}
              onPress={(e) => {
                e.stopPropagation();
                setDestino(null);
                setRouteData(null);
              }}
            >
              <Text style={styles.clearPointIcon}>❌</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* 📊 Estado de selección activa */}
      {(isSelectingOrigin || isSelectingDestination) && (
        <View style={styles.activeSelectionCard}>
          <Text style={styles.activeSelectionTitle}>
            {isSelectingOrigin ? '📍 Seleccionando ORIGEN' : '🎯 Seleccionando DESTINO'}
          </Text>
          <Text style={styles.activeSelectionHint}>
            👆 Toca cualquier punto en el mapa de abajo
          </Text>
          <TouchableOpacity 
            style={styles.cancelSelectionButton}
            onPress={() => {
              setIsSelectingOrigin(false);
              setIsSelectingDestination(false);
            }}
          >
            <Text style={styles.cancelSelectionText}>❌ Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🛰️ Botón GPS */}
      <TouchableOpacity 
        style={styles.gpsButton}
        onPress={getCurrentLocation}
        disabled={!hasLocationPermission || isLoadingLocation}
      >
        {isLoadingLocation ? (
          <ActivityIndicator size="small" color={PASTEL_COLORS.darkText} />
        ) : (
          <Text style={styles.gpsIcon}>🛰️</Text>
        )}
        <Text style={styles.gpsText}>
          {isLoadingLocation ? 'Obteniendo GPS...' : 'Centrar en mi ubicación'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 🎯 Render selector de preferencias
  const renderPreferences = () => (
    <View style={styles.preferencesContainer}>
      <Text style={styles.sectionTitle}>🎯 Preferencia de Ruta</Text>
      
      <View style={styles.preferencesToggle}>
        {Object.entries(PREFERENCIAS).map(([key, pref]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.preferenceButton,
              {
                backgroundColor: preferencia === key ? pref.color : PASTEL_COLORS.cardBg,
                borderColor: preferencia === key ? pref.borderColor : PASTEL_COLORS.border,
              }
            ]}
            onPress={() => setPreferencia(key as 'seguridad' | 'tiempo')}
          >
            <Text style={styles.preferenceIcon}>{pref.icon}</Text>
            <Text style={styles.preferenceName}>{pref.name}</Text>
            <Text style={styles.preferenceDesc}>{pref.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 📏 Render slider de sensibilidad
  const renderSensitivitySlider = () => (
    <View style={styles.sliderContainer}>
      <Text style={styles.sectionTitle}>
        📊 Sensibilidad de Riesgo: {Math.round(sensibilidadRiesgo * 100)}%
      </Text>
      
      <Slider
        style={styles.slider}
        minimumValue={0.0}
        maximumValue={1.0}
        value={sensibilidadRiesgo}
        onValueChange={setSensibilidadRiesgo}
        minimumTrackTintColor={PREFERENCIAS[preferencia].borderColor}
        maximumTrackTintColor={PASTEL_COLORS.border}
        thumbTintColor={PASTEL_COLORS.darkText}
      />
      
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>🟢 Flexible</Text>
        <Text style={styles.sliderLabel}>🔴 Estricto</Text>
      </View>
      
      <Text style={styles.sliderDescription}>
        {sensibilidadRiesgo < 0.3 ? '🟢 Acepta rutas con riesgo moderado por conveniencia' :
         sensibilidadRiesgo < 0.7 ? '🟡 Balance entre seguridad y conveniencia' :
         '🔴 Máxima prioridad a la seguridad'}
      </Text>
    </View>
  );

  // 🗺️ Render mapa interactivo
  const renderInteractiveMap = () => (
    <View style={styles.mapContainer}>
      <Text style={styles.sectionTitle}>🗺️ Mapa Interactivo</Text>
      
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          onPress={handleMapPress}
          mapType="standard"
          showsTraffic={false}
          showsBuildings={true}
        >
          {/* 📍 Marcador de origen */}
          {origen && (
            <Marker
              coordinate={{ latitude: origen.lat, longitude: origen.lng }}
              title="🚀 Origen"
              description={`Inicio de tu ruta - ${origen.lat.toFixed(4)}, ${origen.lng.toFixed(4)}`}
              pinColor="green"
              anchor={{ x: 0.5, y: 1 }}
            />
          )}

          {/* 🎯 Marcador de destino */}
          {destino && (
            <Marker
              coordinate={{ latitude: destino.lat, longitude: destino.lng }}
              title="🎯 Destino"
              description={`Final de tu ruta - ${destino.lat.toFixed(4)}, ${destino.lng.toFixed(4)}`}
              pinColor="red"
              anchor={{ x: 0.5, y: 1 }}
            />
          )}

          {/* 🛣️ Línea de ruta calculada */}
          {routeData?.route_points && routeData.route_points.length > 0 && (
            <Polyline
              coordinates={routeData.route_points.map(point => ({
                latitude: point.lat,
                longitude: point.lng
              }))}
              strokeColor={preferencia === 'seguridad' ? "#FF7A00" : "#0057FF"}
              strokeWidth={8}
              lineDashPattern={[5, 5]}
              lineJoin="round"
              lineCap="round"
              zIndex={10}
            />
          )}
        </MapView>

        {/* Overlay de cálculo */}
        {isCalculating && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={PASTEL_COLORS.darkText} />
            <Text style={styles.calculatingText}>🧠 Calculando ruta inteligente...</Text>
          </View>
        )}

        {/* Indicador de modo de selección */}
        {(isSelectingOrigin || isSelectingDestination) && (
          <View style={styles.mapModeIndicator}>
            <Text style={styles.mapModeText}>
              {isSelectingOrigin ? '📍 ORIGEN' : '🎯 DESTINO'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // 📊 Render estadísticas de ruta
  const renderRouteStatistics = () => {
    if (!routeData) return null;

    const { statistics, recommendations } = routeData;
    
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>📊 Estadísticas de la Ruta</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📏</Text>
            <Text style={styles.statValue}>
              {statistics.distancia ? `${statistics.distancia.toFixed(1)} km` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Distancia</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>
              {statistics.tiempo ? `${statistics.tiempo} min` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Tiempo Est.</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>
              {(statistics.risk_score || 0) < 0.3 ? '🟢' : 
               (statistics.risk_score || 0) < 0.7 ? '🟡' : '🔴'}
            </Text>
            <Text style={styles.statValue}>
              {statistics.risk_score ? `${Math.round(statistics.risk_score * 100)}%` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Nivel Riesgo</Text>
          </View>
        </View>
        
        {/* 💡 Recomendaciones IA */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>💡 Recomendaciones IA</Text>
            {recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendationItem}>
                • {rec}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={PASTEL_COLORS.primaryGradient}
        style={styles.gradient}
      />
      
      {/* 🎯 Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Inicio</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>🗺️ Navegación Libre</Text>
        <Text style={styles.subtitle}>Selecciona cualquier punto en Bogotá</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 📍 Selector de puntos */}
        {renderPointSelector()}

        {/* 🎯 Preferencias */}
        {renderPreferences()}

        {/* 📏 Sensibilidad */}
        {renderSensitivitySlider()}

        {/* 🗺️ Mapa interactivo */}
        {renderInteractiveMap()}

        {/* 📊 Estadísticas */}
        {renderRouteStatistics()}
        
        {/* 🚀 Botón manual de cálculo */}
        <TouchableOpacity 
          style={[
            styles.calculateButton,
            (!origen || !destino || isCalculating) && styles.calculateButtonDisabled
          ]}
          onPress={calculateRoute}
          disabled={!origen || !destino || isCalculating}
        >
          <LinearGradient
            colors={[PREFERENCIAS[preferencia].color, PREFERENCIAS[preferencia].borderColor]}
            style={styles.calculateGradient}
          >
            <Text style={styles.calculateText}>
              {isCalculating ? '⏳ Calculando...' : '🧠 Calcular Ruta Inteligente'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
  
  // 🎯 Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: PASTEL_COLORS.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: PASTEL_COLORS.darkText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
  },

  // 📱 Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // 🎯 Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 16,
  },

  // 📍 Point Selector
  pointSelectorContainer: {
    marginBottom: 30,
  },
  pointCard: {
    marginBottom: 15,
  },
  pointButton: {
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointButtonActive: {
    borderColor: PASTEL_COLORS.speedBlueBorder,
    backgroundColor: PASTEL_COLORS.speedBlue,
  },
  pointButtonSelected: {
    borderColor: PASTEL_COLORS.safetyGreenBorder,
    backgroundColor: PASTEL_COLORS.safetyGreen,
  },
  pointIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  pointDetails: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 6,
  },
  pointCoords: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
    fontFamily: 'monospace',
  },
  pointHint: {
    fontSize: 14,
    color: PASTEL_COLORS.lightText,
    fontStyle: 'italic',
  },
  clearPointButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: PASTEL_COLORS.riskRed,
  },
  clearPointIcon: {
    fontSize: 16,
  },

  // 📊 Active Selection
  activeSelectionCard: {
    backgroundColor: PASTEL_COLORS.lemonYellow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    alignItems: 'center',
    marginTop: 10,
  },
  activeSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 8,
  },
  activeSelectionHint: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    marginBottom: 12,
  },
  cancelSelectionButton: {
    backgroundColor: PASTEL_COLORS.riskRed,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelSelectionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },

  // 🛰️ GPS Button
  gpsButton: {
    backgroundColor: PASTEL_COLORS.skyBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.speedBlueBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  gpsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  gpsText: {
    fontSize: 14,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
  },

  // 🎯 Preferences
  preferencesContainer: {
    marginBottom: 30,
  },
  preferencesToggle: {
    flexDirection: 'row',
    gap: 15,
  },
  preferenceButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preferenceIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 4,
  },
  preferenceDesc: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
  },

  // 📏 Slider
  sliderContainer: {
    marginBottom: 30,
    backgroundColor: PASTEL_COLORS.cardBg,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slider: {
    height: 40,
    marginVertical: 15,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
    fontWeight: '600',
  },
  sliderDescription: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // 🗺️ Map
  mapContainer: {
    marginBottom: 30,
  },
  mapWrapper: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 244, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculatingText: {
    fontSize: 16,
    color: PASTEL_COLORS.darkText,
    fontWeight: '600',
    marginTop: 10,
  },
  mapModeIndicator: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: PASTEL_COLORS.lemonYellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
  },
  mapModeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },

  // 📊 Statistics
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
  },
  recommendationsContainer: {
    backgroundColor: PASTEL_COLORS.lemonYellow,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 12,
  },
  recommendationItem: {
    fontSize: 14,
    color: PASTEL_COLORS.darkText,
    marginBottom: 6,
    lineHeight: 20,
  },

  // 🚀 Calculate Button
  calculateButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  calculateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
});