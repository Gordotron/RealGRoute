import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RiskMapData {
  localidad: string;
  lat: number;
  lng: number;
  risk_score: number;
  risk_level: string;
}

export interface RiskPrediction {
  municipio: string;
  hora: number;
  risk_score: number;
  risk_level: string;
}

// 🆕 INTERFACE PARA PUNTOS OFICIALES DE SEGURIDAD
export interface SecurityPoint {
  lat: number;
  lng: number;
  risk_score: number;
  localidad: string;
  direccion: string;
  source: string;
}

// 🆕 INTERFACE PARA EQUIPAMIENTOS DE SEGURIDAD
export interface SecurityEquipment {
  type: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  risk_modifier: number;
}

// 🆕 INTERFACE PARA HEALTH CHECK DETALLADO
export interface HealthStatus {
  api_status: string;
  model_status: string;
  security_data_status: string;
  municipios_disponibles: number;
  data_directory: string;
}

export class SafeRoutesAPI {
  private baseURL = __DEV__ 
    ? 'http://192.168.2.9:8000'  // Tu FastAPI local
    : 'https://api.realgroute.com';  // Producción futura

  // 🌐 Configuración base
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      console.log(`🌐 API Call: ${this.baseURL}${endpoint}`);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // 🗺️ Obtener mapa de riesgo en tiempo real
  async getRiskMap(hora?: number, dia_semana?: number): Promise<RiskMapData[]> {
    try {
      // Usar hora actual si no se especifica
      const currentHour = hora || new Date().getHours();
      const currentDay = dia_semana || new Date().getDay();

      const data = await this.makeRequest<{risk_map: RiskMapData[]}>(
        `/risk-map?hora=${currentHour}&dia_semana=${currentDay}`
      );

      // 💾 Cache para offline
      await this.cacheRiskMap(data.risk_map);
      
      return data.risk_map;
    } catch (error) {
      console.log('🔄 Usando datos en cache...');
      return await this.getCachedRiskMap();
    }
  }

  // 🎯 Predecir riesgo para zona específica
  async predictRisk(
    municipio: string, 
    hora?: number, 
    dia_semana?: number
  ): Promise<RiskPrediction> {
    try {
      const currentHour = hora || new Date().getHours();
      const currentDay = dia_semana || new Date().getDay();

      const data = await this.makeRequest<RiskPrediction>('/predict-risk', {
        method: 'POST',
        body: JSON.stringify({
          municipio,
          hora: currentHour,
          dia_semana: currentDay,
          mes: new Date().getMonth() + 1
        })
      });

      return data;
    } catch (error) {
      // 🔄 Fallback heurístico
      return this.heuristicPrediction(municipio, hora || new Date().getHours());
    }
  }

  // 🔥 OBTENER PUNTOS OFICIALES DE SEGURIDAD (DATOS GOLD)
  async getOfficialSecurityPoints(): Promise<SecurityPoint[]> {
    try {
      console.log('🔥 Cargando puntos oficiales de seguridad...');
      
      const data = await this.makeRequest<{
        official_points: SecurityPoint[];
        total: number;
        data_source: string;
        precision: string;
      }>('/security-points');

      console.log(`✅ ${data.total} puntos oficiales cargados desde: ${data.data_source}`);
      
      // 💾 Cache de puntos oficiales
      await this.cacheSecurityPoints(data.official_points);
      
      return data.official_points;
    } catch (error) {
      console.log('🔄 Error cargando puntos oficiales, usando cache...');
      return await this.getCachedSecurityPoints();
    }
  }

  // 🏛️ OBTENER EQUIPAMIENTOS DE SEGURIDAD (CAI, POLICÍA)
  async getSecurityEquipment(): Promise<SecurityEquipment[]> {
    try {
      console.log('🏛️ Cargando equipamientos de seguridad...');
      
      const data = await this.makeRequest<{
        equipment: SecurityEquipment[];
        total: number;
        types: string[];
      }>('/security-equipment');

      console.log(`✅ ${data.total} equipamientos cargados: ${data.types.join(', ')}`);
      
      return data.equipment;
    } catch (error) {
      console.log('⚠️ Error cargando equipamientos de seguridad');
      return [];
    }
  }

