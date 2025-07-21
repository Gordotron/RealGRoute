import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
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
  inputBg: '#F8F9FA',
  inputBorder: '#E9ECEF',
};

// 🎨 TIPOS DE FENCES CON COLORES PASTEL
const FENCE_TYPES = {
  HOME: { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '🏡', 
    name: 'Casa',
    gradient: ['#FFE5E5', '#FFCCCC'],
    description: 'Tu hogar dulce hogar'
  },
  WORK: { 
    color: '#E5F3FF', 
    border: '#B3D9FF', 
    icon: '💼', 
    name: 'Trabajo',
    gradient: ['#E5F3FF', '#CCE7FF'],
    description: 'Oficina o lugar de trabajo'
  },
  FAMILY: { 
    color: '#F0E5FF', 
    border: '#D9B3FF', 
    icon: '👨‍👩‍👧‍👦', 
    name: 'Familia',
    gradient: ['#F0E5FF', '#E6CCFF'],
    description: 'Casa de familiares'
  },
  AVOID: { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '🚨', 
    name: 'Evitar',
    gradient: ['#FFE5E5', '#FFCCCC'],
    description: 'Zona a evitar por seguridad'
  },
  CAUTION: { 
    color: '#FFF8E5', 
    border: '#FFECB3', 
    icon: '⚠️', 
    name: 'Precaución',
    gradient: ['#FFF8E5', '#FFF2CC'],
    description: 'Zona que requiere atención'
  },
  SAFE: { 
    color: '#E5F9E5', 
    border: '#B3F0B3', 
    icon: '✅', 
    name: 'Zona Segura',
    gradient: ['#E5F9E5', '#CCF2CC'],
    description: 'Lugar conocido y seguro'
  },
  CUSTOM: { 
    color: '#F0F0FF', 
    border: '#D9D9FF', 
    icon: '📍', 
    name: 'Personalizada',
    gradient: ['#F0F0FF', '#E6E6FF'],
    description: 'Zona personalizada'
  }
};

// 🎨 Estilo de mapa pastel
const mapStylePastel = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#f8f8f8"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#6A6A8A"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#ffffff"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#E5F4FF"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{"color": "#E8F5E8"}]
  }
];

// 🏠 INTERFACE PARA NUEVA FENCE
interface NewFence {
  nombre: string;
  tipo: keyof typeof FENCE_TYPES;
  radio: number;
  lat: number;
  lng: number;
  descripcion?: string;
}

