import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { safeRoutesAPI, UserFeedbackRequest } from '../services/api'; // 🔧 Usar tu interface

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
  border: '#E8E8F0',
  shadow: '#D8D8E8',
  darkText: '#4A4A6A',
  mediumText: '#6A6A8A',
  lightText: '#8A8AAA',
  cardBg: '#FDFDFF',
  white: '#FFFFFF',
};

// 🎨 TIPOS DE FEEDBACK CON COLORES - ACTUALIZADO PARA TU API
const FEEDBACK_TYPES = {
  'SEGURIDAD': { 
    color: '#FFE5E5', 
    border: '#FFB3B3', 
    icon: '⚠️', 
    name: 'Reports',
    gradient: ['#FFE5E5', '#FFCCCC']
  },
  'TRAFICO': { 
    color: '#FFE8E0', 
    border: '#FFCCB3', 
    icon: '🚗', 
    name: 'Tráfico',
    gradient: ['#FFE8E0', '#FFD9CC']
  },
  'INFRAESTRUCTURA': { 
    color: '#E5F3FF', 
    border: '#B3D9FF', 
    icon: '🏗️', 
    name: 'Advice',
    gradient: ['#E5F3FF', '#CCE7FF']
  },
  'LIMPIEZA': { 
    color: '#E8F5E8', 
    border: '#B3F0B3', 
    icon: '🧹', 
    name: 'Limpieza',
    gradient: ['#E8F5E8', '#CCF2CC']
  },
  'OTRO': { 
    color: '#F0F0FF', 
    border: '#D9D9FF', 
    icon: '📝', 
    name: 'Otro',
    gradient: ['#F0F0FF', '#E6E6FF']
  }
};

// 🏠 INTERFACE PARA FEEDBACK - EXTENDIDA DE TU API
interface UserFeedback extends UserFeedbackRequest {
  id?: number;
  usuario?: string;
  created_at?: string;
  updated_at?: string;
}