  // 🚀 INTEGRAR DATOS OFICIALES AUTOMÁTICAMENTE
  async integrateOfficialData(): Promise<{success: boolean, message: string}> {
    try {
      console.log('🚀 Iniciando integración automática de datos oficiales...');
      
      const data = await this.makeRequest<{
        message: string;
        status: string;
        output?: string;
        error?: string;
      }>('/integrate-official-data', {
        method: 'POST'
      });

      const success = data.status === 'success';
      
      if (success) {
        console.log('✅ Integración exitosa!');
        // Limpiar caches para forzar recarga
        await this.clearAllCaches();
      }
      
      return {
        success,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error en integración automática:', error);
      return {
        success: false,
        message: `Error: ${error}`
      };
    }
  }

  // 🏥 Health check detallado del backend
  async healthCheck(): Promise<HealthStatus | null> {
    try {
      const data = await this.makeRequest<HealthStatus>('/health');
      return data;
    } catch (error) {
      console.log('❌ Health check failed');
      return null;
    }
  }

  // 🔍 Verificar si hay datos oficiales disponibles
  async hasOfficialData(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health?.security_data_status?.includes('oficiales') || false;
    } catch {
      return false;
    }
  }

  // 💾 Cache management para puntos de seguridad oficiales
  private async cacheSecurityPoints(data: SecurityPoint[]): Promise<void> {
    try {
      await AsyncStorage.setItem('security_points_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('⚠️ Error guardando cache de puntos de seguridad:', error);
    }
  }

  private async getCachedSecurityPoints(): Promise<SecurityPoint[]> {
    try {
      const cached = await AsyncStorage.getItem('security_points_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isRecent = Date.now() - timestamp < 86400000; // 24 horas
        
        if (isRecent) {
          console.log('📦 Usando puntos de seguridad en cache');
          return data;
        }
      }
    } catch (error) {
      console.log('⚠️ Error leyendo cache de seguridad:', error);
    }

    return []; // No hay fallback para datos oficiales
  }

  // 💾 Cache management para mapa de riesgo
  private async cacheRiskMap(data: RiskMapData[]): Promise<void> {
    try {
      await AsyncStorage.setItem('risk_map_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('⚠️ Error guardando cache:', error);
    }
  }

  private async getCachedRiskMap(): Promise<RiskMapData[]> {
    try {
      const cached = await AsyncStorage.getItem('risk_map_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isRecent = Date.now() - timestamp < 3600000; // 1 hora
        
        if (isRecent) {
          console.log('📦 Usando datos en cache (recientes)');
          return data;
        }
      }
    } catch (error) {
      console.log('⚠️ Error leyendo cache:', error);
    }

    // 🔄 Fallback a datos estáticos
    return this.getFallbackData();
  }

  // 🧹 Limpiar todos los caches
  private async clearAllCaches(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'risk_map_cache',
        'security_points_cache'
      ]);
      console.log('🧹 Caches limpiados');
    } catch (error) {
      console.log('⚠️ Error limpiando caches:', error);
    }
  }

  // 🔄 Predicción heurística de emergencia
  private heuristicPrediction(municipio: string, hora: number): RiskPrediction {
    const riskScores: Record<string, number> = {
      'CIUDAD BOLIVAR': 0.75,
      'SAN CRISTOBAL': 0.55,
      'USME': 0.48,
      'RAFAEL URIBE URIBE': 0.50,
      'USAQUEN': 0.15,
      'CHAPINERO': 0.18,
      'SUBA': 0.16
    };

    let baseRisk = riskScores[municipio.toUpperCase()] || 0.3;
    
    // Factor nocturno
    if (hora >= 20 || hora <= 6) {
      baseRisk += 0.2;
    }

    const finalRisk = Math.min(baseRisk, 1.0);
    
    return {
      municipio,
      hora,
      risk_score: finalRisk,
      risk_level: finalRisk < 0.3 ? 'Bajo' : finalRisk < 0.6 ? 'Medio' : 'Alto'
    };
  }

  // 📊 Datos de fallback
  private getFallbackData(): RiskMapData[] {
    return [
      { localidad: 'USAQUEN', lat: 4.7030, lng: -74.0350, risk_score: 0.15, risk_level: 'Bajo' },
      { localidad: 'CHAPINERO', lat: 4.6590, lng: -74.0630, risk_score: 0.18, risk_level: 'Bajo' },
      { localidad: 'CIUDAD BOLIVAR', lat: 4.4940, lng: -74.1430, risk_score: 0.75, risk_level: 'Alto' }
    ];
  }
}

// 🚀 Instancia global
export const safeRoutesAPI = new SafeRoutesAPI();