export default function CreateFenceScreen() {
  const navigation = useNavigation();
  
  // 🔄 Estados principales
  const [step, setStep] = useState<'location' | 'details' | 'preview'>('location');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  
  // 📍 Estados de ubicación
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 4.6097,
    longitude: -74.0817,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  
  // 🏠 Estados de fence - INICIALIZACIÓN ROBUSTA
  const [newFence, setNewFence] = useState<NewFence>(() => ({
    nombre: '',
    tipo: 'HOME',
    radio: 300,
    lat: 0,
    lng: 0,
    descripcion: ''
  }));

  // 🛰️ Solicitar permisos GPS al iniciar
  useEffect(() => {
    console.log('🗺️ CreateFence mounting - getting GPS location...');
    initializeGPSLocation();
  }, []);

  // 🛰️ GPS AUTOMÁTICO AL INICIAR - MEJORADO
  const initializeGPSLocation = async () => {
    try {
      setIsLoading(true);
      
      console.log('🛰️ Requesting GPS permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    
      if (status !== 'granted') {
        console.log('❌ GPS permission denied, using default location');
        return;
      }
      
      console.log('🛰️ Getting current position...');
      const gpsLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 30000,
        timeout: 10000,
      });
      
      const { latitude, longitude } = gpsLocation.coords;
    
      console.log(`📍 GPS SUCCESS: ${latitude}, ${longitude}`);
      
      // 🚨 VALIDAR QUE ESTÉ EN BOGOTÁ
      if (latitude < 4.0 || latitude > 5.0 || longitude < -75.0 || longitude > -73.0) {
        console.log('⚠️ GPS location outside Bogotá, using center');
        const fallbackLocation = { lat: 4.6097, lng: -74.0817 };
        setCurrentLocation(fallbackLocation);
        setMapRegion({
          latitude: fallbackLocation.lat,
          longitude: fallbackLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        console.log(`✅ Valid GPS location: ${latitude}, ${longitude}`);
        const validLocation = { lat: latitude, lng: longitude };
      
        setCurrentLocation(validLocation);
        setSelectedLocation(validLocation); // Auto-seleccionar
        setNewFence(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));
        setMapRegion({
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    
    } catch (error) {
      console.log(`❌ GPS Error: ${error}`);
      const fallbackLocation = { lat: 4.6097, lng: -74.0817 };
      setCurrentLocation(fallbackLocation);
      setMapRegion({
        latitude: fallbackLocation.lat,
        longitude: fallbackLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 📍 Manejar selección en el mapa
  // 📍 Manejar selección en el mapa - MEJORADO
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
  
    console.log('🗺️ Raw map coordinates:', { latitude, longitude });
    console.log('🗺️ Current mapRegion:', mapRegion);
  
    // 🚨 VALIDAR QUE NO SEAN COORDENADAS RARAS
    if (Math.abs(latitude) < 1 || Math.abs(longitude) < 1) {
      console.log('⚠️ Invalid coordinates detected, using GPS location instead');
      
      if (currentLocation) {
        const newLocation = { lat: currentLocation.lat, lng: currentLocation.lng };
        setSelectedLocation(newLocation);
        setNewFence(prev => ({
          ...prev,
          lat: currentLocation.lat,
          lng: currentLocation.lng
        }));
        
        Alert.alert('📍 Ubicación corregida', 'Se usó tu ubicación GPS por error en el mapa');
      }
      return;
    }
  
    const newLocation = { lat: latitude, lng: longitude };
  
    setSelectedLocation(newLocation);
    setNewFence(prev => ({
      ...prev,
      lat: latitude,
      lng: longitude
    }));  
    console.log('📍 Location selected:', newLocation);
  };
  // 🎯 Usar ubicación actual
  const useCurrentLocation = () => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      setNewFence(prev => ({
        ...prev,
        lat: currentLocation.lat,
        lng: currentLocation.lng
      }));
      
      Alert.alert('📍 Ubicación actual', 'Se ha seleccionado tu ubicación actual');
    } else {
      Alert.alert('❌ Error', 'No se pudo obtener tu ubicación actual');
    }
  };

  // ➡️ Pasar al siguiente paso
  const nextStep = () => {
    if (step === 'location') {
      if (!selectedLocation) {
        Alert.alert('📍 Ubicación requerida', 'Por favor selecciona una ubicación en el mapa');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      if (!newFence.nombre.trim()) {
        Alert.alert('📝 Nombre requerido', 'Por favor ingresa un nombre para tu zona');
        return;
      }
      setStep('preview');
    }
  };

  // ⬅️ Paso anterior
  const prevStep = () => {
    if (step === 'details') {
      setStep('location');
    } else if (step === 'preview') {
      setStep('details');
    }
  };

  // 💾 Crear fence
  const createFence = async () => {
    try {
      // 🚨 VALIDAR COORDENADAS BOGOTÁ - CORREGIDO
      if (newFence.lat < 4.0 || newFence.lat > 5.0 || 
          newFence.lng < -75.0 || newFence.lng > -73.0) {
            Alert.alert(
              '🚨 Ubicación Inválida',
              'Las coordenadas están fuera de Bogotá. ¿Usar tu ubicación GPS actual?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Usar GPS',
                  onPress: () => {
                    if (currentLocation) {
                      setNewFence(prev => ({
                        ...prev,
                        lat: currentLocation.lat,
                        lng: currentLocation.lng
                      }));
                      setSelectedLocation(currentLocation);
                      Alert.alert('✅ Ubicación actualizada', 'Se ha usado tu ubicación GPS actual');
                    } else {
                      Alert.alert('❌ Error', 'No hay ubicación GPS disponible');
                    }
                  }
                }
              ]
            );
            return;
          }
          
          setIsLoading(true);
    
          console.log('🏠 Creating fence:', newFence);
          
          // Llamar a la API
          await safeRoutesAPI.createZone({
            lat: newFence.lat,
            lng: newFence.lng,
            radio: newFence.radio,
            nombre: newFence.nombre,
            usuario: 'dcastillosi'
          });
          
          Alert.alert(
            '🎉 ¡Zona creada!',
            `Tu zona "${newFence.nombre}" ha sido creada exitosamente`,
            [
              {
                text: 'Ver mis zonas',
                onPress: () => navigation.goBack()
              }
            ]
          );
        
        } catch (error) {
          console.error('❌ Error creating fence:', error);
          Alert.alert('❌ Error', 'No se pudo crear la zona. Intenta nuevamente.');
        } finally {
          setIsLoading(false);
        }
    };

  // 🎨 Render del selector de tipo
  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.sectionTitle}>🎨 Tipo de Zona</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
        {Object.entries(FENCE_TYPES).map(([key, type]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.typeCard,
              { backgroundColor: type.color, borderColor: type.border },
              newFence.tipo === key && styles.typeCardSelected
            ]}
            onPress={() => setNewFence(prev => ({ ...prev, tipo: key as keyof typeof FENCE_TYPES }))}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <Text style={styles.typeName}>{type.name}</Text>
            <Text style={styles.typeDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // 📏 Render del selector de radio - TOTALMENTE PROTEGIDO
  const renderRadiusSelector = () => {
    const currentRadius = newFence?.radio ?? 300;
    
    return (
      <View style={styles.radiusSelectorContainer}>
        <Text style={styles.sectionTitle}>📏 Radio de la Zona</Text>
        <View style={styles.radiusOptions}>
          {[100, 200, 300, 500, 800, 1000].map(radius => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusButton,
                currentRadius === radius && styles.radiusButtonSelected
              ]}
              onPress={() => setNewFence(prev => ({ ...prev, radio: radius }))}
            >
              <Text style={[
                styles.radiusText,
                currentRadius === radius && styles.radiusTextSelected
              ]}>
                {radius}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.radiusInfo}>
          📏 Radio seleccionado: {currentRadius}m ({currentRadius < 300 ? 'Pequeño' : currentRadius < 600 ? 'Mediano' : 'Grande'})
        </Text>
      </View>
    );
  };

  // 🛡️ SAFE RENDER CON VERIFICACIÓN
  if (!newFence) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={PASTEL_COLORS.primaryGradient} style={styles.gradient} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: PASTEL_COLORS.darkText }}>⏳ Inicializando...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <Text style={styles.backButtonText}>← Mis Zonas</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>➕ Crear Nueva Zona</Text>
        <Text style={styles.subtitle}>
          Paso {step === 'location' ? '1' : step === 'details' ? '2' : '3'} de 3
        </Text>
        
        {/* 📊 Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, step !== 'location' && styles.progressStepComplete]}>
            <Text style={styles.progressText}>📍</Text>
          </View>
          <View style={[styles.progressLine, step === 'preview' && styles.progressLineComplete]} />
          <View style={[styles.progressStep, step === 'preview' && styles.progressStepComplete]}>
            <Text style={styles.progressText}>📝</Text>
          </View>
          <View style={[styles.progressLine, step === 'preview' && styles.progressLineComplete]} />
          <View style={[styles.progressStep, step === 'preview' && styles.progressStepComplete]}>
            <Text style={styles.progressText}>✅</Text>
          </View>
        </View>
      </View>

      {step === 'location' && (
        // 📍 PASO 1: SELECCIONAR UBICACIÓN
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>📍 Selecciona la Ubicación</Text>
          <Text style={styles.stepDescription}>
            Toca en el mapa donde quieres crear tu zona personal
          </Text>
          
          <View style={styles.mapContainer}>
            <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={mapStylePastel}
            initialRegion={{
              latitude: 4.6097,
              longitude: -74.0817,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            moveOnMarkerPress={false}
            loadingEnabled={true}
            loadingIndicatorColor={PASTEL_COLORS.lavender}
            loadingBackgroundColor={PASTEL_COLORS.cardBg}
            onMapReady={() => {
              console.log('🗺️ Map is ready!');
            }}
            onRegionChange={(region) => {
              console.log('🗺️ Region changed:', region);
            }}
          >
              {selectedLocation && (
                <>
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    title="Nueva Zona"
                    description={`${FENCE_TYPES[newFence.tipo].name} - ${newFence?.radio ?? 300}m`}
                  />
                  <Circle
                    center={{
                      latitude: selectedLocation.lat,
                      longitude: selectedLocation.lng,
                    }}
                    radius={newFence?.radio ?? 300}
                    fillColor={`${FENCE_TYPES[newFence.tipo].color}40`}
                    strokeColor={FENCE_TYPES[newFence.tipo].border}
                    strokeWidth={2}
                  />
                </>
              )}
            </MapView>
            
            {/* 🎯 Botón GPS flotante */}
            <TouchableOpacity 
              style={styles.gpsButton}
              onPress={useCurrentLocation}
              disabled={!hasLocationPermission}
            >
              <Text style={styles.gpsIcon}>📍</Text>
            </TouchableOpacity>
          </View>
          
          {selectedLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 Ubicación: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.gpsBackupButton}
            onPress={useCurrentLocation}
          >
            <Text style={styles.gpsBackupText}>🛰️ Usar mi ubicación GPS</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'details' && (
        // 📝 PASO 2: DETALLES DE LA ZONA
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>📝 Detalles de la Zona</Text>
          <Text style={styles.stepDescription}>
            Personaliza tu zona con nombre, tipo y radio
          </Text>
          
          {/* 📝 Nombre */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>📝 Nombre de la Zona *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Mi Casa, Oficina, etc."
              value={newFence.nombre}
              onChangeText={(text) => setNewFence(prev => ({ ...prev, nombre: text }))}
              maxLength={30}
            />
            <Text style={styles.inputHelper}>{newFence.nombre.length}/30 caracteres</Text>
          </View>

          {/* 🎨 Selector de tipo */}
          {renderTypeSelector()}

          {/* 📏 Selector de radio */}
          {renderRadiusSelector()}

          {/* 📄 Descripción opcional */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>📄 Descripción (Opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe tu zona..."
              value={newFence.descripcion}
              onChangeText={(text) => setNewFence(prev => ({ ...prev, descripcion: text }))}
              multiline
              numberOfLines={3}
              maxLength={100}
            />
            <Text style={styles.inputHelper}>{(newFence.descripcion || '').length}/100 caracteres</Text>
          </View>
        </ScrollView>
      )}

      {step === 'preview' && (
        // ✅ PASO 3: PREVIEW Y CONFIRMACIÓN
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>✅ Confirmar Nueva Zona</Text>
          <Text style={styles.stepDescription}>
            Revisa los detalles antes de crear tu zona
          </Text>
          
          <View style={styles.previewCard}>
            <LinearGradient
              colors={FENCE_TYPES[newFence.tipo].gradient}
              style={styles.previewGradient}
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewIcon}>{FENCE_TYPES[newFence.tipo].icon}</Text>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{newFence.nombre}</Text>
                  <Text style={styles.previewType}>{FENCE_TYPES[newFence.tipo].name}</Text>
                </View>
              </View>
              
              <View style={styles.previewDetails}>
                <View style={styles.previewDetail}>
                  <Text style={styles.previewDetailIcon}>📏</Text>
                  <Text style={styles.previewDetailText}>{newFence?.radio ?? 300}m de radio</Text>
                </View>
                
                <View style={styles.previewDetail}>
                  <Text style={styles.previewDetailIcon}>📍</Text>
                  <Text style={styles.previewDetailText}>
                    {newFence.lat.toFixed(4)}, {newFence.lng.toFixed(4)}
                  </Text>
                </View>
                
                {newFence.descripcion && (
                  <View style={styles.previewDetail}>
                    <Text style={styles.previewDetailIcon}>📄</Text>
                    <Text style={styles.previewDetailText}>{newFence.descripcion}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
          
          {/* 🗺️ Mini mapa de preview */}
          <View style={styles.miniMapContainer}>
            <Text style={styles.sectionTitle}>🗺️ Vista Previa</Text>
            <View style={styles.miniMap}>
              <MapView
                style={styles.miniMapView}
                provider={PROVIDER_GOOGLE}
                customMapStyle={mapStylePastel}
                region={{
                  latitude: newFence.lat,
                  longitude: newFence.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: newFence.lat,
                    longitude: newFence.lng,
                  }}
                  title={newFence.nombre}
                />
                <Circle
                  center={{
                    latitude: newFence.lat,
                    longitude: newFence.lng,
                  }}
                  radius={newFence?.radio ?? 300}
                  fillColor={`${FENCE_TYPES[newFence.tipo].color}60`}
                  strokeColor={FENCE_TYPES[newFence.tipo].border}
                  strokeWidth={2}
                />
              </MapView>
            </View>
          </View>
        </ScrollView>
      )}

      {/* 🚀 Botones de navegación */}
      <View style={styles.buttonContainer}>
        {step !== 'location' && (
          <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
            <Text style={styles.secondaryButtonText}>← Anterior</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.primaryButton, { flex: step === 'location' ? 1 : 0.6 }]}
          onPress={step === 'preview' ? createFence : nextStep}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[PASTEL_COLORS.lavender, PASTEL_COLORS.skyBlue]}
            style={styles.primaryGradient}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? '⏳ Creando...' : 
               step === 'preview' ? '🎉 Crear Zona' : 'Siguiente →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  
  // 📊 Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PASTEL_COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
  },
  progressStepComplete: {
    backgroundColor: PASTEL_COLORS.lavender,
    borderColor: PASTEL_COLORS.lavender,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: PASTEL_COLORS.border,
  },
  progressLineComplete: {
    backgroundColor: PASTEL_COLORS.lavender,
  },
  progressText: {
    fontSize: 16,
  },

  // 📝 Steps
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
    marginBottom: 20,
    lineHeight: 22,
  },

  // 🗺️ Map
  mapContainer: {
    height: height * 0.5,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  gpsButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PASTEL_COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsIcon: {
    fontSize: 24,
  },
  locationInfo: {
    backgroundColor: PASTEL_COLORS.cardBg,
    padding: 12,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
  },

  // 📝 Inputs
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: PASTEL_COLORS.inputBg,
    borderWidth: 1,
    borderColor: PASTEL_COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: PASTEL_COLORS.darkText,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHelper: {
    fontSize: 12,
    color: PASTEL_COLORS.lightText,
    marginTop: 4,
    textAlign: 'right',
  },

  // 🎨 Type Selector
  typeSelectorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 12,
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeCard: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeCardSelected: {
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 4,
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 11,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    lineHeight: 14,
  },

  // 📏 Radius Selector
  radiusSelectorContainer: {
    marginBottom: 20,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radiusButton: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PASTEL_COLORS.cardBg,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusButtonSelected: {
    backgroundColor: PASTEL_COLORS.lavender,
    borderColor: PASTEL_COLORS.lavender,
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: PASTEL_COLORS.mediumText,
  },
  radiusTextSelected: {
    color: PASTEL_COLORS.darkText,
  },
  radiusInfo: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ✅ Preview
  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  previewGradient: {
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 4,
  },
  previewType: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
  },
  previewDetails: {
    gap: 8,
  },
  previewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  previewDetailText: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    flex: 1,
  },

  // 🗺️ Mini Map
  miniMapContainer: {
    marginBottom: 20,
  },
  miniMap: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniMapView: {
    flex: 1,
  },

  // 🚀 Buttons
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  secondaryButton: {
    flex: 0.35,
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.mediumText,
  },
  primaryButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
  // 🆕 GPS Backup Button
  gpsBackupButton: {
    backgroundColor: PASTEL_COLORS.lavender,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: PASTEL_COLORS.border,
  },
  gpsBackupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
});