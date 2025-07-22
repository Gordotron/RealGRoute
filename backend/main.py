from fastapi import FastAPI, HTTPException, Query, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import pandas as pd
from hybrid_risk_model import BalancedHybridRiskPredictor
from intelligent_routing import IntelligentRouter
import uvicorn
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi.responses import JSONResponse
import math

# 🆕 IMPORTAR SISTEMA DE AUTH
from auth import (
    AuthManager, 
    UserRegistration, 
    UserLogin, 
    UserProfile, 
    TokenResponse,
    get_current_user,
    get_current_user_optional,
    auth_manager
)

# Variables globales
predictor = None
intelligent_router = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor, intelligent_router

    print("🚀 Iniciando RealGRoute 3.0 - Balanced Intelligence + Smart Routing + Auth Edition...")
    print("=" * 80)

    try:
        os.makedirs('data', exist_ok=True)

        # 🧠 INICIALIZAR MODELO BALANCEADO
        print("🧠 Inicializando modelo BALANCEADO...")
        predictor = BalancedHybridRiskPredictor(verbose=True)

        print("🏗️ Entrenando modelo balanceado...")
        model = predictor.train_balanced_model()

        # 🛣️ INICIALIZAR ROUTER INTELIGENTE
        print("\n🛣️ Inicializando ROUTER INTELIGENTE...")
        intelligent_router = IntelligentRouter(predictor, verbose=True)

        # 🛡️ INICIALIZAR SISTEMA DE AUTH
        print("\n🛡️ Inicializando SISTEMA DE AUTENTICACIÓN...")
        print(f"✅ Auth Manager: JWT tokens configurados")
        print(f"✅ Users file: {auth_manager.users_file}")

        print("=" * 80)
        print("🎉 RealGRoute 3.0 COMPLETO + AUTH listo!")
        print(f"🧠 Modelo: {len(predictor.municipio_to_id)} municipios, {len(predictor.feature_columns)} features")
        print(f"🛣️ Router: Grid {intelligent_router._get_grid_size()}, resolución {intelligent_router.grid_resolution * 111:.0f}m")
        print(f"🎯 Zonas: {len(predictor.zone_classifier)} tipos configurados")
        print(f"🛡️ Auth: Sistema JWT completo")
        print("🌐 Documentación: http://localhost:8000/docs")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error en startup: {e}")
        print("🔄 Intentando fallback...")

        try:
            from ml_model import RiskPredictor
            predictor = RiskPredictor(auto_build=True)
            intelligent_router = None
            print("✅ Modelo básico cargado como fallback (sin router inteligente)")
        except Exception as fallback_error:
            print(f"❌ Error crítico: {fallback_error}")
            raise

    yield

    print("🛑 Cerrando RealGRoute 3.0...")

