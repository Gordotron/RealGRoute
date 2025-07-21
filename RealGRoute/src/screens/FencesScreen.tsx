import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
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
  border: '#E8E8F0',
  shadow: '#D8D8E8',
  darkText: '#4A4A6A',
  mediumText: '#6A6A8A',
  lightText: '#8A8AAA',
  cardBg: '#FDFDFF',
  overlayBg: 'rgba(248, 244, 255, 0.95)',
  white: '#FFFFFF',
};

// 🎨 TIPOS DE FENCES CON COLORES PASTEL
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

export default function FencesScreen() {
  const navigation = useNavigation();
  
  // 🔄 Estados
  const [myFences, setMyFences] = useState<UserFence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    mostUsedType: 'HOME'
  });

  // 🚀 Cargar mis fences al iniciar
  useEffect(() => {
    loadMyFences();
  }, []);

  // ✅ Y AGREGA ESTE NUEVO useFocusEffect después:
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 FencesScreen focused - reloading fences...');
      loadMyFences();
    }, [])
  );

  const loadMyFences = async () => {
    try {
      console.log('🏠 Loading user fences...');
      setIsLoading(true);
      
      const fences = await safeRoutesAPI.getMyZones();
      
      // 🎨 Enriquecer con tipos por defecto
      const enrichedFences = fences.map(fence => ({
        ...fence,
        tipo: fence.tipo || 'CUSTOM' as keyof typeof FENCE_TYPES
      }));
      
      setMyFences(enrichedFences);
      
      // 📊 Calcular estadísticas
      let mostUsed: keyof typeof FENCE_TYPES = 'HOME';

      if (enrichedFences.length > 0) {
        const typeCount = enrichedFences.reduce((acc, fence) => {
            acc[fence.tipo] = (acc[fence.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const mostUsedEntry = Object.entries(typeCount).reduce((a, b) => 
            typeCount[a[0]] > typeCount[b[0]] ? a : b
        );
        
        mostUsed = mostUsedEntry[0] as keyof typeof FENCE_TYPES;
    }
      
      setStats({
        total: enrichedFences.length,
        active: enrichedFences.length, // Todas están activas por ahora
        mostUsedType: mostUsed as keyof typeof FENCE_TYPES
      });
      
      console.log(`✅ Loaded ${enrichedFences.length} fences`);
      
    } catch (error) {
      console.error('❌ Error loading fences:', error);
      Alert.alert('Error', 'No se pudieron cargar tus zonas');
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ Eliminar fence
const deleteFence = async (fenceName: string) => {
  Alert.alert(
    '🗑️ Eliminar Zona',
    `¿Estás seguro de eliminar "${fenceName}"?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            const result = await safeRoutesAPI.deleteZone(fenceName);
            
            if (result.deleted > 0) {
              Alert.alert('✅ Eliminado', `Zona "${fenceName}" eliminada correctamente`);
              loadMyFences(); // Recargar lista
            } else {
              Alert.alert('⚠️ No encontrado', `Zona "${fenceName}" no se encontró`);
            }
          } catch (error) {
            console.error('❌ Error deleting fence:', error);
            Alert.alert('❌ Error', 'No se pudo eliminar la zona');
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]
  );
};

  // 📍 Render de cada fence
  const renderFenceCard = (fence: UserFence, index: number) => {
    const fenceType = FENCE_TYPES[fence.tipo || 'CUSTOM'];
    
    return (
      <TouchableOpacity
        key={`${fence.nombre}-${index}`}
        style={styles.fenceCard}
        onPress={() => {
          Alert.alert(
            `📍 ${fence.nombre}`,
            `🎨 Tipo: ${FENCE_TYPES[fence.tipo]?.name || 'Personalizada'}\n📏 Radio: ${fence.radio}m\n📍 Coordenadas: ${fence.lat.toFixed(4)}, ${fence.lng.toFixed(4)}`,
            [
                { text: 'Cerrar', style: 'cancel' },
                { text: '✏️ Editar', onPress: () => navigation.navigate('EditFence' as never, { fence } as never) },
                { text: '🗺️ Ver en Mapa', onPress: () => {
                  navigation.navigate('Map' as never, { 
                      focusFence: {
                        lat: fence.lat,
                        lng: fence.lng,
                        radio: fence.radio,
                        nombre: fence.nombre,
                        tipo: fence.tipo
                      } 
                  } as never);
                }}
            ]
        );
        }}
      >
        <LinearGradient
          colors={fenceType.gradient}
          style={styles.fenceGradient}
        >
          {/* 🎨 Header de la card */}
          <View style={styles.fenceHeader}>
            <View style={styles.fenceIconContainer}>
              <Text style={styles.fenceIcon}>{fenceType.icon}</Text>
            </View>
            
            <View style={styles.fenceInfo}>
              <Text style={styles.fenceName}>{fence.nombre}</Text>
              <Text style={styles.fenceType}>{fenceType.name}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteFence(fence.nombre)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
          
          {/* 📏 Detalles de la zona */}
          <View style={styles.fenceDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📏</Text>
              <Text style={styles.detailText}>{fence.radio}m radio</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>
                {fence.lat.toFixed(4)}, {fence.lng.toFixed(4)}
              </Text>
            </View>
          </View>
          
          {/* 📊 Footer con acciones */}
          <View style={styles.fenceFooter}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('EditFence' as never, { fence } as never)}
            >
              <Text style={styles.actionText}>✏️ Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('Map' as never, { 
                    focusFence: {
                        lat: fence.lat,
                        lng: fence.lng,
                        radio: fence.radio,
                        nombre: fence.nombre,
                        tipo: fence.tipo
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
        
        <Text style={styles.title}>🏠 Mis Zonas Personales</Text>
        <Text style={styles.subtitle}>Gestiona tus lugares importantes</Text>
      </View>

      {/* 📊 Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📍</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Zonas Creadas</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Activas</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>{FENCE_TYPES[stats.mostUsedType]?.icon}</Text>
          <Text style={styles.statValue}>{FENCE_TYPES[stats.mostUsedType]?.name}</Text>
          <Text style={styles.statLabel}>Más Usada</Text>
        </View>
      </View>

      {/* 🏠 Lista de mis fences */}
      <ScrollView 
        style={styles.fencesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.fencesContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>⏳</Text>
            <Text style={styles.loadingText}>Cargando tus zonas...</Text>
          </View>
        ) : myFences.length > 0 ? (
          myFences.map((fence, index) => renderFenceCard(fence, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏡</Text>
            <Text style={styles.emptyTitle}>No tienes zonas creadas</Text>
            <Text style={styles.emptyText}>
              Crea tu primera zona personalizada para recibir alertas y 
              personalizar tu experiencia de navegación
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ➕ Botón flotante para crear nueva zona */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('CreateFence' as never)}
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

  // 🏠 Fences List
  fencesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fencesContent: {
    paddingBottom: 100,
  },
  fenceCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: PASTEL_COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fenceGradient: {
    padding: 20,
  },
  fenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fenceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PASTEL_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fenceIcon: {
    fontSize: 24,
  },
  fenceInfo: {
    flex: 1,
  },
  fenceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PASTEL_COLORS.darkText,
    marginBottom: 2,
  },
  fenceType: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  fenceDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: PASTEL_COLORS.mediumText,
  },
  fenceFooter: {
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