export default function FeedbackScreen() {
  const navigation = useNavigation();
  
  // 🔄 Estados
  const [myFeedbacks, setMyFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('user');
  const [stats, setStats] = useState({
    total: 0,
    mostUsedType: 'SEGURIDAD' as keyof typeof FEEDBACK_TYPES
  });

  // 🚀 Cargar mis feedbacks al iniciar
  useEffect(() => {
    loadMyFeedbacks();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const storedUser = await safeRoutesAPI.getStoredUser();
      if (storedUser?.username) {
        setCurrentUser(storedUser.username);
      }
    } catch (error) {
      console.error('❌ Error loading user:', error);
      setCurrentUser('user');
    }
  };

  // ✅ Recargar cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 FeedbackScreen focused - reloading feedbacks...');
      loadMyFeedbacks();
    }, [])
  );

  const loadMyFeedbacks = async () => {
    try {
        console.log('🗣️ Loading user feedbacks...');
        setIsLoading(true);
    
        const feedbacks = await safeRoutesAPI.getMyFeedbacks();
    
        // 🔍 DEBUG: Ver estructura de datos
        console.log('📋 Raw feedbacks from API:', JSON.stringify(feedbacks, null, 2));
    
        // 🎨 Enriquecer con tipos por defecto y validar estructura
        const enrichedFeedbacks = feedbacks.map((feedback, index) => {
            console.log(`🔍 Feedback ${index}:`, {
                id: feedback.id,
                hasId: !feedback.id,
                keys: Object.keys(feedback)
            });
            
            return {
                ...feedback,
                tipo: (feedback.tipo || 'OTRO') as keyof typeof FEEDBACK_TYPES,
            };
        });
    
    setMyFeedbacks(enrichedFeedbacks);
    
    // 📊 Calcular estadísticas
    calculateStats(enrichedFeedbacks);
    
    console.log(`✅ Loaded ${enrichedFeedbacks.length} feedbacks`);
    
  } catch (error) {
    console.error('❌ Error loading feedbacks:', error);
    Alert.alert('Error', 'No se pudieron cargar tus realimentaciones');
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
};

  // 📊 Calcular estadísticas
  const calculateStats = (feedbacks: UserFeedback[]) => {
    if (feedbacks.length === 0) {
      setStats({ total: 0, mostUsedType: 'SEGURIDAD' });
      return;
    }

    const total = feedbacks.length;
    
    // Tipo más usado
    const typeCount = feedbacks.reduce((acc, feedback) => {
      acc[feedback.tipo] = (acc[feedback.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedEntry = Object.entries(typeCount).reduce((a, b) => 
      typeCount[a[0]] > typeCount[b[0]] ? a : b
    );
    
    setStats({
      total,
      mostUsedType: mostUsedEntry[0] as keyof typeof FEEDBACK_TYPES
    });
  };

  // 🗑️ Eliminar feedback
  const deleteFeedback = async (feedbackTimestamp: string, comentario: string) => {
  Alert.alert(
    '🗑️ Eliminar Realimentación',
    `¿Estás seguro de eliminar este feedback?\n\n"${comentario.substring(0, 50)}..."`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            
            // ✅ USAR TIMESTAMP COMO ID
            const result = await safeRoutesAPI.deleteFeedback(feedbackTimestamp);

            console.log(`🗑️ Deleted feedback with ID: ${feedbackTimestamp}`);
            console.log(`🔍 ID type: ${typeof feedbackTimestamp}`);
            console.log(`🔍 ID value: "${feedbackTimestamp}"`);
            console.log(`🔍 ID length: ${feedbackTimestamp.length}`);
            
            // 🔄 Recargar lista después de eliminar
            await loadMyFeedbacks();
            
            Alert.alert(
              '✅ Eliminado',
              'La realimentación ha sido eliminada correctamente'
            );
            
          } catch (error) {
            console.error('❌ Error deleting feedback - FULL ERROR:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            
            Alert.alert('❌ Error', `No se pudo eliminar la realimentación: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]
  );
};

  // 📝 Render de cada feedback card
  const renderFeedbackCard = (feedback: UserFeedback, index: number) => {
    const feedbackType = FEEDBACK_TYPES[feedback.tipo || 'OTRO'];
    const createdDate = feedback.fecha ? new Date(feedback.fecha).toLocaleDateString('es-CO') : 'Sin fecha';
    
    return (
      <TouchableOpacity
        key={`${feedback.timestamp || index}`}
        style={styles.feedbackCard}
        onPress={() => {
          Alert.alert(
            `🗣️ ${feedbackType.name}`,
            `📍 Ubicación: ${feedback.lat.toFixed(4)}, ${feedback.lng.toFixed(4)}\n📅 Fecha: ${createdDate}\n\n💬 "${feedback.comentario}"`,
            [
              { text: 'Cerrar', style: 'cancel' },
              { 
                text: '✏️ Editar', 
                onPress: () => {navigation.navigate('EditFeedback' as never, { feedback } as never);}
              },
              { 
                text: '🗺️ Ver en Mapa',
                onPress: () => {
                  navigation.navigate('Map' as never, { 
                    focusFeedback: {
                      lat: feedback.lat,
                      lng: feedback.lng,
                      tipo: feedback.tipo,
                      comentario: feedback.comentario,
                      fecha: feedback.fecha
                    } 
                  } as never);
                }
              }
            ]
          );
        }}
      >
        <LinearGradient
          colors={feedbackType.gradient}
          style={styles.feedbackGradient}
        >
          {/* 🎨 Header de la card */}
          <View style={styles.feedbackHeader}>
            <View style={styles.feedbackIconContainer}>
              <Text style={styles.feedbackIcon}>{feedbackType.icon}</Text>
            </View>
            
            <View style={styles.feedbackInfo}>
              <Text style={styles.feedbackType}>{feedbackType.name}</Text>
              <Text style={styles.feedbackDate}>{createdDate}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                if (feedback.timestamp) {
                    deleteFeedback(feedback.timestamp, feedback.comentario);
                } else {
                    Alert.alert('❌ Error', 'No se puede eliminar: timestamp no encontrado');
                }
            }}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
          
          {/* 💬 Comentario */}
          <Text style={styles.feedbackComment} numberOfLines={3}>
            "{feedback.comentario}"
          </Text>
          
          {/* 📍 Ubicación */}
          <View style={styles.locationSection}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {feedback.lat.toFixed(4)}, {feedback.lng.toFixed(4)}
            </Text>
          </View>
          
          {/* 📊 Footer con acciones */}
          <View style={styles.feedbackFooter}>
            <TouchableOpacity 
              style={styles.actionButton}
              
            >
              <Text style={styles.actionText}>✏️ Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('Map' as never, { 
                  focusFeedback: {
                    lat: feedback.lat,
                    lng: feedback.lng,
                    tipo: feedback.tipo,
                    comentario: feedback.comentario,
                    fecha: feedback.fecha
                  } 
                } as never);
              }}
            >
              <Text style={styles.actionText}>🗺️ Ver en Mapa</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
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
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>🗣️ Mis Realimentaciones</Text>
        <Text style={styles.subtitle}>Comparte tu experiencia en Bogotá</Text>
      </View>

      {/* 📊 Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗣️</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Enviadas</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>{FEEDBACK_TYPES[stats.mostUsedType]?.icon}</Text>
          <Text style={styles.statValue}>{FEEDBACK_TYPES[stats.mostUsedType]?.name}</Text>
          <Text style={styles.statLabel}>Más Usada</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👤</Text>
          <Text style={styles.statValue}>{currentUser}</Text>
          <Text style={styles.statLabel}>Usuario</Text>
        </View>
      </View>

      {/* 🗣️ Lista de mis feedbacks */}
      <ScrollView 
        style={styles.feedbacksList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedbacksContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMyFeedbacks();
            }}
            colors={[PASTEL_COLORS.lavender]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>⏳</Text>
            <Text style={styles.loadingText}>Cargando realimentaciones...</Text>
          </View>
        ) : myFeedbacks.length > 0 ? (
          myFeedbacks.map((feedback, index) => renderFeedbackCard(feedback, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗣️</Text>
            <Text style={styles.emptyTitle}>No tienes realimentaciones</Text>
            <Text style={styles.emptyText}>
              Comparte tu experiencia sobre seguridad, tráfico, infraestructura 
              y más para ayudar a mejorar la ciudad
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ➕ Botón flotante para crear nueva realimentación */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('CreateFeedback' as never)}
      >
        <LinearGradient
          colors={[PASTEL_COLORS.lavender, PASTEL_COLORS.skyBlue]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>➕</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Estilos iguales que antes...
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  
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

  // 📊 Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: PASTEL_COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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

  // 🗣️ Feedbacks List
  feedbacksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  feedbacksContent: {
    paddingBottom: 100,
  },
  feedbackCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackGradient: {
    padding: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PASTEL_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedbackIcon: {
    fontSize: 24,
  },
  feedbackInfo: {
    flex: 1,
  },
  feedbackType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 2,
  },
  feedbackDate: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },

  // 💬 Comment
  feedbackComment: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },

  // 📍 Location
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: PASTEL_COLORS.mediumText,
  },

  // 📊 Footer
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: PASTEL_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    opacity: 0.9,
  },
  actionText: {
    fontSize: 12,
    color: PASTEL_COLORS.darkText,
    fontWeight: '600',
  },

  // 🔄 Loading & Empty
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: PASTEL_COLORS.mediumText,
    textAlign: 'center',
    lineHeight: 24,
  },

  // ➕ FAB
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: PASTEL_COLORS.darkText,
  },
});