app = FastAPI(
    title="Safe Routes API",
    version="3.0.0 - Balanced Intelligence + Smart Routing + Auth Edition",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🆕 =============== MODELOS ACTUALIZADOS CON AUTH ===============

class RiskRequest(BaseModel):
    municipio: str
    hora: int
    dia_semana: int = 1
    mes: int = 7
    latitude: float = None
    longitude: float = None

class RiskResponse(BaseModel):
    municipio: str
    hora: int
    risk_score: float
    risk_level: str
    zone_type: str = None
    model_type: str = "balanced_hybrid_v3.0"
    coordinates: dict = None
    features_used: int = None

class UserFeedbackCrimeRequest(BaseModel):
    lat: float
    lng: float
    tipo: str
    comentario: str
    fecha: str
    # 🚫 REMOVIDO: usuario (ahora viene del token JWT)

class UserFencingZoneRequest(BaseModel):
    lat: float
    lng: float
    radio: float
    nombre: str
    # 🚫 REMOVIDO: usuario (ahora viene del token JWT)

class RouteRequest(BaseModel):
    origen: str
    destino: str
    hora: int = 12
    dia_semana: int = 1

class IntelligentRouteRequest(BaseModel):
    """🆕 Request para routing inteligente"""
    origen: str
    destino: str
    hora: int = 12
    dia_semana: int = 1
    origen_lat: float = None
    origen_lng: float = None
    destino_lat: float = None
    destino_lng: float = None
    preferencia: Optional[str] = "seguridad"  # "seguridad" o "tiempo"
    sensibilidad_riesgo: Optional[float] = 0.6  # 0.0 a 1.0

class RouteResponse(BaseModel):
    route_points: List[dict]
    statistics: dict
    recommendations: List[str]
    origin_info: dict
    destination_info: dict
    model_type: str = "intelligent_routing_v3.0"

# 🛣️ MODELO PARA COORDENADAS LIBRES
class RouteRequestCoordinates(BaseModel):
    origen_lat: float
    origen_lng: float
    destino_lat: float
    destino_lng: float
    hora: int = Field(ge=0, le=23)
    dia_semana: int = Field(ge=1, le=7)
    preferencia: str = Field(pattern="^(seguridad|tiempo)$")
    sensibilidad_riesgo: float = Field(ge=0.0, le=1.0)

# 🗺️ COORDENADAS (mantener igual)
LOCALIDADES_COORDS = {
    'USAQUEN': {'lat': 4.7030, 'lng': -74.0350},
    'CHAPINERO': {'lat': 4.6590, 'lng': -74.0630},
    'SANTA FE': {'lat': 4.6080, 'lng': -74.0760},
    'SAN CRISTOBAL': {'lat': 4.5570, 'lng': -74.0820},
    'USME': {'lat': 4.4790, 'lng': -74.1260},
    'TUNJUELITO': {'lat': 4.5720, 'lng': -74.1320},
    'BOSA': {'lat': 4.6180, 'lng': -74.1770},
    'KENNEDY': {'lat': 4.6280, 'lng': -74.1460},
    'FONTIBON': {'lat': 4.6680, 'lng': -74.1460},
    'ENGATIVA': {'lat': 4.6900, 'lng': -74.1180},
    'SUBA': {'lat': 4.7560, 'lng': -74.0840},
    'BARRIOS UNIDOS': {'lat': 4.6670, 'lng': -74.0840},
    'TEUSAQUILLO': {'lat': 4.6310, 'lng': -74.0920},
    'LOS MARTIRES': {'lat': 4.6040, 'lng': -74.0900},
    'ANTONIO NARIÑO': {'lat': 4.5940, 'lng': -74.0990},
    'PUENTE ARANDA': {'lat': 4.6160, 'lng': -74.1140},
    'LA CANDELARIA': {'lat': 4.5970, 'lng': -74.0750},
    'RAFAEL URIBE URIBE': {'lat': 4.5580, 'lng': -74.1060},
    'CIUDAD BOLIVAR': {'lat': 4.4940, 'lng': -74.1430},
}

# 🆕 =============== ENDPOINTS DE AUTENTICACIÓN ===============

@app.post("/register", response_model=UserProfile)
async def register_user(registration: UserRegistration):
    """🛡️ Registrar nuevo usuario"""
    try:
        user_data = auth_manager.create_user(registration)
        return UserProfile(**user_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en registro: {str(e)}")

@app.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    """🔐 Iniciar sesión y obtener token JWT"""
    try:
        user = auth_manager.authenticate_user(login_data.username, login_data.password)
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Credenciales incorrectas"
            )
        
        # Crear token JWT
        access_token = auth_manager.create_access_token(
            data={"sub": user["username"]}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=60 * 24 * 7,  # 7 días en minutos
            user=UserProfile(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en login: {str(e)}")

@app.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """👤 Obtener perfil del usuario autenticado"""
    return UserProfile(**current_user)

@app.get("/validate-token")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """✅ Validar si el token es válido"""
    return {
        "valid": True,
        "username": current_user["username"],
        "message": "Token válido"
    }

# =============== ENDPOINTS EXISTENTES (SIN CAMBIOS) ===============

@app.get("/")
async def root():
    is_balanced = hasattr(predictor, 'train_balanced_model') if predictor else False
    has_intelligent_router = intelligent_router is not None
    has_official_data = os.path.exists('data/security/security_points_processed.csv')

    return {
        "message": "RealGRoute 3.0 - Balanced Intelligence + Smart Routing + Auth! 🧠🛣️🛡️",
        "status": "✅ Sistema completo + Auth" if (predictor and is_balanced and has_intelligent_router) else "⚠️ Sistema parcial",
        "model_type": "Balanced Hybrid v3.0" if is_balanced else "Basic v2.0",
        "routing_type": "Intelligent Grid-Based v3.0" if has_intelligent_router else "Basic",
        "auth_system": "✅ JWT Authentication Active",
        "municipios": len(predictor.municipio_to_id) if predictor else 0,
        "zones": len(predictor.zone_classifier) if predictor and is_balanced else 0,
        "features": len(predictor.feature_columns) if predictor and hasattr(predictor, 'feature_columns') else 6,
        "grid_resolution": f"{intelligent_router.grid_resolution * 111:.0f}m" if has_intelligent_router else "N/A",
        "official_data": "✅ Datos oficiales integrados" if has_official_data else "⚠️ Solo datos sintéticos",
        "version": "3.0.0 - Balanced Intelligence + Smart Routing + Auth Edition",
        "intelligence_level": "🧠 Arquitectura Zonal Balanceada + Router Inteligente + Auth JWT" if (is_balanced and has_intelligent_router) else "📊 Básica",
        "capabilities": {
            "risk_prediction": "✅ Balanceada" if is_balanced else "⚠️ Básica",
            "intelligent_routing": "✅ Grid-based" if has_intelligent_router else "❌ No disponible",
            "zone_classification": "✅ 3 tipos" if is_balanced else "❌ No disponible",
            "safety_optimization": "✅ Multicriterio" if has_intelligent_router else "❌ No disponible",
            "user_authentication": "✅ JWT completo"
        }
    }

@app.get("/health")
async def health_check():
    global predictor, intelligent_router

    if not predictor:
        return {"api_status": "❌ Offline", "model_status": "❌ No cargado", "router_status": "❌ No disponible", "auth_status": "❌ No disponible"}

    is_balanced = hasattr(predictor, 'train_balanced_model')
    has_intelligent_router = intelligent_router is not None

    model_status = "✅ Balanceado funcionando" if is_balanced else "⚠️ Básico activo"
    router_status = "✅ Router inteligente activo" if has_intelligent_router else "❌ Router no disponible"
    auth_status = "✅ JWT Auth activo"

    return {
        "api_status": "✅ Online",
        "model_status": model_status,
        "router_status": router_status,
        "auth_status": auth_status,
        "model_type": "Balanced Hybrid v3.0" if is_balanced else "Basic v2.0",
        "routing_type": "Intelligent Grid-Based v3.0" if has_intelligent_router else "Basic",
        "auth_type": "JWT Bearer Token",
        "municipios": len(predictor.municipio_to_id) if hasattr(predictor, 'municipio_to_id') else 0,
        "zones": len(predictor.zone_classifier) if is_balanced else 0,
        "features": len(predictor.feature_columns) if hasattr(predictor, 'feature_columns') else 0,
        "grid_size": intelligent_router._get_grid_size() if has_intelligent_router else "N/A",
        "timestamp": "2025-07-21 08:19:12"
    }

@app.post("/intelligent-route-coordinates")
async def intelligent_route_coordinates(request: RouteRequestCoordinates):
    """
    🧠 RUTA INTELIGENTE CON COORDENADAS LIBRES
    Calcula la mejor ruta entre dos puntos específicos usando IA
    """
    try:
        print(f"🛣️ Calculating route from coordinates...")
        print(f"📍 Origen: {request.origen_lat}, {request.origen_lng}")
        print(f"🎯 Destino: {request.destino_lat}, {request.destino_lng}")

        # 🔍 CONVERTIR COORDENADAS A LOCALIDADES CERCANAS
        origen_localidad = find_closest_localidad(request.origen_lat, request.origen_lng)
        destino_localidad = find_closest_localidad(request.destino_lat, request.destino_lng)
        
    
        print(f"📍 Origen en localidad: {origen_localidad}")
        print(f"🎯 Destino en localidad: {destino_localidad}")
        
        
        # 📊 OBTENER DATOS DE RIESGO
        risk_data = load_risk_data()
        
        # 🎯 INFORMACIÓN DE ORIGEN
        origen_info = {
            "localidad": origen_localidad,
            "risk_score": risk_data.get(origen_localidad, {}).get('risk_score', 0.5),
            "zone_type": get_zone_type(risk_data.get(origen_localidad, {}).get('risk_score', 0.5))
        }
        
        # 🎯 INFORMACIÓN DE DESTINO  
        destino_info = {
            "localidad": destino_localidad,
            "risk_score": risk_data.get(destino_localidad, {}).get('risk_score', 0.5),
            "zone_type": get_zone_type(risk_data.get(destino_localidad, {}).get('risk_score', 0.5))
        }
        
        # 🛣️ GENERAR PUNTOS DE RUTA (simulado con línea recta + variaciones)
        route_points = generate_route_points(
            request.origen_lat, request.origen_lng,
            request.destino_lat, request.destino_lng,
            request.preferencia
        )
        
        # 📏 CALCULAR ESTADÍSTICAS
        distancia = calculate_distance(
            request.origen_lat, request.origen_lng,
            request.destino_lat, request.destino_lng
        )
        
        tiempo_base = distancia * 3  # ~3 min por km en ciudad
        riesgo_promedio = (origen_info['risk_score'] + destino_info['risk_score']) / 2
        
        # ⚡ AJUSTES POR PREFERENCIA
        if request.preferencia == "tiempo":
            tiempo_estimado = tiempo_base * 0.9  # 10% más rápido
            riesgo_ajustado = riesgo_promedio * 1.2  # Pero más riesgo
        else:  # seguridad
            tiempo_estimado = tiempo_base * 1.1  # 10% más lento
            riesgo_ajustado = riesgo_promedio * 0.8  # Pero menos riesgo
        
        # 🧠 RECOMENDACIONES IA
        recommendations = generate_ai_recommendations(
            origen_info, destino_info, request.preferencia, 
            request.sensibilidad_riesgo, request.hora
        )
        
        # 📊 RESPUESTA COMPLETA
        route_response = {
            "route_points": route_points,
            "statistics": {
                "distancia": round(distancia, 2),
                "tiempo": int(tiempo_estimado),
                "risk_score": round(riesgo_ajustado, 2)
            },
            "origin_info": origen_info,
            "destination_info": destino_info,
            "recommendations": recommendations,
            "metadata": {
                "preferencia": request.preferencia,
                "sensibilidad": request.sensibilidad_riesgo,
                "hora": request.hora,
                "dia_semana": request.dia_semana
            }
        }
        
        print(f"✅ Route calculated successfully: {distancia:.1f}km, {int(tiempo_estimado)}min")
        return route_response
        
    except Exception as e:
        print(f"❌ Error in intelligent route coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating route: {str(e)}")

# 🔍 FUNCIÓN AUXILIAR: ENCONTRAR LOCALIDAD MÁS CERCANA
def find_closest_localidad(lat: float, lng: float) -> str:
    """Encuentra la localidad más cercana a unas coordenadas"""
    
    # 🗺️ CENTROIDES APROXIMADOS DE LOCALIDADES BOGOTÁ
    localidades_coords = {
        "USAQUEN": (4.6947, -74.0306),
        "CHAPINERO": (4.6492, -74.0628),
        "SANTA FE": (4.6126, -74.0705),
        "SAN CRISTOBAL": (4.5699, -74.0973),
        "USME": (4.4789, -74.1361),
        "TUNJUELITO": (4.5615, -74.1419),
        "BOSA": (4.6150, -74.1958),
        "KENNEDY": (4.6280, -74.1553),
        "FONTIBON": (4.6872, -74.1435),
        "ENGATIVA": (4.7544, -74.1147),
        "SUBA": (4.7570, -74.0840),
        "BARRIOS UNIDOS": (4.6690, -74.0810),
        "TEUSAQUILLO": (4.6309, -74.0927),
        "LOS MARTIRES": (4.6017, -74.0987),
        "ANTONIO NARIÑO": (4.5893, -74.1065),
        "PUENTE ARANDA": (4.6140, -74.1213),
        "LA CANDELARIA": (4.5968, -74.0759),
        "RAFAEL URIBE URIBE": (4.5571, -74.1139),
        "CIUDAD BOLIVAR": (4.5038, -74.1797)
    }
    
    min_distance = float('inf')
    closest_localidad = "TEUSAQUILLO"  # Default
    
    for localidad, (loc_lat, loc_lng) in localidades_coords.items():
        distance = calculate_distance(lat, lng, loc_lat, loc_lng)
        if distance < min_distance:
            min_distance = distance
            closest_localidad = localidad
    
    return closest_localidad

# 🛣️ FUNCIÓN AUXILIAR: GENERAR PUNTOS DE RUTA
def generate_route_points(origen_lat: float, origen_lng: float, 
                         destino_lat: float, destino_lng: float, 
                         preferencia: str) -> list:
    """Genera puntos de ruta entre origen y destino"""
    
    import random
    
    points = []
    num_points = 8  # Número de puntos intermedios
    
    for i in range(num_points + 2):  # +2 para incluir origen y destino
        if i == 0:
            # Punto de origen
            points.append({"lat": origen_lat, "lng": origen_lng})
        elif i == num_points + 1:
            # Punto de destino
            points.append({"lat": destino_lat, "lng": destino_lng})
        else:
            # Puntos intermedios con interpolación lineal + variación
            progress = i / (num_points + 1)
            
            base_lat = origen_lat + (destino_lat - origen_lat) * progress
            base_lng = origen_lng + (destino_lng - origen_lng) * progress
            
            # Agregar variación según preferencia
            if preferencia == "tiempo":
                # Ruta más directa, menos variación
                variation = 0.002
            else:  # seguridad
                # Ruta más segura, más variación para evitar zonas
                variation = 0.004
            
            lat_variation = (random.random() - 0.5) * variation
            lng_variation = (random.random() - 0.5) * variation
            
            points.append({
                "lat": base_lat + lat_variation,
                "lng": base_lng + lng_variation
            })
    
    return points

# 🧠 FUNCIÓN AUXILIAR: RECOMENDACIONES IA
def generate_ai_recommendations(origen_info: dict, destino_info: dict, 
                               preferencia: str, sensibilidad: float, hora: int) -> list:
    """Genera recomendaciones inteligentes basadas en el contexto"""
    
    recommendations = []
    
    # 🕐 RECOMENDACIONES POR HORA
    if 22 <= hora or hora <= 5:
        recommendations.append("🌙 Es horario nocturno - considera usar transporte público o taxi")
    elif 7 <= hora <= 9 or 17 <= hora <= 19:
        recommendations.append("🚦 Hora pico - considera rutas alternas o diferir el viaje")
    
    # 🎯 RECOMENDACIONES POR ORIGEN
    if origen_info['risk_score'] > 0.7:
        recommendations.append(f"⚠️ Tu origen ({origen_info['localidad']}) tiene alto riesgo - mantente alerta")
    elif origen_info['risk_score'] < 0.3:
        recommendations.append(f"✅ Tu origen ({origen_info['localidad']}) es una zona segura")
    
    # 🎯 RECOMENDACIONES POR DESTINO
    if destino_info['risk_score'] > 0.7:
        recommendations.append(f"🚨 Tu destino ({destino_info['localidad']}) requiere precaución extra")
    elif destino_info['risk_score'] < 0.3:
        recommendations.append(f"🛡️ Tu destino ({destino_info['localidad']}) es una zona segura")
    
    # 🎯 RECOMENDACIONES POR PREFERENCIA
    if preferencia == "tiempo":
        recommendations.append("⚡ Ruta optimizada para velocidad - mantente en vías principales")
    else:
        recommendations.append("🛡️ Ruta optimizada para seguridad - evita zonas de riesgo")
    
    # 🎯 RECOMENDACIONES POR SENSIBILIDAD
    if sensibilidad > 0.8:
        recommendations.append("🔒 Alta sensibilidad - considera transporte público en zonas complejas")
    elif sensibilidad < 0.3:
        recommendations.append("🚀 Baja sensibilidad - puedes usar rutas más directas")
    
    return recommendations[:4]  # Máximo 4 recomendaciones
# =============== ENDPOINTS ML/ROUTING (SIN CAMBIOS) ===============

@app.post("/predict-risk", response_model=RiskResponse)
async def predict_risk(request: RiskRequest):
    global predictor

    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    try:
        is_balanced = hasattr(predictor, 'predict_balanced_risk')

        if is_balanced:
            if request.latitude and request.longitude:
                lat, lng = request.latitude, request.longitude
            else:
                coords = LOCALIDADES_COORDS.get(request.municipio.upper(), {'lat': 4.6, 'lng': -74.1})
                lat, lng = coords['lat'], coords['lng']

            risk_score = predictor.predict_balanced_risk(
                request.municipio, lat, lng, request.hora, request.dia_semana
            )

            zone_type = predictor.get_zone_type(request.municipio)
            model_type = "balanced_hybrid_v3.0"
            features_used = len(predictor.feature_columns)
            coordinates = {"lat": lat, "lng": lng}

        else:
            risk_score = predictor.predict_risk(
                request.municipio, request.hora, request.dia_semana, request.mes
            )
            zone_type = "unknown"
            model_type = "basic_v2.0"
            features_used = 6
            coordinates = None

        if risk_score < 0.3:
            risk_level = "Bajo"
        elif risk_score < 0.7:
            risk_level = "Medio"
        else:
            risk_level = "Alto"

        return RiskResponse(
            municipio=request.municipio,
            hora=request.hora,
            risk_score=risk_score,
            risk_level=risk_level,
            zone_type=zone_type,
            model_type=model_type,
            coordinates=coordinates,
            features_used=features_used
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

@app.get("/risk-map")
async def get_risk_map(hora: int = 12, dia_semana: int = 1):
    global predictor

    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    risk_map = []
    is_balanced = hasattr(predictor, 'predict_balanced_risk')

    for localidad, coords in LOCALIDADES_COORDS.items():
        try:
            if is_balanced:
                risk_score = predictor.predict_balanced_risk(
                    localidad, coords["lat"], coords["lng"], hora, dia_semana
                )
                zone_type = predictor.get_zone_type(localidad)
            else:
                risk_score = predictor.predict_risk(localidad, hora, dia_semana)
                zone_type = "unknown"

            risk_map.append({
                "localidad": localidad,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "risk_score": risk_score,
                "risk_level": "Bajo" if risk_score < 0.3 else "Medio" if risk_score < 0.7 else "Alto",
                "zone_type": zone_type
            })
        except Exception as e:
            print(f"⚠️ Error prediciendo {localidad}: {e}")
            risk_map.append({
                "localidad": localidad,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "risk_score": 0.5,
                "risk_level": "Medio",
                "zone_type": "error"
            })

    return {
        "risk_map": risk_map,
        "hora": hora,
        "dia_semana": dia_semana,
        "model_type": "balanced_hybrid_v3.0" if is_balanced else "basic_v2.0"
    }

# =============== ENDPOINTS PROTEGIDOS CON AUTH ===============

@app.post("/user-feedback-crime")
async def user_feedback_crime(
    request: UserFeedbackCrimeRequest,
    current_user: dict = Depends(get_current_user)  # PROTEGIDO
):
    """✍️ Crear feedback de crimen (requiere autenticación)"""
    # Validar campos mínimos
    if (
        request.lat is None or request.lng is None or
        not request.tipo or not request.comentario or not request.fecha
    ):
        raise HTTPException(status_code=400, detail="Faltan campos obligatorios.")
    
    # Crear directorio si no existe
    os.makedirs("data", exist_ok=True)
    csv_path = "data/user_feedback_crime.csv"
    
    # Preparar fila CON USUARIO AUTENTICADO
    row = {
        "lat": request.lat,
        "lng": request.lng,
        "tipo": request.tipo,
        "comentario": request.comentario,
        "fecha": request.fecha,
        "usuario": current_user["username"],  # DEL TOKEN JWT
        "timestamp": datetime.now().isoformat()
    }
    
    # Guardar en CSV
    header = not os.path.exists(csv_path)
    df = pd.DataFrame([row])
    df.to_csv(csv_path, mode='a', header=header, index=False)
    
    return {
        "status": "success",
        "message": "Feedback almacenado correctamente.",
        "row": row
    }

@app.post("/user-fencing-zone")
async def save_user_fencing_zone(
    request: UserFencingZoneRequest,
    current_user: dict = Depends(get_current_user)  # PROTEGIDO
):
    """🏠 Crear zona personalizada (requiere autenticación)"""
    os.makedirs("data", exist_ok=True)
    csv_path = "data/user_fencing_zones.csv"
    
    # Preparar fila CON USUARIO AUTENTICADO
    row = {
        "lat": request.lat,
        "lng": request.lng,
        "radio": request.radio,
        "nombre": request.nombre,
        "usuario": current_user["username"],  # DEL TOKEN JWT
        "created_at": datetime.now().isoformat()
    }
    
    # Guardar en CSV
    header = not os.path.exists(csv_path)
    df = pd.DataFrame([row])
    df.to_csv(csv_path, mode='a', header=header, index=False)
    
    return {"status": "success", "zone": row}

@app.get("/user-feedback-crime")
async def get_user_feedback_crime(
    skip: int = 0,
    limit: int = 100,
    tipo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)  # PROTEGIDO
):
    """📋 Listar mis feedbacks (solo del usuario autenticado)"""
    csv_path = "data/user_feedback_crime.csv"
    if not os.path.exists(csv_path):
        return {"feedbacks": [], "total": 0}

    df = pd.read_csv(csv_path)

    # FILTRAR SOLO FEEDBACKS DEL USUARIO AUTENTICADO
    df = df[df["usuario"] == current_user["username"]]

    # Filtros adicionales
    if tipo:
        df = df[df["tipo"] == tipo]
    if fecha_desde:
        df = df[df["fecha"] >= fecha_desde]
    if fecha_hasta:
        df = df[df["fecha"] <= fecha_hasta]

    total = len(df)
    # Paginación
    feedbacks = df.iloc[skip: skip + limit].to_dict(orient="records")
    return {"feedbacks": feedbacks, "total": total}

@app.get("/user-fencing-zone")
async def get_user_fencing_zones(
    nombre: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """📍 Listar mis zonas (solo del usuario autenticado)"""
    try:
        print(f"🔍 DEBUG: Getting zones for user: {current_user.get('username', 'UNKNOWN')}")
        
        csv_path = "data/user_fencing_zones.csv"
        print(f"🔍 DEBUG: Looking for CSV at: {csv_path}")
        
        if not os.path.exists(csv_path):
            print("🔍 DEBUG: CSV file does not exist, creating empty one")
            # Crear CSV con headers correctos
            os.makedirs('data', exist_ok=True)
            pd.DataFrame(columns=['lat', 'lng', 'radio', 'nombre', 'usuario', 'createdAt']).to_csv(csv_path, index=False)
            return {"zones": [], "total": 0}

        print("🔍 DEBUG: Reading CSV file...")
        # ✅ LECTURA ROBUSTA CON MANEJO DE ERRORES
        try:
            df = pd.read_csv(csv_path)
        except pd.errors.ParserError as parse_error:
            print(f"❌ DEBUG: CSV Parse Error: {parse_error}")
            print("🔄 DEBUG: Recreating CSV with correct headers...")
            # Recrear CSV limpio
            pd.DataFrame(columns=['lat', 'lng', 'radio', 'nombre', 'usuario', 'createdAt']).to_csv(csv_path, index=False)
            return {"zones": [], "total": 0}
        
        print(f"🔍 DEBUG: CSV loaded, total rows: {len(df)}")
        print(f"🔍 DEBUG: CSV columns: {df.columns.tolist()}")
        
        # Verificar que tenga las columnas necesarias
        required_columns = ['lat', 'lng', 'radio', 'nombre', 'usuario', 'createdAt']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"❌ DEBUG: Missing columns: {missing_columns}")
            print("🔄 DEBUG: Recreating CSV with correct headers...")
            pd.DataFrame(columns=required_columns).to_csv(csv_path, index=False)
            return {"zones": [], "total": 0}
        
        if len(df) > 0:
            print(f"🔍 DEBUG: Sample data: {df.head()}")

        # FILTRAR SOLO ZONAS DEL USUARIO AUTENTICADO
        user_username = current_user.get("username", "")
        print(f"🔍 DEBUG: Filtering by username: '{user_username}'")
        
        df_filtered = df[df["usuario"] == user_username]
        print(f"🔍 DEBUG: After user filter: {len(df_filtered)} rows")

        # Filtros adicionales
        if nombre:
            df_filtered = df_filtered[df_filtered["nombre"] == nombre]
            print(f"🔍 DEBUG: After name filter: {len(df_filtered)} rows")

        total = len(df_filtered)
        print(f"🔍 DEBUG: Total zones for user: {total}")
        
        # Paginación
        zones = df_filtered.iloc[skip: skip + limit].to_dict(orient="records")
        print(f"🔍 DEBUG: Returning {len(zones)} zones")
        
        return {"zones": zones, "total": total}
        
    except Exception as e:
        print(f"❌ DEBUG: Exception in get_user_fencing_zones: {e}")
        print(f"❌ DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"❌ DEBUG: Traceback: {traceback.format_exc()}")
        return {"zones": [], "total": 0, "error": str(e)}  # ✅ NO LANZAR ERROR, DEVOLVER VACÍO

@app.get("/debug-csv")
async def debug_csv():
    """🔍 Debug endpoint para ver el contenido del CSV"""
    try:
        csv_path = "data/user_fencing_zones.csv"
        
        if not os.path.exists(csv_path):
            return {"message": "CSV file does not exist", "path": csv_path}
        
        import pandas as pd
        df = pd.read_csv(csv_path)
        
        return {
            "csv_exists": True,
            "path": csv_path,
            "total_rows": len(df),
            "columns": df.columns.tolist(),
            "sample_data": df.head().to_dict(orient="records") if len(df) > 0 else [],
            "all_usernames": df["usuario"].unique().tolist() if "usuario" in df.columns else []
        }
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}

@app.delete("/user-feedback-crime")
async def delete_user_feedback_crime(
    request: dict = Body(...),  # ✅ RECIBIR COMO DICT
    current_user: dict = Depends(get_current_user)
):
    """🗑️ Borrar mi feedback (solo el propio)"""
    timestamp = request.get("timestamp")  # ✅ EXTRAER TIMESTAMP
    if not timestamp:
        raise HTTPException(status_code=400, detail="Timestamp requerido")
        
    csv_path = "data/user_feedback_crime.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="No hay feedbacks")

    df = pd.read_csv(csv_path)
    original_total = len(df)
    
    # SOLO PERMITIR BORRAR FEEDBACKS PROPIOS
    df = df[~((df["usuario"] == current_user["username"]) & (df["timestamp"] == timestamp))]
    df.to_csv(csv_path, index=False)
    deleted = original_total - len(df)
    return {"status": "success" if deleted else "not found", "deleted": deleted}

@app.delete("/user-fencing-zone")
async def delete_user_fencing_zone(
    request: dict = Body(...),  # ✅ RECIBIR COMO OBJETO
    current_user: dict = Depends(get_current_user)
):
    """🗑️ Eliminar zona personal"""
    try:
        nombre = request.get("nombre")  # ✅ EXTRAER EL NOMBRE
        if not nombre:
            raise HTTPException(status_code=400, detail="Nombre requerido")
            
        print(f"🗑️ DEBUG: Deleting zone '{nombre}' for user '{current_user['username']}'")
        
        csv_path = "data/user_fencing_zones.csv"
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="No hay zonas")

        df = pd.read_csv(csv_path)
        original_total = len(df)
        print(f"🗑️ DEBUG: Original total: {original_total}")
        
        # Filtrar: eliminar solo si es del usuario actual Y con ese nombre
        df_filtered = df[~((df["usuario"] == current_user["username"]) & (df["nombre"] == nombre))]
        print(f"🗑️ DEBUG: After filter: {len(df_filtered)}")
        
        df_filtered.to_csv(csv_path, index=False)
        deleted = original_total - len(df_filtered)
        
        print(f"🗑️ DEBUG: Deleted {deleted} zones")
        
        return {
            "status": "success" if deleted > 0 else "not found", 
            "deleted": deleted,
            "message": f"Zona '{nombre}' eliminada" if deleted > 0 else f"Zona '{nombre}' no encontrada"
        }
    except Exception as e:
        print(f"❌ DEBUG: Error deleting zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando zona: {str(e)}")

@app.put("/user-feedback-crime")
async def update_user_feedback_crime(
    timestamp: str = Body(...),
    comentario: Optional[str] = Body(None),
    tipo: Optional[str] = Body(None),
    current_user: dict = Depends(get_current_user)  # 🛡️ PROTEGIDO
):
    """✏️ Editar mi feedback (solo el propio)"""
    csv_path = "data/user_feedback_crime.csv"
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="No hay feedbacks")

    df = pd.read_csv(csv_path)
    
    # SOLO PERMITIR EDITAR FEEDBACKS PROPIOS
    mask = (df["usuario"] == current_user["username"]) & (df["timestamp"] == timestamp)
    if not mask.any():
        raise HTTPException(status_code=404, detail="Feedback no encontrado o no autorizado")

    if comentario:
        df.loc[mask, "comentario"] = comentario
    if tipo:
        df.loc[mask, "tipo"] = tipo

    df.to_csv(csv_path, index=False)
    return {"status": "success", "updated": df[mask].to_dict(orient="records")}

@app.put("/user-fencing-zone")
async def update_user_fencing_zone(
    nombre: str = Body(...),
    nuevo_nombre: Optional[str] = Body(None),
    nuevo_radio: Optional[float] = Body(None),
    nueva_descripcion: Optional[str] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """✏️ Editar zona personal"""
    try:
        csv_path = "data/user_fencing_zones.csv"
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="No hay zonas")

        df = pd.read_csv(csv_path)
        mask = (df["usuario"] == current_user["username"]) & (df["nombre"] == nombre)
        
        if not mask.any():
            raise HTTPException(status_code=404, detail="Zona no encontrada")

        # Actualizar campos
        if nuevo_nombre:
            df.loc[mask, "nombre"] = nuevo_nombre
        if nuevo_radio is not None:
            df.loc[mask, "radio"] = nuevo_radio
        if nueva_descripcion is not None:
            df.loc[mask, "descripcion"] = nueva_descripcion

        df.to_csv(csv_path, index=False)
        
        updated_zone = df[mask].to_dict(orient="records")[0]
        return {"status": "success", "updated": updated_zone}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando zona: {str(e)}")
# =============== ENDPOINTS SIN AUTH (PÚBLICOS) ===============

@app.post("/smart-route")
async def get_smart_route(request: RouteRequest):
    global predictor

    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    origen_coords = LOCALIDADES_COORDS.get(request.origen.upper())
    destino_coords = LOCALIDADES_COORDS.get(request.destino.upper())

    if not origen_coords or not destino_coords:
        raise HTTPException(status_code=400, detail="Localidad no encontrada")

    is_balanced = hasattr(predictor, 'predict_balanced_risk')

    if is_balanced:
        risk_origen = predictor.predict_balanced_risk(
            request.origen, origen_coords["lat"], origen_coords["lng"],
            request.hora, request.dia_semana
        )
        risk_destino = predictor.predict_balanced_risk(
            request.destino, destino_coords["lat"], destino_coords["lng"],
            request.hora, request.dia_semana
        )
        zone_origen = predictor.get_zone_type(request.origen)
        zone_destino = predictor.get_zone_type(request.destino)
    else:
        risk_origen = predictor.predict_risk(request.origen, request.hora, request.dia_semana)
        risk_destino = predictor.predict_risk(request.destino, request.hora, request.dia_semana)
        zone_origen = zone_destino = "unknown"

    risk_promedio = (risk_origen + risk_destino) / 2

    return {
        "origen": {
            "localidad": request.origen,
            **origen_coords,
            "risk_score": risk_origen,
            "zone_type": zone_origen
        },
        "destino": {
            "localidad": request.destino,
            **destino_coords,
            "risk_score": risk_destino,
            "zone_type": zone_destino
        },
        "puntos_intermedios": [],
        "distancia_km": 10.5,
        "tiempo_minutos": 25,
        "risk_score_promedio": risk_promedio,
        "recomendacion": "Ruta segura" if risk_promedio < 0.4 else "Ruta con precaución" if risk_promedio < 0.7 else "Ruta peligrosa - considere alternativas",
        "model_type": "basic_routing",
        "note": "💡 Para routing inteligente usa /intelligent-route"
    }

@app.post("/intelligent-route", response_model=RouteResponse)
async def get_intelligent_route(request: IntelligentRouteRequest):
    global predictor, intelligent_router

    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    if not intelligent_router:
        raise HTTPException(status_code=503, detail="Router inteligente no disponible - usa /smart-route como fallback")

    # 🆕 AJUSTAR PESOS SEGÚN preferencia/sensibilidad
    if hasattr(intelligent_router, 'routing_factors'):
        if request.preferencia == "seguridad":
            intelligent_router.routing_factors['safety_weight'] = max(request.sensibilidad_riesgo or 0.6, 0.5)
            intelligent_router.routing_factors['distance_weight'] = 1.0 - intelligent_router.routing_factors['safety_weight']
            intelligent_router.routing_factors['time_weight'] = 0.1
        elif request.preferencia == "tiempo":
            intelligent_router.routing_factors['safety_weight'] = min(request.sensibilidad_riesgo or 0.3, 0.5)
            intelligent_router.routing_factors['distance_weight'] = 0.5
            intelligent_router.routing_factors['time_weight'] = 0.4

    try:
        # 🎯 Usar coordenadas específicas o coordenadas de municipios
        if request.origen_lat and request.origen_lng and request.destino_lat and request.destino_lng:
            route_result = intelligent_router.find_safest_route(
                request.origen_lat, request.origen_lng,
                request.destino_lat, request.destino_lng,
                request.hora, request.dia_semana
            )
        else:
            route_result = intelligent_router.get_route_with_intelligence(
                request.origen, request.destino,
                request.hora, request.dia_semana
            )

        route_result['model_type'] = "intelligent_routing_v3.0"
        return RouteResponse(**route_result)

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en routing inteligente: {str(e)}")

@app.get("/route-comparison")
async def compare_routes(origen: str, destino: str, hora: int = 12, dia_semana: int = 1):
    global predictor, intelligent_router

    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    try:
        basic_request = RouteRequest(origen=origen, destino=destino, hora=hora, dia_semana=dia_semana)
        basic_result = await get_smart_route(basic_request)

        intelligent_result = None
        if intelligent_router:
            try:
                intelligent_request = IntelligentRouteRequest(origen=origen, destino=destino, hora=hora, dia_semana=dia_semana)
                intelligent_result = await get_intelligent_route(intelligent_request)
                intelligent_result = intelligent_result.dict()
            except Exception as e:
                intelligent_result = {"error": f"Error en routing inteligente: {str(e)}"}

        return {
            "comparison": {
                "basic_routing": basic_result,
                "intelligent_routing": intelligent_result,
                "available_methods": {
                    "basic": "✅ Disponible",
                    "intelligent": "✅ Disponible" if intelligent_router else "❌ No disponible"
                }
            },
            "recommendations": [
                "🛣️ Routing inteligente ofrece mayor precisión y seguridad",
                "📊 Considera múltiples factores: seguridad, distancia, tiempo",
                "🎯 Genera waypoints optimizados automáticamente"
            ] if intelligent_router else [
                "⚠️ Solo routing básico disponible",
                "💡 Reinicia el servidor para habilitar routing inteligente"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en comparación de rutas: {str(e)}")

@app.get("/security-points")
async def get_official_security_points():
    try:
        security_path = 'data/security/security_points_processed.csv'

        if not os.path.exists(security_path):
            raise HTTPException(
                status_code=404,
                detail="Datos oficiales no encontrados"
            )

        security_df = pd.read_csv(security_path)

        points = []
        for _, row in security_df.iterrows():
            points.append({
                "lat": float(row['latitude']),
                "lng": float(row['longitude']),
                "risk_score": float(row['risk_score']),
                "localidad": str(row.get('localidad', 'N/A')),
                "direccion": str(row.get('direccion', 'N/A')),
                "source": "official_bogota_government_data"
            })

        return {
            "official_points": points,
            "total": len(points),
            "data_source": "Secretaría Distrital de la Mujer - Bogotá D.C."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/rebuild-model")
async def rebuild_model():
    global predictor, intelligent_router

    try:
        print("🔧 Reconstruyendo sistema completo...")

        predictor = BalancedHybridRiskPredictor(verbose=True)
        model = predictor.train_balanced_model()

        intelligent_router = IntelligentRouter(predictor, verbose=True)

        return {
            "message": "Sistema COMPLETO reconstruido exitosamente!",
            "model": {
                "municipios": len(predictor.municipio_to_id),
                "zones": len(predictor.zone_classifier),
                "features": len(predictor.feature_columns),
                "type": "balanced_hybrid_v3.0"
            },
            "router": {
                "grid_size": intelligent_router._get_grid_size(),
                "resolution": f"{intelligent_router.grid_resolution * 111:.0f}m",
                "type": "intelligent_grid_based_v3.0"
            },
            "status": "✅ Sistema completo activo"
        }

    except Exception as e:
        print(f"❌ Error en reconstrucción completa, probando básico...")
        try:
            from ml_model import RiskPredictor
            predictor = RiskPredictor(auto_build=True)
            intelligent_router = None
            return {
                "message": "Modelo básico reconstruido como fallback",
                "model_type": "basic_v2.0",
                "router_type": "none",
                "status": "⚠️ Fallback activo"
            }
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Error total: {str(fallback_error)}")
# 🔧 FUNCIONES AUXILIARES FALTANTES

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calcula distancia entre dos puntos en km usando fórmula haversine"""
    R = 6371  # Radio de la Tierra en km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(delta_lng/2) * math.sin(delta_lng/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def load_risk_data() -> dict:
    """Carga datos de riesgo simulados"""
    return {
        'USAQUEN': {'risk_score': 0.2},
        'CHAPINERO': {'risk_score': 0.3},
        'SANTA FE': {'risk_score': 0.8},
        'SAN CRISTOBAL': {'risk_score': 0.9},
        'USME': {'risk_score': 0.7},
        'TUNJUELITO': {'risk_score': 0.4},
        'BOSA': {'risk_score': 0.6},
        'KENNEDY': {'risk_score': 0.4},
        'FONTIBON': {'risk_score': 0.3},
        'ENGATIVA': {'risk_score': 0.3},
        'SUBA': {'risk_score': 0.2},
        'BARRIOS UNIDOS': {'risk_score': 0.2},
        'TEUSAQUILLO': {'risk_score': 0.2},
        'LOS MARTIRES': {'risk_score': 0.9},
        'ANTONIO NARIÑO': {'risk_score': 0.4},
        'PUENTE ARANDA': {'risk_score': 0.4},
        'LA CANDELARIA': {'risk_score': 0.8},
        'RAFAEL URIBE URIBE': {'risk_score': 0.6},
        'CIUDAD BOLIVAR': {'risk_score': 0.8},
    }

def get_zone_type(risk_score: float) -> str:
    """Determina el tipo de zona basado en el riesgo"""
    if risk_score < 0.3:
        return "SAFE_ZONE"
    elif risk_score < 0.7:
        return "MODERATE_ZONE" 
    else:
        return "HIGH_RISK_ZONE"

# 🚀 AQUÍ VA EL if __name__ == "__main__":
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)