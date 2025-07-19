from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
from ml_model import RiskPredictor
from backend.data_pipeline import CrimeDataLoader
import uvicorn

app = FastAPI(title="Safe Routes API", version="1.0.0")

# CORS para permitir conexión desde Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar modelo
predictor = RiskPredictor()

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
    return {"message": "Safe Routes API funcionando! 🛡️"}

@app.post("/predict-risk", response_model=RiskResponse)
async def predict_risk(request: RiskRequest):
    """Predice riesgo criminal para una zona-hora específica"""
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
    # Para MVP: ruta simple que evita zonas de riesgo alto
    origen_coords = LOCALIDADES_COORDS.get(request.origen.upper())
    destino_coords = LOCALIDADES_COORDS.get(request.destino.upper())
    
    if not origen_coords or not destino_coords:
        raise HTTPException(status_code=400, detail="Localidad no encontrada")
    
    # Simular ruta (en proyecto real usarías OSRM o Google Directions)
    ruta = {
        "origen": {"localidad": request.origen, **origen_coords},
        "destino": {"localidad": request.destino, **destino_coords},
        "puntos_intermedios": [],
        "distancia_km": 10.5,
        "tiempo_minutos": 25,
        "risk_score_promedio": 0.4
    }
    
    return ruta

@app.get("/train-model")
async def train_model():
    """Endpoint para entrenar/re-entrenar el modelo (útil para demo)"""
    try:
        loader = CrimeDataLoader()
        
        # Cargar datos
        raw_data = loader.download_bogota_crime_data()
        if raw_data is None:
            raise HTTPException(status_code=500, detail="Error descargando datos")
        
        clean_data = loader.clean_data(raw_data)
        
        # Entrenar modelo
        global predictor
        predictor = RiskPredictor()
        predictor.train_model(clean_data)
        
        return {"message": "Modelo entrenado exitosamente!", "samples": len(clean_data)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error entrenando modelo: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)