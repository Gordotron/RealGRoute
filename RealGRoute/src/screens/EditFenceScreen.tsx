import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { safeRoutesAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// 🌸 COLORES PASTEL HERMOSOS (IGUALES A FENCESSCREEN)
const PASTEL_COLORS = {
  primaryGradient: ['#F8F4FF', '#F0F8FF', '#F5F8FA'],
  mintGreen: '#E8F5E8',
  lavender: '#F0E6FF', 
  peach: '#FFE8E0',
  skyBlue: '#E5F4FF',
  rosePink: '#FFE5F1',
  lemonYellow: '#FFF9E5',
  border: '#E8E8F0',
  shadow: '#D8D8E8',
  darkText: '#4A4A6A',
  mediumText: '#6A6A8A',
  lightText: '#8A8AAA',
  cardBg: '#FDFDFF',
  overlayBg: 'rgba(248, 244, 255, 0.95)',
  white: '#FFFFFF',
};

// 🎨 TIPOS DE FENCES (IGUALES A FENCESSCREEN)
const FENCE_TYPES = {
  HOME: { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '🏡', 
    name: 'Casa',
    gradient: ['#FFE5E5', '#FFCCCC']
  },
  WORK: { 
    color: '#E5F3FF', 
    border: '#B3D9FF', 
    icon: '💼', 
    name: 'Trabajo',
    gradient: ['#E5F3FF', '#CCE7FF']
  },
  FAMILY: { 
    color: '#F0E5FF', 
    border: '#D9B3FF', 
    icon: '👨‍👩‍👧‍👦', 
    name: 'Familia',
    gradient: ['#F0E5FF', '#E6CCFF']
  },
  AVOID: { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '🚨', 
    name: 'Evitar',
    gradient: ['#FFE5E5', '#FFCCCC']
  },
  CAUTION: { 
    color: '#FFF8E5', 
    border: '#FFECB3', 
    icon: '⚠️', 
    name: 'Precaución',
    gradient: ['#FFF8E5', '#FFF2CC']
  },
  SAFE: { 
    color: '#E5F9E5', 
    border: '#B3F0B3', 
    icon: '✅', 
    name: 'Zona Segura',
    gradient: ['#E5F9E5', '#CCF2CC']
  },
  CUSTOM: { 
    color: '#F0F0FF', 
    border: '#D9D9FF', 
    icon: '📍', 
    name: 'Personalizada',
    gradient: ['#F0F0FF', '#E6E6FF']
  }
};

// 🏠 INTERFACE PARA FENCE
interface UserFence {
  lat: number;
  lng: number;
  radio: number;
  nombre: string;
  tipo?: keyof typeof FENCE_TYPES;
  created_at?: string;
  usuario?: string;
}

interface EditFenceScreenProps {
  route: {
    params: {
      fence: UserFence;
    }
  }
}

export default function EditFenceScreen() {
  const navigation = useNavigation();
  const route = useRoute() as EditFenceScreenProps['route'];
  const originalFence = route.params?.fence;

  // 🔄 Estados para edición
  const [editedFence, setEditedFence] = useState({
    nombre: originalFence?.nombre || '',
    radio: originalFence?.radio || 200,
    tipo: (originalFence?.tipo || 'CUSTOM') as keyof typeof FENCE_TYPES,
    lat: originalFence?.lat || 4.6097,
    lng: originalFence?.lng || -74.0817,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 🔍 Detectar cambios
  useEffect(() => {
    if (!originalFence) return;
    
    const changed = (
      editedFence.nombre !== originalFence.nombre ||
      editedFence.radio !== originalFence.radio ||
      editedFence.tipo !== originalFence.tipo ||
      Math.abs(editedFence.lat - originalFence.lat) > 0.0001 ||
      Math.abs(editedFence.lng - originalFence.lng) > 0.0001
    );
    
    setHasChanges(changed);
  }, [editedFence, originalFence]);

  // 📱 Si no hay fence, error
  if (!originalFence) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={PASTEL_COLORS.primaryGradient} style={styles.gradient} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>No se encontró la zona a editar</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 📍 Actualizar ubicación GPS
  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('❌ GPS', 'Se requieren permisos de ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setEditedFence(prev => ({
        ...prev,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      }));

      Alert.alert('✅ Ubicación', 'Ubicación actualizada con GPS');
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo obtener la ubicación');
    }
  };

  // 💾 Guardar cambios
  const saveChanges = async () => {
    if (!editedFence.nombre.trim()) {
      Alert.alert('❌ Error', 'El nombre es requerido');
      return;
    }

    if (!hasChanges) {
      Alert.alert('ℹ️ Sin cambios', 'No hay cambios para guardar');
      return;
    }

    Alert.alert(
      '💾 Guardar cambios',
      '¿Estás seguro de guardar los cambios en esta zona?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            try {
              setIsLoading(true);

              const updates: any = {};
              
              if (editedFence.nombre !== originalFence.nombre) {
                updates.nuevo_nombre = editedFence.nombre;
              }
              if (editedFence.radio !== originalFence.radio) {
                updates.nuevo_radio = editedFence.radio;
              }
              // TODO: Agregar soporte para tipo y coordenadas en backend

              const result = await safeRoutesAPI.updateZone(originalFence.nombre, updates);
              
              Alert.alert('✅ Guardado', 'Zona actualizada correctamente', [
                { 
                  text: 'OK', 
                  onPress: () => navigation.goBack()
                }
              ]);
              
            } catch (error) {
              console.error('❌ Error saving fence:', error);
              Alert.alert('❌ Error', 'No se pudo guardar la zona');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
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
          onPress={() => {
            if (hasChanges) {
              Alert.alert(
                '⚠️ Cambios sin guardar',
                '¿Salir sin guardar los cambios?',
                [
                  { text: 'Quedarse', style: 'cancel' },
                  { text: 'Salir', onPress: () => navigation.goBack() }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>✏️ Editar Zona</Text>
        <Text style={styles.subtitle}>Modifica los detalles de tu zona</Text>
        
        {hasChanges && (
          <View style={styles.changesBadge}>
            <Text style={styles.changesText}>📝 Hay cambios sin guardar</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* 📝 Formulario de edición */}
        <View style={styles.formContainer}>
          
          {/* 🏷️ Nombre */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>🏷️ Nombre de la zona</Text>
            <TextInput
              style={styles.textInput}
              value={editedFence.nombre}
              onChangeText={(text) => setEditedFence(prev => ({ ...prev, nombre: text }))}
              placeholder="Ingresa el nombre..."
              placeholderTextColor={PASTEL_COLORS.lightText}
            />
          </View>

          {/* 📏 Radio */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>📏 Radio de alerta: {editedFence.radio}m</Text>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={1000}
              value={editedFence.radio}
              onValueChange={(value) => setEditedFence(prev => ({ ...prev, radio: Math.round(value) }))}
              minimumTrackTintColor={PASTEL_COLORS.lavender}
              maximumTrackTintColor={PASTEL_COLORS.border}
              thumbTintColor={PASTEL_COLORS.darkText}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>50m</Text>
              <Text style={styles.sliderLabel}>1000m</Text>
            </View>
          </View>

          {/* 🎨 Tipo de zona */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>🎨 Tipo de zona</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
              {Object.entries(FENCE_TYPES).map(([key, type]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeCard,
                    editedFence.tipo === key && styles.typeCardSelected
                  ]}
                  onPress={() => setEditedFence(prev => ({ ...prev, tipo: key as keyof typeof FENCE_TYPES }))}
                >
                  <LinearGradient
                    colors={type.gradient}
                    style={styles.typeGradient}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={styles.typeName}>{type.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

        </View>

        {/* 🗺️ Mini mapa de ubicación */}
        <View style={styles.mapSection}>
          <Text style={styles.inputLabel}>📍 Ubicación</Text>
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.miniMap}
              region={{
                latitude: editedFence.lat,
                longitude: editedFence.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setEditedFence(prev => ({ ...prev, lat: latitude, lng: longitude }));
              }}
            >
              <Marker
                coordinate={{ latitude: editedFence.lat, longitude: editedFence.lng }}
                title={editedFence.nombre}
                description={`Radio: ${editedFence.radio}m`}
              />
              
              <Circle
                center={{ latitude: editedFence.lat, longitude: editedFence.lng }}
                radius={editedFence.radio}
                fillColor={`${FENCE_TYPES[editedFence.tipo].border}30`}
                strokeColor={FENCE_TYPES[editedFence.tipo].border}
                strokeWidth={2}
              />
            </MapView>
            
            <TouchableOpacity style={styles.gpsButton} onPress={updateLocation}>
              <Text style={styles.gpsIcon}>🛰️</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.mapHint}>
            📍 Toca en el mapa para cambiar la ubicación
          </Text>
        </View>

      </ScrollView>

      {/* 💾 Botones de acción */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>❌ Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.saveButton,
            (!hasChanges || isLoading) && styles.saveButtonDisabled
          ]}
          onPress={saveChanges}
          disabled={!hasChanges || isLoading}
        >
          <LinearGradient
            colors={hasChanges ? [PASTEL_COLORS.lavender, PASTEL_COLORS.skyBlue] : [PASTEL_COLORS.border, PASTEL_COLORS.border]}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? '⏳ Guardando...' : '💾 Guardar'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
  changesBadge: {
    backgroundColor: PASTEL_COLORS.lemonYellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  changesText: {
    fontSize: 12,
    color: PASTEL_COLORS.darkText,
    fontWeight: '600',
  },

  // 📱 Scroll
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // 📝 Formulario
  formContainer: {
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: PASTEL_COLORS.darkText,
    borderWidth: 1,
    borderColor: PASTEL_COLORS.border,
  },
  slider: {
    height: 40,
    marginVertical: 10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
  },

  // 🎨 Tipos
  typesScroll: {
    marginVertical: 10,
  },
  typeCard: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: PASTEL_COLORS.darkText,
  },
  typeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
    textAlign: 'center',
  },

  // 🗺️ Mapa
  mapSection: {
    marginBottom: 20,
  },
  mapContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
  },
  miniMap: {
    height: 200,
    width: '100%',
  },
  gpsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsIcon: {
    fontSize: 20,
  },
  mapHint: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // 💾 Botones de acción
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: PASTEL_COLORS.border,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
  },
  saveButton: {
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: PASTEL_COLORS.darkText,
  },

  // ❌ Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    marginBottom: 30,
  },
});