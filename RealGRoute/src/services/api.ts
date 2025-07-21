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

// 🆕 INTERFACES PARA AUTH
export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserProfile {
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

// 🆕 INTERFACES PARA FEEDBACK PROTEGIDO
export interface UserFeedbackRequest {
  lat: number;
  lng: number;
  tipo: string;
  comentario: string;
  fecha: string;
}

export interface UserZoneRequest {
  lat: number;
  lng: number;
  radio: number;
  nombre: string;
}

export interface SecurityPoint {
  lat: number;
  lng: number;
  risk_score: number;
  localidad: string;
  direccion: string;
  source: string;
}

export class SafeRoutesAPI {
  private baseURL = __DEV__ 
    ? 'http://192.168.2.9:8000'
    : 'https://api.realgroute.com';

  // 🔑 CONSTANTES PARA STORAGE
  private readonly TOKEN_KEY = 'realgroute_token';
  private readonly USER_KEY = 'realgroute_user';

  // 🌐 Configuración base CON AUTH AUTOMÁTICO
  // En la función makeRequest, actualizar el manejo de errores:

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      console.log(`🌐 API Call: ${this.baseURL}${endpoint}`);
    
      // 🔑 AGREGAR TOKEN AUTOMÁTICAMENTE
      const token = await this.getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options?.headers as Record<string, string>,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`🔑 Token attached: ${token.substring(0, 20)}...`);
      }

      // 🔍 LOG DEL REQUEST BODY PARA DEBUG
      if (options?.body) {
        console.log(`📤 Request body:`, JSON.parse(options.body as string));
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers,
        ...options,
      });

      if (!response.ok) {
        // 🔍 MANEJO DETALLADO DE ERRORES
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorBody = await response.text();
          console.log(`📥 Error response body:`, errorBody);
        
          if (errorBody) {
            try {
              const errorJson = JSON.parse(errorBody);
              if (errorJson.detail) {
                if (Array.isArray(errorJson.detail)) {
                  // Errores de validación de Pydantic
                  const validationErrors = errorJson.detail.map((err: any) => 
                    `${err.loc?.join('.')}: ${err.msg}`
                  ).join('\n');
                  errorMessage = `Errores de validación:\n${validationErrors}`;
                } else {
                  errorMessage = errorJson.detail;
                }
              }
            } catch {
              // Si no es JSON válido, usar el texto crudo
            errorMessage = errorBody;
            }
          }
        } catch (parseError) {
          console.log('⚠️ Could not parse error response');
        }

        // 🚨 MANEJAR TOKEN EXPIRADO
        if (response.status === 401) {
          console.log('🚨 Token expired, clearing auth...');
          await this.clearAuth();
          throw new Error('Token expirado - inicia sesión nuevamente');
        }
      
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // 🗑️ Eliminar zona
async deleteZone(nombre: string): Promise<{status: string, deleted: number}> {
  try {
    console.log(`🗑️ Deleting zone: ${nombre}`);
    
    const data = await this.makeRequest<{status: string, deleted: number}>('/user-fencing-zone', {
      method: 'DELETE',
      body: JSON.stringify({ nombre })
    });

    console.log(`✅ Zone deleted: ${nombre}`);
    return data;
  } catch (error) {
    console.error('❌ Error deleting zone:', error);
    throw error;
  }
}

