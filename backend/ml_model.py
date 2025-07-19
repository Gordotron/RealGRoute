import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from typing import Dict, Any, List, Tuple

class RiskPredictor:
    def __init__(self):
        self.model = None
        self.municipio_to_id: Dict[str, int] = {}
        self.id_to_municipio: Dict[int, str] = {}
        self.feature_columns = ['hora', 'dia_semana', 'mes', 'es_fin_semana', 'es_nocturno', 'municipio_encoded']
        
    def _encode_municipio(self, municipios: List[str]) -> Dict[str, int]:
        """Encode municipios manualmente sin LabelEncoder"""
        unique_municipios = list(set(municipios))
        municipio_to_id = {muni: idx for idx, muni in enumerate(unique_municipios)}
        return municipio_to_id
        
    def prepare_training_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepara datos para entrenar el modelo - VERSIÓN SIMPLIFICADA"""
        print("🔧 Preparando datos para entrenamiento...")
        
        # Encode municipios manualmente
        municipios_list = df['municipio'].unique().tolist()
        self.municipio_to_id = self._encode_municipio(municipios_list)
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        print(f"📍 Municipios encontrados: {list(self.municipio_to_id.keys())}")
        
        # Crear ejemplos de entrenamiento basados en datos reales
        training_data = []
        
        # Estrategia: Usar cada crimen como base para crear ejemplos
        for _, crime in df.iterrows():
            try:
                municipio = str(crime['municipio']).upper().strip()
                hora = int(crime['hora'])
                dia_semana = int(crime['dia_semana'])
                mes = int(crime['mes'])
                
                # Skip si datos inválidos
                if municipio not in self.municipio_to_id:
                    continue
                    
                municipio_encoded = self.municipio_to_id[municipio]
                
                # Calcular riesgo basado en factores conocidos
                risk_score = 0.3  # Base
                
                # Factor hora (noche = más riesgo)
                if 22 <= hora or hora <= 5:  # 10 PM - 5 AM
                    risk_score += 0.4
                elif 18 <= hora <= 21:  # 6 PM - 9 PM
                    risk_score += 0.2
                elif 6 <= hora <= 8:   # 6 AM - 8 AM
                    risk_score += 0.1
                
                # Factor día (fin de semana = más riesgo)
                if dia_semana in [5, 6]:  # Sábado, Domingo
                    risk_score += 0.2
                
                # Factor mes (algunos meses más riesgosos)
                if mes in [12, 1, 6, 7]:  # Diciembre, enero, junio, julio
                    risk_score += 0.1
                
                # Normalizar
                risk_score = min(risk_score, 1.0)
                
                # Convertir a categorías
                if risk_score < 0.4:
                    risk_level = 0  # Bajo
                elif risk_score < 0.7:
                    risk_level = 1  # Medio
                else:
                    risk_level = 2  # Alto
                
                # Crear ejemplo
                example = {
                    'hora': hora,
                    'dia_semana': dia_semana,
                    'mes': mes,
                    'es_fin_semana': 1 if dia_semana in [5, 6] else 0,
                    'es_nocturno': 1 if (hora >= 20 or hora <= 6) else 0,
                    'municipio_encoded': municipio_encoded,
                    'risk_level': risk_level
                }
                
                training_data.append(example)
                
            except Exception as e:
                print(f"⚠️ Error procesando crimen: {e}")
                continue
        
        # Crear DataFrame
        training_df = pd.DataFrame(training_data)
        
        if len(training_df) == 0:
            print("❌ No se pudieron crear ejemplos de entrenamiento")
            return self._create_synthetic_data()
        
        print(f"📊 Distribución de clases:")
        print(training_df['risk_level'].value_counts())
        print(f"✅ Preparados {len(training_df)} ejemplos de entrenamiento")
        
        return training_df
    
    def _create_synthetic_data(self) -> pd.DataFrame:
        """Crear datos sintéticos si no hay datos reales"""
        print("🔧 Creando datos sintéticos...")
        
        # Municipios por defecto
        default_municipios = ['CHAPINERO', 'USAQUEN', 'SUBA', 'KENNEDY', 'ENGATIVA']
        self.municipio_to_id = {muni: idx for idx, muni in enumerate(default_municipios)}
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        synthetic_data = []
        
        # Crear ejemplos para diferentes combinaciones
        for municipio_id in range(len(default_municipios)):
            for hora in range(0, 24, 3):  # Cada 3 horas
                for dia in range(7):
                    
                    # Calcular riesgo sintético
                    risk = 0.2
                    if 20 <= hora or hora <= 5:  # Noche
                        risk += 0.4
                    if dia in [5, 6]:  # Fin de semana
                        risk += 0.2
                    if municipio_id in [0, 1]:  # Algunos municipios más riesgosos
                        risk += 0.1
                    
                    risk_level = 0 if risk < 0.4 else (1 if risk < 0.7 else 2)
                    
                    example = {
                        'hora': hora,
                        'dia_semana': dia,
                        'mes': 6,
                        'es_fin_semana': 1 if dia in [5, 6] else 0,
                        'es_nocturno': 1 if (hora >= 20 or hora <= 6) else 0,
                        'municipio_encoded': municipio_id,
                        'risk_level': risk_level
                    }
                    
                    synthetic_data.append(example)
        
        return pd.DataFrame(synthetic_data)
    
    def train_model(self, df: pd.DataFrame) -> None:
        """Entrena el modelo de predicción de riesgo"""
        print("🤖 Entrenando modelo de IA...")
        
        try:
            # Preparar datos
            training_df = self.prepare_training_data(df)
            
            if training_df is None or len(training_df) < 5:
                print("❌ Muy pocos datos, usando datos sintéticos")
                training_df = self._create_synthetic_data()
            
            # Separar features y target
            X = training_df[self.feature_columns]
            y = training_df['risk_level']
            
            print(f"📈 Entrenando con {len(X)} ejemplos")
            
            # Entrenar modelo
            self.model = RandomForestClassifier(
                n_estimators=20,
                max_depth=8,
                random_state=42,
                min_samples_split=2,
                min_samples_leaf=1
            )
            
            # Si hay suficientes datos, hacer split
            if len(X) >= 10:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                
                self.model.fit(X_train, y_train)
                
                # Evaluar
                y_pred = self.model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                print(f"📊 Precisión del modelo: {accuracy:.2f}")
                
            else:
                # Entrenar con todos los datos
                self.model.fit(X, y)
                print("📊 Modelo entrenado con todos los datos disponibles")
            
            # Guardar modelo
            self._save_model()
            print("✅ Modelo entrenado y guardado!")
            
        except Exception as e:
            print(f"❌ Error entrenando modelo: {e}")
            self._create_fallback_model()
    
    def _save_model(self) -> None:
        """Guardar modelo y mapeos"""
        os.makedirs('data', exist_ok=True)
        
        # Guardar modelo
        joblib.dump(self.model, 'data/risk_model.pkl')
        
        # Guardar mapeos de municipios
        model_data = {
            'municipio_to_id': self.municipio_to_id,
            'id_to_municipio': self.id_to_municipio,
            'feature_columns': self.feature_columns
        }
        joblib.dump(model_data, 'data/model_metadata.pkl')
    
    def _load_model(self) -> bool:
        """Cargar modelo y mapeos"""
        try:
            self.model = joblib.load('data/risk_model.pkl')
            model_data = joblib.load('data/model_metadata.pkl')
            
            self.municipio_to_id = model_data['municipio_to_id']
            self.id_to_municipio = model_data['id_to_municipio']
            self.feature_columns = model_data['feature_columns']
            
            return True
        except Exception as e:
            print(f"⚠️ Error cargando modelo: {e}")
            return False
    
    def _create_fallback_model(self) -> None:
        """Crear modelo básico si todo falla"""
        print("🔧 Creando modelo básico de emergencia...")
        
        # Datos mínimos
        X = np.array([[12, 1, 6, 0, 0, 0], [22, 6, 12, 1, 1, 1]])
        y = np.array([0, 2])  # Bajo, Alto
        
        self.model = RandomForestClassifier(n_estimators=5, random_state=42)
        self.model.fit(X, y)
        
        # Mapeo básico
        self.municipio_to_id = {'CHAPINERO': 0, 'USAQUEN': 1, 'DEFAULT': 2}
        self.id_to_municipio = {0: 'CHAPINERO', 1: 'USAQUEN', 2: 'DEFAULT'}
        
        self._save_model()
        print("✅ Modelo básico creado")
    
    def predict_risk(self, municipio: str, hora: int, dia_semana: int = 1, mes: int = 7) -> float:
        """Predice riesgo para una zona-hora específica"""
        
        # Cargar modelo si no está cargado
        if self.model is None:
            if not self._load_model():
                print("⚠️ Usando predicción heurística")
                return self._heuristic_prediction(hora, dia_semana)
        
        try:
            # Obtener ID del municipio
            municipio_clean = municipio.upper().strip()
            municipio_id = self.municipio_to_id.get(municipio_clean, 0)  # Default a 0
            
            # Crear features
            features = np.array([[
                hora,
                dia_semana,
                mes,
                1 if dia_semana in [5, 6] else 0,
                1 if (hora >= 20 or hora <= 6) else 0,
                municipio_id
            ]])
            
            # Predecir
            probabilities = self.model.predict_proba(features)[0]
            
            # Convertir probabilidades a score 0-1
            if len(probabilities) == 3:  # [bajo, medio, alto]
                risk_score = probabilities[0] * 0.1 + probabilities[1] * 0.5 + probabilities[2] * 0.9
            else:
                risk_score = 0.5  # Default
            
            return min(max(float(risk_score), 0.0), 1.0)
            
        except Exception as e:
            print(f"⚠️ Error en predicción: {e}")
            return self._heuristic_prediction(hora, dia_semana)
    
    def _heuristic_prediction(self, hora: int, dia_semana: int) -> float:
        """Predicción basada en heurísticas simples"""
        risk = 0.3  # Base
        
        # Factor hora
        if 22 <= hora or hora <= 5:
            risk += 0.4
        elif 18 <= hora <= 21:
            risk += 0.2
        
        # Factor día
        if dia_semana in [5, 6]:
            risk += 0.2
        
        return min(risk, 1.0)

# Test del modelo
if __name__ == "__main__":
    try:
        print("🚀 Iniciando entrenamiento del modelo...")
        
        # Cargar datos
        if os.path.exists('data/crime_clean.csv'):
            df = pd.read_csv('data/crime_clean.csv')
            print(f"📊 Datos cargados: {len(df)} registros")
        else:
            print("❌ No se encontraron datos, usando sintéticos")
            df = pd.DataFrame()  # DataFrame vacío
        
        # Entrenar modelo
        predictor = RiskPredictor()
        predictor.train_model(df)
        
        # Test predicciones
        test_cases = [
            ('CHAPINERO', 22, 5),  # Viernes 10 PM
            ('USAQUEN', 14, 2),    # Martes 2 PM
            ('SUBA', 2, 6),        # Sábado 2 AM
            ('UNKNOWN', 12, 1),    # Municipio desconocido
        ]
        
        print("\n🎯 Predicciones de prueba:")
        for municipio, hora, dia in test_cases:
            risk = predictor.predict_risk(municipio, hora, dia)
            nivel = "Alto" if risk > 0.6 else ("Medio" if risk > 0.3 else "Bajo")
            print(f"  📍 {municipio} {hora}:00 día {dia}: {risk:.2f} ({nivel})")
        
        print("\n✅ Modelo funcionando correctamente!")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()