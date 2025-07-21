from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from hybrid_risk_model import BalancedHybridRiskPredictor
from intelligent_routing import IntelligentRouter  # 🆕 IMPORTAR ROUTER
import uvicorn
import os
from contextlib import asynccontextmanager

# Variables globales
predictor = None
intelligent_router = None  # 🆕 ROUTER GLOBAL

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global predictor, intelligent_router
    
    print("🚀 Iniciando RealGRoute 3.0 - Balanced Intelligence + Smart Routing Edition...")
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
        
        print("=" * 80)
        print("🎉 RealGRoute 3.0 COMPLETO listo!")
        print(f"🧠 Modelo: {len(predictor.municipio_to_id)} municipios, {len(predictor.feature_columns)} features")
        print(f"🛣️ Router: Grid {intelligent_router._get_grid_size()}, resolución {intelligent_router.grid_resolution * 111:.0f}m")
        print(f"🎯 Zonas: {len(predictor.zone_classifier)} tipos configurados")
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
    
    # Shutdown
    print("🛑 Cerrando RealGRoute 3.0...")

# ✅ APP CON LIFESPAN
app = FastAPI(
    title="Safe Routes API", 
    version="3.0.0 - Balanced Intelligence + Smart Routing Edition",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🆕 MODELOS ACTUALIZADOS CON ROUTING
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
    # Coordenadas opcionales para mayor precisión
    origen_lat: float = None
    origen_lng: float = None
    destino_lat: float = None
    destino_lng: float = None

class RouteResponse(BaseModel):
    """🆕 Response completa de routing"""
    route_points: List[dict]
    statistics: dict
    recommendations: List[str]
    origin_info: dict
    destination_info: dict
    model_type: str = "intelligent_routing_v3.0"

# Coordenadas
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

@app.get("/")
async def root():
    is_balanced = hasattr(predictor, 'train_balanced_model') if predictor else False
    has_intelligent_router = intelligent_router is not None
    has_official_data = os.path.exists('data/security/security_points_processed.csv')
    
    return {
        "message": "RealGRoute 3.0 - Balanced Intelligence + Smart Routing! 🧠🛣️",
        "status": "✅ Sistema completo" if (predictor and is_balanced and has_intelligent_router) else "⚠️ Sistema parcial",
        "model_type": "Balanced Hybrid v3.0" if is_balanced else "Basic v2.0",
        "routing_type": "Intelligent Grid-Based v3.0" if has_intelligent_router else "Basic",
        "municipios": len(predictor.municipio_to_id) if predictor else 0,
        "zones": len(predictor.zone_classifier) if predictor and is_balanced else 0,
        "features": len(predictor.feature_columns) if predictor and hasattr(predictor, 'feature_columns') else 6,
        "grid_resolution": f"{intelligent_router.grid_resolution * 111:.0f}m" if has_intelligent_router else "N/A",
        "official_data": "✅ Datos oficiales integrados" if has_official_data else "⚠️ Solo datos sintéticos",
        "version": "3.0.0 - Balanced Intelligence + Smart Routing Edition",
        "intelligence_level": "🧠 Arquitectura Zonal Balanceada + Router Inteligente" if (is_balanced and has_intelligent_router) else "📊 Básica",
        "capabilities": {
            "risk_prediction": "✅ Balanceada" if is_balanced else "⚠️ Básica",
            "intelligent_routing": "✅ Grid-based" if has_intelligent_router else "❌ No disponible",
            "zone_classification": "✅ 3 tipos" if is_balanced else "❌ No disponible",
            "safety_optimization": "✅ Multicriterio" if has_intelligent_router else "❌ No disponible"
        }
    }

@app.get("/health")
async def health_check():
    """🏥 Health check del sistema COMPLETO"""
    global predictor, intelligent_router
    
    if not predictor:
        return {"api_status": "❌ Offline", "model_status": "❌ No cargado", "router_status": "❌ No disponible"}
    
    is_balanced = hasattr(predictor, 'train_balanced_model')
    has_intelligent_router = intelligent_router is not None
    
    model_status = "✅ Balanceado funcionando" if is_balanced else "⚠️ Básico activo"
    router_status = "✅ Router inteligente activo" if has_intelligent_router else "❌ Router no disponible"
    
    return {
        "api_status": "✅ Online",
        "model_status": model_status,
        "router_status": router_status,
        "model_type": "Balanced Hybrid v3.0" if is_balanced else "Basic v2.0",
        "routing_type": "Intelligent Grid-Based v3.0" if has_intelligent_router else "Basic",
        "municipios": len(predictor.municipio_to_id) if hasattr(predictor, 'municipio_to_id') else 0,
        "zones": len(predictor.zone_classifier) if is_balanced else 0,
        "features": len(predictor.feature_columns) if hasattr(predictor, 'feature_columns') else 0,
        "grid_size": intelligent_router._get_grid_size() if has_intelligent_router else "N/A",
        "timestamp": "2025-07-21 01:48:39"
    }

@app.post("/predict-risk", response_model=RiskResponse)
async def predict_risk(request: RiskRequest):
    """🔥 Predicción con modelo BALANCEADO (sin cambios)"""
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
    """🗺️ Mapa de riesgo BALANCEADO (sin cambios)"""
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

@app.post("/smart-route")
async def get_smart_route(request: RouteRequest):
    """🛣️ Rutas BÁSICAS (mantenido para compatibilidad)"""
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
    """🚀 ROUTING INTELIGENTE - La joya de la corona"""
    global predictor, intelligent_router
    
    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")
    
    if not intelligent_router:
        raise HTTPException(status_code=503, detail="Router inteligente no disponible - usa /smart-route como fallback")
    
    try:
        # 🎯 Usar coordenadas específicas o coordenadas de municipios
        if request.origen_lat and request.origen_lng and request.destino_lat and request.destino_lng:
            # 📍 Coordenadas específicas
            route_result = intelligent_router.find_safest_route(
                request.origen_lat, request.origen_lng,
                request.destino_lat, request.destino_lng,
                request.hora, request.dia_semana
            )
        else:
            # 🏙️ Usar nombres de municipios
            route_result = intelligent_router.get_route_with_intelligence(
                request.origen, request.destino,
                request.hora, request.dia_semana
            )
        
        # 🎯 Enriquecer respuesta
        route_result['model_type'] = "intelligent_routing_v3.0"
        
        return RouteResponse(**route_result)
    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en routing inteligente: {str(e)}")

@app.get("/route-comparison")
async def compare_routes(origen: str, destino: str, hora: int = 12, dia_semana: int = 1):
    """📊 Compara routing básico vs inteligente"""
    global predictor, intelligent_router
    
    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")
    
    try:
        # 🔄 Routing básico
        basic_request = RouteRequest(origen=origen, destino=destino, hora=hora, dia_semana=dia_semana)
        basic_result = await get_smart_route(basic_request)
        
        # 🧠 Routing inteligente (si disponible)
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

@app.get("/security-points")
async def get_official_security_points():
    """🔥 Datos oficiales de seguridad (sin cambios)"""
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
    """🔄 Reconstruir SISTEMA COMPLETO"""
    global predictor, intelligent_router
    
    try:
        print("🔧 Reconstruyendo sistema completo...")
        
        # 🧠 Reconstruir modelo balanceado
        predictor = BalancedHybridRiskPredictor(verbose=True)
        model = predictor.train_balanced_model()
        
        # 🛣️ Reconstruir router inteligente
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)