// ✏️ Editar zona
async updateZone(nombre: string, updates: {
  nuevo_nombre?: string;
  nuevo_radio?: number;
  nueva_descripcion?: string;
}): Promise<{status: string, updated: any}> {
  try {
    console.log(`✏️ Updating zone: ${nombre}`, updates);
    
    const data = await this.makeRequest<{status: string, updated: any}>('/user-fencing-zone', {
      method: 'PUT',
      body: JSON.stringify({ nombre, ...updates })
    });

    console.log(`✅ Zone updated: ${nombre}`);
    return data;
  } catch (error) {
    console.error('❌ Error updating zone:', error);
    throw error;
  }
}

  // 🔑 =============== MÉTODOS DE AUTENTICACIÓN ===============

  async register(userData: UserRegistration): Promise<UserProfile> {
    console.log('🛡️ Registering user:', userData.username);
    
    const response = await this.makeRequest<UserProfile>('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    console.log('✅ Registration successful');
    return response;
  }

  async login(credentials: UserLogin): Promise<LoginResponse> {
    console.log('🔐 Logging in user:', credentials.username);
    
    const response = await this.makeRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    // 💾 GUARDAR TOKEN Y USUARIO
    await this.storeAuth(response.access_token, response.user);
    
    console.log('✅ Login successful');
    return response;
  }

  async logout(): Promise<void> {
    console.log('🚪 Logging out...');
    await this.clearAuth();
    console.log('✅ Logout successful');
  }

  async getCurrentUser(): Promise<UserProfile> {
    console.log('👤 Getting current user...');
    
    const response = await this.makeRequest<UserProfile>('/me');
    
    // 💾 ACTUALIZAR USUARIO GUARDADO
    await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(response));
    
    return response;
  }

  async validateToken(): Promise<boolean> {
    try {
      console.log('✅ Validating token...');
      
      await this.makeRequest('/validate-token');
      
      console.log('✅ Token is valid');
      return true;
    } catch (error) {
      console.log('❌ Token is invalid');
      await this.clearAuth();
      return false;
    }
  }

  // 💾 =============== GESTIÓN DE STORAGE ===============

  private async storeAuth(token: string, user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [this.TOKEN_KEY, token],
        [this.USER_KEY, JSON.stringify(user)]
      ]);
      console.log('💾 Auth data stored');
    } catch (error) {
      console.error('❌ Error storing auth:', error);
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  async getStoredUser(): Promise<UserProfile | null> {
    try {
      const userStr = await AsyncStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }
  }

  async getAuthState(): Promise<AuthState> {
    try {
      const [token, userStr] = await AsyncStorage.multiGet([
        this.TOKEN_KEY, 
        this.USER_KEY
      ]);
      
      const user = userStr[1] ? JSON.parse(userStr[1]) : null;
      
      return {
        isAuthenticated: !!(token[1] && user),
        user,
        token: token[1]
      };
    } catch (error) {
      console.error('❌ Error getting auth state:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null
      };
    }
  }

  private async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.TOKEN_KEY, this.USER_KEY]);
      console.log('🧹 Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
    }
  }

  // 🛡️ =============== ENDPOINTS PROTEGIDOS ===============

  async createFeedback(feedback: UserFeedbackRequest): Promise<any> {
    console.log('✍️ Creating feedback...');
    
    const response = await this.makeRequest('/user-feedback-crime', {
      method: 'POST',
      body: JSON.stringify(feedback)
    });

    console.log('✅ Feedback created');
    return response;
  }

  async getMyFeedbacks(): Promise<any[]> {
    console.log('📋 Getting my feedbacks...');
    
    const response = await this.makeRequest<{feedbacks: any[], total: number}>('/user-feedback-crime');
    
    return response.feedbacks;
  }

  async createZone(zone: UserZoneRequest): Promise<any> {
    console.log('🏠 Creating custom zone...');
    
    const response = await this.makeRequest('/user-fencing-zone', {
      method: 'POST',
      body: JSON.stringify(zone)
    });

    console.log('✅ Zone created');
    return response;
  }

  async getMyZones(): Promise<any[]> {
    console.log('📍 Getting my zones...');
    
    const response = await this.makeRequest<{zones: any[], total: number}>('/user-fencing-zone');
    
    return response.zones;
  }

  // 🗺️ =============== ENDPOINTS PÚBLICOS (SIN CAMBIOS) ===============

  async getRiskMap(hora?: number, dia_semana?: number): Promise<RiskMapData[]> {
    try {
      const currentHour = hora || new Date().getHours();
      const currentDay = dia_semana || new Date().getDay();

      const data = await this.makeRequest<{risk_map: RiskMapData[]}>(
        `/risk-map?hora=${currentHour}&dia_semana=${currentDay}`
      );

      await this.cacheRiskMap(data.risk_map);
      
      return data.risk_map;
    } catch (error) {
      console.log('🔄 Usando datos en cache...');
      return await this.getCachedRiskMap();
    }
  }

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
      return this.heuristicPrediction(municipio, hora || new Date().getHours());
    }
  }

  async getOfficialSecurityPoints(): Promise<SecurityPoint[]> {
    try {
      console.log('🔥 Cargando puntos oficiales de seguridad...');
      
      const data = await this.makeRequest<{
        official_points: SecurityPoint[];
        total: number;
        data_source: string;
      }>('/security-points');

      console.log(`✅ ${data.total} puntos oficiales cargados`);
      
      await this.cacheSecurityPoints(data.official_points);
      
      return data.official_points;
    } catch (error) {
      console.log('🔄 Error cargando puntos oficiales, usando cache...');
      return await this.getCachedSecurityPoints();
    }
  }

  // 💾 =============== CACHE METHODS (SIN CAMBIOS) ===============

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
        const isRecent = Date.now() - timestamp < 3600000;
        
        if (isRecent) {
          console.log('📦 Usando datos en cache (recientes)');
          return data;
        }
      }
    } catch (error) {
      console.log('⚠️ Error leyendo cache:', error);
    }

    return this.getFallbackData();
  }

  private async cacheSecurityPoints(data: SecurityPoint[]): Promise<void> {
    try {
      await AsyncStorage.setItem('security_points_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('⚠️ Error guardando cache de puntos:', error);
    }
  }

  private async getCachedSecurityPoints(): Promise<SecurityPoint[]> {
    try {
      const cached = await AsyncStorage.getItem('security_points_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isRecent = Date.now() - timestamp < 86400000;
        
        if (isRecent) {
          console.log('📦 Usando puntos de seguridad en cache');
          return data;
        }
      }
    } catch (error) {
      console.log('⚠️ Error leyendo cache de seguridad:', error);
    }

    return [];
  }

  // 🔄 FALLBACK METHODS (SIN CAMBIOS)
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

  private getFallbackData(): RiskMapData[] {
    return [
      { localidad: 'USAQUEN', lat: 4.7030, lng: -74.0350, risk_score: 0.15, risk_level: 'Bajo' },
      { localidad: 'CHAPINERO', lat: 4.6590, lng: -74.0630, risk_score: 0.18, risk_level: 'Bajo' },
      { localidad: 'CIUDAD BOLIVAR', lat: 4.4940, lng: -74.1430, risk_score: 0.75, risk_level: 'Alto' }
    ];
  }
}

// 🚀 Instancia global con AUTH
export const safeRoutesAPI = new SafeRoutesAPI();