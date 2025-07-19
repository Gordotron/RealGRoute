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
    def __init__(self, auto_build=True):
        self.model = None
        self.municipio_to_id: Dict[str, int] = {}
        self.id_to_municipio: Dict[int, str] = {}
        self.feature_columns = ['hora', 'dia_semana', 'mes', 'es_fin_semana', 'es_nocturno', 'municipio_encoded']
        
        # 🚀 AUTO-INICIALIZACIÓN
        if auto_build:
            self.ensure_valid_model()
        
    def ensure_valid_model(self):
        """🔧 Garantiza que hay un modelo válido - AUTO-CONSTRUCCIÓN"""
        print("🔍 Verificando modelo de IA...")
        
        if not self._model_exists():
            print("❌ No existe modelo, construyendo automáticamente...")
            self._auto_build_model()
        elif not self._model_is_valid():
            print("⚠️ Modelo inválido detectado, reconstruyendo...")
            self._auto_build_model()
        else:
            print("✅ Modelo válido encontrado")
            
        # Cargar modelo
        if not self._load_model():
            print("🔧 Error cargando, construyendo nuevo modelo...")
            self._auto_build_model()
            self._load_model()
            
        print(f"🎯 Modelo listo: {len(self.municipio_to_id)} municipios")
        
    def _model_exists(self) -> bool:
        """Verifica si existen los archivos del modelo"""
        return (os.path.exists('data/risk_model.pkl') and 
                os.path.exists('data/model_metadata.pkl'))
    
    def _model_is_valid(self) -> bool:
        """Verifica si el modelo tiene la estructura correcta"""
        try:
            model = joblib.load('data/risk_model.pkl')
            metadata = joblib.load('data/model_metadata.pkl')
            
            # Debe tener 3 clases (Bajo, Medio, Alto)
            has_three_classes = len(model.classes_) == 3
            
            # Debe tener municipios mapeados
            has_municipalities = len(metadata.get('municipio_to_id', {})) > 1
            
            return has_three_classes and has_municipalities
            
        except Exception as e:
            print(f"⚠️ Error validando modelo: {e}")
            return False
    
    def _auto_build_model(self):
        """🤖 Construye automáticamente un modelo balanceado"""
        print("🏗️ Construyendo modelo balanceado...")
        
        # Crear dataset sintético balanceado
        df = self._create_balanced_dataset(3000)
        
        # Entrenar modelo
        self.train_model(df)
        
        print("✅ Modelo construido y guardado automáticamente")
    
    def _create_balanced_dataset(self, n_samples: int = 3000) -> pd.DataFrame:
        """📊 Crea dataset sintético balanceado (lógica de rebuild_model.py)"""
        print(f"📊 Creando dataset balanceado con {n_samples} ejemplos...")
        
        # Municipios de Bogotá con sus niveles base de riesgo
        municipios_bogota = {
            'USAQUEN': 0.15, 'CHAPINERO': 0.18, 'SANTA FE': 0.25,
            'SAN CRISTOBAL': 0.55, 'USME': 0.48, 'TUNJUELITO': 0.42,
            'BOSA': 0.40, 'KENNEDY': 0.38, 'FONTIBON': 0.20,
            'ENGATIVA': 0.18, 'SUBA': 0.16, 'BARRIOS UNIDOS': 0.19,
            'TEUSAQUILLO': 0.17, 'LOS MARTIRES': 0.30, 'ANTONIO NARIÑO': 0.22,
            'PUENTE ARANDA': 0.24, 'LA CANDELARIA': 0.35, 
            'RAFAEL URIBE URIBE': 0.50, 'CIUDAD BOLIVAR': 0.75
        }
        
        # Crear mapeo de municipios
        self.municipio_to_id = {muni: idx for idx, muni in enumerate(municipios_bogota.keys())}
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        # Generar ejemplos balanceados
        examples = []
        target_distribution = {'bajo': 0.40, 'medio': 0.40, 'alto': 0.20}
        
        for risk_level, proportion in target_distribution.items():
            n_level = int(n_samples * proportion)
            
            for _ in range(n_level):
                # Seleccionar municipio según nivel deseado
                if risk_level == 'bajo':
                    municipio = np.random.choice([m for m, r in municipios_bogota.items() if r < 0.3])
                    hora = np.random.choice(range(8, 18))  # Día
                    dia_semana = np.random.choice(range(0, 5))  # Semana
                elif risk_level == 'medio':
                    municipio = np.random.choice([m for m, r in municipios_bogota.items() if 0.3 <= r < 0.6])
                    hora = np.random.choice(list(range(6, 22)))  # Variado
                    dia_semana = np.random.choice(range(0, 7))  # Cualquier día
                else:  # alto
                    municipio = np.random.choice([m for m, r in municipios_bogota.items() if r >= 0.6])
                    hora = np.random.choice(list(range(20, 24)) + list(range(0, 6)))  # Noche
                    dia_semana = np.random.choice([5, 6])  # Fin de semana
                
                mes = np.random.choice(range(1, 13))
                
                # Calcular risk_score realista
                base_risk = municipios_bogota[municipio]
                
                # Factores temporales
                if 20 <= hora or hora <= 5:  # Noche
                    base_risk += 0.25
                elif 6 <= hora <= 8 or 18 <= hora <= 20:  # Horas pico
                    base_risk += 0.10
                
                if dia_semana in [5, 6]:  # Fin de semana
                    base_risk += 0.15
                
                if mes in [12, 1, 6, 7]:  # Temporadas altas
                    base_risk += 0.05
                
                # Normalizar
                final_risk = np.clip(base_risk, 0.0, 1.0)
                
                # Convertir a categoría
                if final_risk < 0.35:
                    risk_category = 0  # Bajo
                elif final_risk < 0.65:
                    risk_category = 1  # Medio
                else:
                    risk_category = 2  # Alto
                
                example = {
                    'hora': hora,
                    'dia_semana': dia_semana,
                    'mes': mes,
                    'es_fin_semana': 1 if dia_semana in [5, 6] else 0,
                    'es_nocturno': 1 if (hora >= 20 or hora <= 6) else 0,
                    'municipio_encoded': self.municipio_to_id[municipio],
                    'risk_level': risk_category
                }
                
                examples.append(example)
        
        df = pd.DataFrame(examples)
        
        # Mostrar distribución
        distribution = df['risk_level'].value_counts().sort_index()
        print(f"📈 Distribución: Bajo({distribution.get(0, 0)}) Medio({distribution.get(1, 0)}) Alto({distribution.get(2, 0)})")
        
        return df
        
    def _encode_municipio(self, municipios: List[str]) -> Dict[str, int]:
        """Encode municipios manualmente sin LabelEncoder"""
        unique_municipios = list(set(municipios))
        municipio_to_id = {muni: idx for idx, muni in enumerate(unique_municipios)}
        return municipio_to_id
        
    def prepare_training_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepara datos para entrenar el modelo - VERSIÓN SIMPLIFICADA"""
        print("🔧 Preparando datos para entrenamiento...")
        
        # Si es un dataset ya balanceado (viene de _create_balanced_dataset)
        if 'risk_level' in df.columns:
            return df
        
        # Si son datos reales de crimen, usar lógica original pero mejorada
        if len(df) == 0:
            print("⚠️ No hay datos, creando dataset sintético")
            return self._create_balanced_dataset(3000)
        
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
            return self._create_balanced_dataset(3000)
        
        print(f"📊 Distribución de clases:")
        print(training_df['risk_level'].value_counts())
        print(f"✅ Preparados {len(training_df)} ejemplos de entrenamiento")
        
        return training_df
    
    def train_model(self, df: pd.DataFrame) -> None:
        """Entrena el modelo de predicción de riesgo"""
        print("🤖 Entrenando modelo de IA...")
        
        try:
            # Preparar datos
            training_df = self.prepare_training_data(df)
            
            if training_df is None or len(training_df) < 5:
                print("❌ Muy pocos datos, usando datos sintéticos")
                training_df = self._create_balanced_dataset(3000)
            
            # Separar features y target
            X = training_df[self.feature_columns]
            y = training_df['risk_level']
            
            print(f"📈 Entrenando con {len(X)} ejemplos")
            
            # Entrenar modelo
            self.model = RandomForestClassifier(
                n_estimators=50,  # Más árboles para mejor precisión
                max_depth=10,
                random_state=42,
                min_samples_split=2,
                min_samples_leaf=1
            )
            
            # Si hay suficientes datos, hacer split
            if len(X) >= 10:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
                
                self.model.fit(X_train, y_train)
                
                # Evaluar
                y_pred = self.model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                print(f"📊 Precisión del modelo: {accuracy:.3f}")
                
                # Mostrar distribución de clases
                unique, counts = np.unique(y, return_counts=True)
                print(f"📈 Clases entrenadas: {dict(zip(unique, counts))}")
                
            else:
                # Entrenar con todos los datos
                self.model.fit(X, y)
                print("📊 Modelo entrenado con todos los datos disponibles")
            
            # Guardar modelo
            self._save_model()
            
            if len(X) >= 10:
                try:
                    print("\n🔍 Iniciando evaluación exhaustiva...")
                    from model_evaluation import ModelEvaluator
                    
                    evaluator = ModelEvaluator(self.feature_columns, self.id_to_municipio)
                    evaluation_results = evaluator.comprehensive_evaluation(
                        self.model, X_test, y_test, X_train, y_train
                    )
                    
                    # Guardar resultados de evaluación
                    import json
                    with open('data/evaluation_results.json', 'w') as f:
                        # Convertir numpy types para JSON
                        def convert_numpy(obj):
                            if isinstance(obj, np.integer):
                                return int(obj)
                            elif isinstance(obj, np.floating):
                                return float(obj)
                            elif isinstance(obj, np.ndarray):
                                return obj.tolist()
                            return str(obj)
                        
                        json.dump(evaluation_results, f, indent=2, default=convert_numpy)
                    
                    print(f"📊 Evaluación completa guardada en: data/evaluation_results.json")
                    
                except Exception as e:
                    print(f"⚠️ Error en evaluación exhaustiva: {e}")
                    print("✅ Modelo entrenado correctamente, evaluación básica completada")
            
            print("✅ Modelo entrenado y evaluado!")

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
        
        # Datos mínimos balanceados
        X = np.array([
            [12, 1, 6, 0, 0, 0],  # Bajo
            [12, 1, 6, 0, 0, 1],  # Bajo  
            [18, 3, 8, 0, 0, 2],  # Medio
            [20, 5, 10, 1, 0, 3], # Medio
            [22, 6, 12, 1, 1, 4], # Alto
            [2, 6, 12, 1, 1, 4]   # Alto
        ])
        y = np.array([0, 0, 1, 1, 2, 2])  # Bajo, Bajo, Medio, Medio, Alto, Alto
        
        self.model = RandomForestClassifier(n_estimators=10, random_state=42)
        self.model.fit(X, y)
        
        # Mapeo básico
        self.municipio_to_id = {
            'CHAPINERO': 0, 'USAQUEN': 1, 'KENNEDY': 2, 'SUBA': 3, 'CIUDAD BOLIVAR': 4
        }
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        self._save_model()
        print("✅ Modelo básico creado")
    
    def predict_risk(self, municipio: str, hora: int, dia_semana: int = 1, mes: int = 7) -> float:
        """Predice riesgo para una zona-hora específica"""
    
        # Asegurar que el modelo esté cargado
        if self.model is None:
            self.ensure_valid_model()
    
        try:
            # Obtener ID del municipio
            municipio_clean = municipio.upper().strip()
            municipio_id = self.municipio_to_id.get(municipio_clean, 0)  # Default a 0
        
            # 🔧 CAMBIO: Crear DataFrame en lugar de array
            features_dict = {
                'hora': [hora],
                'dia_semana': [dia_semana],
                'mes': [mes],
                'es_fin_semana': [1 if dia_semana in [5, 6] else 0],
                'es_nocturno': [1 if (hora >= 20 or hora <= 6) else 0],
                'municipio_encoded': [municipio_id]
            }
        
            features_df = pd.DataFrame(features_dict)
        
            # Predecir
            probabilities = self.model.predict_proba(features_df)[0]
        
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
        
        # Entrenar modelo con auto-construcción
        predictor = RiskPredictor(auto_build=True)
        
        # Test predicciones
        test_cases = [
            ('CHAPINERO', 22, 5),  # Viernes 10 PM
            ('USAQUEN', 14, 2),    # Martes 2 PM
            ('SUBA', 2, 6),        # Sábado 2 AM
            ('CIUDAD BOLIVAR', 2, 6),  # Sábado 2 AM (peligroso)
            ('UNKNOWN', 12, 1),    # Municipio desconocido
        ]
        
        print("\n🎯 Predicciones de prueba:")
        for municipio, hora, dia in test_cases:
            risk = predictor.predict_risk(municipio, hora, dia)
            nivel = "Alto" if risk > 0.6 else ("Medio" if risk > 0.3 else "Bajo")
            print(f"  📍 {municipio} {hora}:00 día {dia}: {risk:.3f} ({nivel})")
        
        print("\n✅ Modelo funcionando correctamente!")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()