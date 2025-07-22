import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { safeRoutesAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// COLORES PASTEL HERMOSOS
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

// TIPOS DE FEEDBACK
const FEEDBACK_TYPES = {
  SEGURIDAD: { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '⚠️', 
    name: 'Reports',
    gradient: ['#FFE5E5', '#FFCCCC'],
    description: 'Reporta problemas de seguridad'
  },
  TRAFICO: { 
    color: '#FFE8E0', 
    border: '#FFCCB3', 
    icon: '🚗', 
    name: 'Tráfico',
    gradient: ['#FFE8E0', '#FFD9CC'],
    description: 'Congestión, accidentes, vías'
  },
  INFRAESTRUCTURA: { 
    color: '#E5F3FF', 
    border: '#B3D9FF', 
    icon: '🏗️', 
    name: 'Infraestructura',
    gradient: ['#E5F3FF', '#CCE7FF'],
    description: 'Vías, puentes, obras públicas'
  },
  LIMPIEZA: { 
    color: '#E8F5E8', 
    border: '#B3F0B3', 
    icon: '🧹', 
    name: 'Limpieza',
    gradient: ['#E8F5E8', '#CCF2CC'],
    description: 'Basura, limpieza urbana'
  },
  OTRO: { 
    color: '#F0F0FF', 
    border: '#D9D9FF', 
    icon: '📝', 
    name: 'Otro',
    gradient: ['#F0F0FF', '#E6E6FF'],
    description: 'Otros temas urbanos'
  }
};

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

export default function EditFeedbackScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  // Recibe el feedback a editar como parámetro
  const { feedback } = (route.params as any) || {};

  const [editedFeedback, setEditedFeedback] = useState({
    ...feedback,
    comentario: feedback?.comentario ?? '',
    tipo: feedback?.tipo ?? 'SEGURIDAD',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Guardar cambios
  const saveFeedback = async () => {
    if (!editedFeedback.comentario.trim()) {
      Alert.alert('📝 Comentario requerido', 'Debes ingresar un comentario.');
      return;
    }
    setIsLoading(true);
    try {
      await safeRoutesAPI.updateFeedback({
        timestamp: feedback.timestamp,
        comentario: editedFeedback.comentario,
        tipo: editedFeedback.tipo
      });
      Alert.alert('✅ Feedback actualizado', 'Tu realimentación fue editada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('❌ Error', 'No se pudo actualizar el feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={PASTEL_COLORS.primaryGradient} style={styles.gradient} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Mis Realimentaciones</Text>
        </TouchableOpacity>
        <Text style={styles.title}>✏️ Editar Realimentación</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mapa mini */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={mapStylePastel}
            region={{
              latitude: feedback.lat,
              longitude: feedback.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{ latitude: feedback.lat, longitude: feedback.lng }}
              title="Lugar del reporte"
              description={FEEDBACK_TYPES[editedFeedback.tipo].name}
            />
          </MapView>
        </View>
        {/* Selector de tipo */}
        <View style={styles.typeSelectorContainer}>
          <Text style={styles.sectionTitle}>🎨 Tipo de Realimentación</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {Object.entries(FEEDBACK_TYPES).map(([key, type]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.typeCard,
                  { backgroundColor: type.color, borderColor: type.border },
                  editedFeedback.tipo === key && styles.typeCardSelected
                ]}
                onPress={() => setEditedFeedback(prev => ({ ...prev, tipo: key }))}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text style={styles.typeName}>{type.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Comentario */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>💬 Comentario</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={editedFeedback.comentario}
            onChangeText={text => setEditedFeedback(prev => ({ ...prev, comentario: text }))}
            multiline
            numberOfLines={5}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.inputHelper}>{editedFeedback.comentario.length}/300 caracteres</Text>
        </View>
        {/* Botón guardar */}
        <TouchableOpacity style={styles.saveButton} onPress={saveFeedback} disabled={isLoading}>
          <LinearGradient colors={[PASTEL_COLORS.lavender, PASTEL_COLORS.skyBlue]} style={styles.saveGradient}>
            <Text style={styles.saveButtonText}>{isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mapContainer: {
    height: height * 0.28,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
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
    width: 100,
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
    borderColor: PASTEL_COLORS.darkText,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    textAlign: 'center',
  },
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
    height: 100,
    textAlignVertical: 'top',
  },
  inputHelper: {
    fontSize: 12,
    color: PASTEL_COLORS.lightText,
    marginTop: 4,
    textAlign: 'right',
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 30,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
  },
});