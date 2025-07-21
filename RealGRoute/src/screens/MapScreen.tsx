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
import { useNavigation, useRoute } from '@react-navigation/native'; // 🆕 AGREGAR useRoute
import { globalMLData, globalDataSource, globalLoadTime } from './HomeScreen';

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

// 🆕 Interface para fence específica
interface MapScreenProps {
  route?: {
    params?: {
      focusFence?: {
        lat: number;
        lng: number;
        radio: number;
        nombre: string;
        tipo?: string;
      }
    }
  }
}

// 🗺️ Estilo de mapa MEJORADO
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
  const route = useRoute() as MapScreenProps['route'];
  const focusFence = route?.params?.focusFence; // 🎯 Fence específica
  
  const [selectedZone, setSelectedZone] = useState(null);
  
  // ⏰ HORA CORRECTA COLOMBIA (UTC-5)
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 🚀 ESTADO PARA DATOS COMPARTIDOS
  const [localidadesML, setLocalidadesML] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  
  // 🆕 NUEVO: Estado para región inicial
  const [initialRegion] = useState(() => {
    if (focusFence) {
      // 📍 Si viene una fence específica, centrar ahí
      console.log(`🎯 Focusing on fence: ${focusFence.nombre} at ${focusFence.lat}, ${focusFence.lng}`);
      return {
        latitude: focusFence.lat,
        longitude: focusFence.lng,
        latitudeDelta: 0.005, // Zoom más cercano para fence específica
        longitudeDelta: 0.005,
      };
    } else {
      // 🗺️ Vista general de Bogotá
      console.log('🗺️ General Bogotá view');
      return {
        latitude: 4.6097,
        longitude: -74.0817,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
    }
  });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isNight = currentHour >= 18 || currentHour <= 6;

  // 🌐 FUNCIÓN PARA CARGAR DATOS COMPARTIDOS
  const loadSharedData = () => {
    console.log(`🗺️ === LOADING SHARED DATA ===`);
    console.log(`🌐 Shared data available: ${globalMLData.length} localidades`);
    console.log(`🌐 Data source: ${globalDataSource}`);
    console.log(`🌐 Load time: ${globalLoadTime}`);
    
    if (globalMLData && globalMLData.length > 0) {
      setLocalidadesML(globalMLData);
      setDataSource(globalDataSource);
      console.log(`✅ MapScreen: Using shared data (${globalMLData.length} localidades)`);
      
      // Log sample data para debug
      console.log("🔍 Sample shared data:");
      globalMLData.slice(0, 3).forEach((loc: any) => {
        console.log(`  ${loc.localidad}: ${(loc.risk_score * 100).toFixed(0)}%`);
      });
    } else {
      console.log("⚠️ No shared data available, waiting...");
      setLocalidadesML([]);
      setDataSource("WAITING");
    }
  };

  // 🔄 CARGAR DATOS COMPARTIDOS AL INICIAR Y CADA 10 SEGUNDOS
  useEffect(() => {
    loadSharedData();
    
    // Check for shared data every 10 seconds
    const interval = setInterval(loadSharedData, 10000);
    return () => clearInterval(interval);
  }, []);

  // 🎯 Función para obtener color según riesgo - USAR DATOS ML DIRECTOS
  const getRiskColor = (riskScore: number) => {
    console.log(`🎨 Color for shared ML score: ${riskScore.toFixed(3)}`);
    
    if (riskScore < 0.3) return COLORS.safe;
    if (riskScore < 0.6) return COLORS.warning;
    return COLORS.danger;
  };

  // 🎯 Función para obtener texto de riesgo
  const getRiskText = (riskScore: number) => {
    console.log(`📝 Text for shared ML score: ${riskScore.toFixed(3)}`);
    
    if (riskScore < 0.3) return 'SEGURO';
    if (riskScore < 0.6) return 'PRECAUCIÓN';
    return 'ALTO RIESGO';
  };

  // 🎯 Manejo de selección de zona
  const handleZonePress = (localidad: any) => {
    setSelectedZone(localidad);
    
    const displayScore = Math.min(localidad.risk_score * 100, 100).toFixed(0);
    const riskText = getRiskText(localidad.risk_score);

    console.log(`🔍 Zone pressed: ${localidad.localidad}`);
    console.log(`  Shared ML Risk Score: ${localidad.risk_score.toFixed(3)}`);
    console.log(`  Display: ${displayScore}%`);
    console.log(`  Level: ${riskText}`);
    console.log(`  Source: ${dataSource}`);

    Alert.alert(
      `📍 ${localidad.localidad}`,
      `🛡️ Nivel: ${riskText}\n📊 Score: ${displayScore}%\n🕐 Hora: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}\n🌐 Fuente: ${dataSource} (Compartido)\n${isNight ? '🌙 Horario nocturno\n' : '☀️ Horario diurno\n'}📝 Datos ML sincronizados`,
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
      {/* 🗺️ Mapa principal CON DATOS COMPARTIDOS Y FENCE ESPECÍFICA */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyleDetailed}
        initialRegion={initialRegion} // 🆕 Usar región dinámica
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={false}
        showsBuildings={true}
        showsPointsOfInterest={true}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {/* 🔥 MARCADORES EXISTENTES (solo si no hay fence específica o queremos mostrar ambos) */}
        {!focusFence && localidadesML.map((localidad, index) => {
          const circleColor = getRiskColor(localidad.risk_score);
          
          return (
            <React.Fragment key={`${localidad.localidad}-${index}`}>
              {/* Círculo de riesgo */}
              <Circle
                center={{
                  latitude: localidad.lat,
                  longitude: localidad.lng,
                }}
                radius={1500}
                fillColor={`${circleColor}20`}
                strokeColor={circleColor}
                strokeWidth={2}
              />
              
              {/* Marcador principal */}
              <Marker
                coordinate={{
                  latitude: localidad.lat,
                  longitude: localidad.lng,
                }}
                onPress={() => handleZonePress(localidad)}
                title={localidad.localidad}
                description={`${getRiskText(localidad.risk_score)} (${(localidad.risk_score * 100).toFixed(0)}%)`}
              />
            </React.Fragment>
          );
        })}
        
        {/* 🎯 FENCE ESPECÍFICA DESTACADA */}
        {focusFence && (
          <>
            {/* ⭕ Círculo principal de la fence */}
            <Circle
              center={{
                latitude: focusFence.lat,
                longitude: focusFence.lng,
              }}
              radius={focusFence.radio}
              fillColor="rgba(123, 104, 238, 0.2)" // Púrpura transparente
              strokeColor="#7B68EE"
              strokeWidth={3}
              lineDashPattern={[5, 5]} // Línea punteada para destacar
            />
            
            {/* 🎨 Círculo interno para mejor visualización */}
            <Circle
              center={{
                latitude: focusFence.lat,
                longitude: focusFence.lng,
              }}
              radius={focusFence.radio * 0.3}
              fillColor="rgba(123, 104, 238, 0.4)"
              strokeColor="#7B68EE"
              strokeWidth={2}
            />
            
            {/* 📍 Marcador especial de la fence */}
            <Marker
              coordinate={{
                latitude: focusFence.lat,
                longitude: focusFence.lng,
              }}
              title={`🏠 ${focusFence.nombre}`}
              description={`📏 Radio: ${focusFence.radio}m | 🎨 Tipo: ${focusFence.tipo || 'Personal'}`}
              pinColor="#7B68EE" // Color destacado
            />
          </>
        )}
      </MapView>

      {/* 🎨 Header con gradiente - ACTUALIZADO PARA FENCE */}
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
          {focusFence ? (
            // 🎯 Modo fence específica
            <>
              <Text style={styles.headerTitle}>🏠 {focusFence.nombre}</Text>
              <Text style={styles.headerSubtitle}>
                📏 Radio: {focusFence.radio}m • 🎨 {focusFence.tipo || 'Personal'}
              </Text>
              <Text style={styles.dataSourceBadge}>
                📍 {focusFence.lat.toFixed(4)}, {focusFence.lng.toFixed(4)}
              </Text>
            </>
          ) : (
            // 🗺️ Modo mapa general
            <>
              <Text style={styles.headerTitle}>🗺️ Mapa ML Compartido</Text>
              <Text style={styles.headerSubtitle}>
                Colombia: {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')} {isNight ? '🌙' : '☀️'}
                {isNight ? ' - Horario Nocturno' : ' - Horario Diurno'}
              </Text>
              <Text style={styles.dataSourceBadge}>
                🌐 Sincronizado: {dataSource} {dataSource === 'API' ? '✅' : dataSource === 'FALLBACK' ? '🔧' : '⏳'}
              </Text>
            </>
          )}
        </View>
      </LinearGradient>

      {/* 📊 Panel de leyenda - ACTUALIZADO PARA FENCE */}
      <View style={styles.legendPanel}>
        {focusFence ? (
          // 🎯 Leyenda para fence específica
          <>
            <Text style={styles.legendTitle}> Tu Zona</Text>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#7B68EE' }]} />
              <Text style={styles.legendText}>{focusFence.nombre}</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: 'rgba(123, 104, 238, 0.3)' }]} />
              <Text style={styles.legendText}>Área de cobertura</Text>
            </View>
            
            <Text style={styles.legendFooter}>
              📏 {focusFence.radio}m de radio
            </Text>
          </>
        ) : (
          // 🛡️ Leyenda para mapa general (mantener igual)
          <>
            <Text style={styles.legendTitle}>🛡️ Datos Compartidos</Text>
            
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
              🌐 Mismos datos que Dashboard • {globalLoadTime}
            </Text>
          </>
        )}
      </View>

      {/* 🚀 Botón de acción flotante - ACTUALIZADO */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => {
          if (focusFence) {
            Alert.alert(
              'Zona Personalizada',
              `Nombre: ${focusFence.nombre}\nTipo: ${focusFence.tipo || 'Personal'}\nRadio: ${focusFence.radio}m\nCoordenadas: ${focusFence.lat.toFixed(4)}, ${focusFence.lng.toFixed(4)}`
            );
          } else {
            Alert.alert(
              '🔍 Debug Datos Compartidos',
              `Localidades cargadas: ${localidadesML.length}\nFuente: ${dataSource}\nÚltima carga: ${globalLoadTime}\nHora actual: ${currentHour}:${currentMinute.toString().padStart(2, '0')}\nSincronizado con Dashboard: ${localidadesML.length > 0 ? '✅' : '❌'}`
            );
          }
        }}
      >
        <LinearGradient
          colors={[COLORS.accent, '#9575CD']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>{focusFence ? '👀' : '🌐'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* 📍 Contador de localidades - ACTUALIZADO */}
      <View style={styles.counterBadge}>
        {focusFence ? (
          <>
            <Text style={styles.counterText}>Zona Seleccionada</Text>
            <Text style={styles.counterSubtext}> ☃ {focusFence.tipo || 'Custom'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.counterText}>{localidadesML.length} Sincronizadas</Text>
            <Text style={styles.counterSubtext}>
              {dataSource === 'API' ? '🤖 ML' : dataSource === 'FALLBACK' ? '🔧 Local' : '⏳ Esperando'}
            </Text>
          </>
        )}
      </View>

      {/* 🚨 MENSAJE SI NO HAY DATOS (solo en modo general) */}
      {!focusFence && localidadesML.length === 0 && (
        <View style={styles.noDataOverlay}>
          <View style={styles.noDataCard}>
            <Text style={styles.noDataIcon}>⏳</Text>
            <Text style={styles.noDataTitle}>Esperando datos compartidos</Text>
            <Text style={styles.noDataText}>
              El mapa se sincronizará automáticamente con los datos del Dashboard.
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadSharedData}
            >
              <Text style={styles.refreshText}>🔄 Verificar ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 4,
  },
  dataSourceBadge: {
    fontSize: 12,
    color: COLORS.primaryText,
    opacity: 0.7,
    fontStyle: 'italic',
  },

  // 📊 Leyenda
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
    top: 140,
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

  // 🚨 No Data Overlay
  noDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataCard: {
    backgroundColor: COLORS.cardBg,
    padding: 30,
    borderRadius: 16,
    margin: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 10,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshText: {
    color: COLORS.lightText,
    fontWeight: 'bold',
    fontSize: 14,
  },
});