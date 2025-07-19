from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
from ml_model import RiskPredictor
from data_pipeline import CrimeDataLoader
import uvicorn
import os

app = FastAPI(title="Safe Routes API", version="1.0.0")

# CORS para permitir conexión desde Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable global para el predictor
predictor = None

# 🚀 EVENTO DE STARTUP - AUTO-INICIALIZACIÓN
@app.on_event("startup")
async def startup_event():
    """Inicializa el modelo automáticamente al arrancar el servidor"""
    global predictor
    
    print("🚀 Iniciando Safe Routes API...")
    print("=" * 50)
    
    try:
        # Crear directorio de datos si no existe
        os.makedirs('data', exist_ok=True)
        
        # Inicializar predictor con auto-construcción
        print("🤖 Inicializando modelo de IA...")
        predictor = RiskPredictor(auto_build=True)
        
        print("=" * 50)
        print("✅ Safe Routes API lista para usar!")
        print(f"📍 Municipios disponibles: {len(predictor.municipio_to_id)}")
        print("🌐 Documentación: http://localhost:8000/docs")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error en startup: {e}")
        print("🔧 Creando predictor básico...")
        predictor = RiskPredictor(auto_build=False)
        
        # Intentar crear modelo básico
        try:
            predictor._create_fallback_model()
            print("✅ Modelo básico creado como fallback")
        except Exception as fallback_error:
            print(f"❌ Error crítico: {fallback_error}")
            raise

# Modelos de datos
class RiskRequest(BaseModel):
    municipio: str
    hora: int
    dia_semana: int = 1
    mes: int = 7

class RiskResponse(BaseModel):
    municipio: str
    hora: int
    risk_score: float
    risk_level: str

class RouteRequest(BaseModel):
    origen: str
    destino: str
    hora: int = 12
    dia_semana: int = 1

# Coordenadas aproximadas de localidades Bogotá
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
    return {
        "message": "Safe Routes API funcionando! 🛡️",
        "status": "✅ Modelo cargado" if predictor and predictor.model else "⚠️ Modelo no disponible",
        "municipios": len(predictor.municipio_to_id) if predictor else 0
    }

@app.get("/health")
async def health_check():
    """Endpoint de salud del sistema"""
    global predictor
    
    model_status = "❌ No cargado"
    municipios_count = 0
    
    if predictor:
        if predictor.model is not None:
            model_status = "✅ Funcionando"
            municipios_count = len(predictor.municipio_to_id)
        else:
            model_status = "⚠️ Cargado pero sin modelo"
    
    return {
        "api_status": "✅ Online",
        "model_status": model_status,
        "municipios_disponibles": municipios_count,
        "data_directory": "✅ Existe" if os.path.exists('data') else "❌ No existe"
    }

@app.post("/predict-risk", response_model=RiskResponse)
async def predict_risk(request: RiskRequest):
    """Predice riesgo criminal para una zona-hora específica"""
    global predictor
    
    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")
    
    try:
        risk_score = predictor.predict_risk(
            request.municipio, 
            request.hora, 
            request.dia_semana, 
            request.mes
        )
        
        # Convertir score a nivel categórico
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
            risk_level=risk_level
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

@app.get("/risk-map")
async def get_risk_map(hora: int = 12, dia_semana: int = 1):
    """Obtiene mapa de riesgo para todas las localidades en una hora específica"""
    global predictor
    
    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")
        
    risk_map = []
    
    for localidad, coords in LOCALIDADES_COORDS.items():
        risk_score = predictor.predict_risk(localidad, hora, dia_semana)
        
        risk_map.append({
            "localidad": localidad,
            "lat": coords["lat"],
            "lng": coords["lng"],
            "risk_score": risk_score,
            "risk_level": "Bajo" if risk_score < 0.3 else "Medio" if risk_score < 0.7 else "Alto"
        })
    
    return {"risk_map": risk_map, "hora": hora, "dia_semana": dia_semana}

@app.post("/smart-route")
async def get_smart_route(request: RouteRequest):
    """Calcula ruta inteligente evitando zonas de alto riesgo"""
    global predictor
    
    if not predictor:
        raise HTTPException(status_code=503, detail="Modelo no disponible")
        
    # Para MVP: ruta simple que evita zonas de riesgo alto
    origen_coords = LOCALIDADES_COORDS.get(request.origen.upper())
    destino_coords = LOCALIDADES_COORDS.get(request.destino.upper())
    
    if not origen_coords or not destino_coords:
        raise HTTPException(status_code=400, detail="Localidad no encontrada")
    
    # Calcular riesgo promedio de la ruta
    risk_origen = predictor.predict_risk(request.origen, request.hora, request.dia_semana)
    risk_destino = predictor.predict_risk(request.destino, request.hora, request.dia_semana)
    risk_promedio = (risk_origen + risk_destino) / 2
    
    # Simular ruta (en proyecto real usarías OSRM o Google Directions)
    ruta = {
        "origen": {"localidad": request.origen, **origen_coords},
        "destino": {"localidad": request.destino, **destino_coords},
        "puntos_intermedios": [],
        "distancia_km": 10.5,
        "tiempo_minutos": 25,
        "risk_score_promedio": risk_promedio,
        "recomendacion": "Ruta segura" if risk_promedio < 0.4 else "Ruta con precaución" if risk_promedio < 0.7 else "Ruta peligrosa - considere alternativas"
    }
    
    return ruta

@app.get("/rebuild-model")
async def rebuild_model():
    """Endpoint para reconstruir el modelo manualmente"""
    global predictor
    
    try:
        print("🔧 Reconstruyendo modelo manualmente...")
        
        # Crear nuevo predictor con auto-construcción
        predictor = RiskPredictor(auto_build=True)
        
        return {
            "message": "Modelo reconstruido exitosamente!",
            "municipios": len(predictor.municipio_to_id),
            "status": "✅ Listo para usar"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reconstruyendo modelo: {str(e)}")

@app.get("/train-model")
async def train_model():
    """Endpoint para entrenar/re-entrenar el modelo con datos reales (si existen)"""
    global predictor
    
    try:
        loader = CrimeDataLoader()
        
        # Cargar datos reales si existen
        raw_data = loader.download_bogota_crime_data()
        if raw_data is None:
            # Si no hay datos reales, usar auto-construcción
            predictor = RiskPredictor(auto_build=True)
            return {"message": "Entrenado con datos sintéticos balanceados!", "samples": 3000}
        
        clean_data = loader.clean_data(raw_data)
        
        # Entrenar modelo
        predictor = RiskPredictor(auto_build=False)
        predictor.train_model(clean_data)
        
        return {"message": "Modelo entrenado con datos reales!", "samples": len(clean_data)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error entrenando modelo: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)