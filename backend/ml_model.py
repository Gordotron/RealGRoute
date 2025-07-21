import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from typing import Dict, Any, List, Tuple
from datetime import datetime

class RiskPredictor:
    def __init__(self, auto_build=True, verbose=True):
        """🤖 Inicializar predictor de riesgo con datos oficiales de Bogotá"""
        self.model = None
        self.municipio_to_id: Dict[str, int] = {}
        self.id_to_municipio: Dict[int, str] = {}
        self.feature_columns = ['hora', 'dia_semana', 'mes', 'es_fin_semana', 'es_nocturno', 'municipio_encoded']
        self.verbose = verbose
        
        if self.verbose:
            print("🤖 INICIANDO REALGROUTE RISK PREDICTOR")
            print("=" * 60)
            print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"👤 Usuario: Gordotron")
            print(f"🚀 Versión: 2.0.0 - Gold Data Edition")
        
        # 🚀 AUTO-INICIALIZACIÓN
        if auto_build:
            self.ensure_valid_model()
        
    def normalize_localidad(self, localidad):
        """🔧 Normaliza nombres de localidades para compatibilidad"""
        if pd.isna(localidad):
            return 'CENTRO'
        
        # Convertir a string y limpiar
        localidad = str(localidad).strip()
        
        # Arreglar caracteres corruptos específicos
        fixes = {
            'Antonio Nari??o': 'Antonio Nariño',
            'Los Mártires': 'Los Mártires',
            'San Cristóbal': 'San Cristóbal'
        }
        
        if localidad in fixes:
            localidad = fixes[localidad]
        
        # Normalizar a mayúsculas
        localidad = localidad.upper()
        
        # Mapeo para compatibilidad (sin tildes)
        mappings = {
            'ANTONIO NARIÑO': 'ANTONIO NARIÑO',
            'BARRIOS UNIDOS': 'BARRIOS UNIDOS',
            'CIUDAD BOLÍVAR': 'CIUDAD BOLIVAR',
            'ENGATIVÁ': 'ENGATIVA',
            'FONTIBÓN': 'FONTIBON',
            'LOS MÁRTIRES': 'LOS MARTIRES',
            'RAFAEL URIBE URIBE': 'RAFAEL URIBE URIBE',
            'SAN CRISTÓBAL': 'SAN CRISTOBAL',
            'TEUSAQUILLO': 'TEUSAQUILLO',
            'TUNJUELITO': 'TUNJUELITO',
            'USAQUÉN': 'USAQUEN',
            'PUENTE ARANDA': 'PUENTE ARANDA',
            'LA CANDELARIA': 'LA CANDELARIA',
            'SANTA FE': 'SANTA FE',
            'CHAPINERO': 'CHAPINERO',
            'KENNEDY': 'KENNEDY',
            'SUBA': 'SUBA',
            'BOSA': 'BOSA',
            'USME': 'USME'
        }
        
        return mappings.get(localidad, localidad)
        
    def ensure_valid_model(self):
        """🔧 Garantiza que hay un modelo válido - AUTO-CONSTRUCCIÓN"""
        if self.verbose:
            print("\n🔍 Verificando modelo de IA...")
        
        if not self._model_exists():
            if self.verbose:
                print("❌ No existe modelo, construyendo automáticamente...")
            self._auto_build_model()
        elif not self._model_is_valid():
            if self.verbose:
                print("⚠️ Modelo inválido detectado, reconstruyendo...")
            self._auto_build_model()
        else:
            if self.verbose:
                print("✅ Modelo válido encontrado")
            
        # Cargar modelo
        if not self._load_model():
            if self.verbose:
                print("🔧 Error cargando, construyendo nuevo modelo...")
            self._auto_build_model()
            self._load_model()
            
        if self.verbose:
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
            
            # Verificar que municipio_encoded tenga importancia > 0
            if hasattr(model, 'feature_importances_'):
                municipio_importance = model.feature_importances_[-1]  # último feature
                has_municipio_importance = municipio_importance > 0.1
            else:
                has_municipio_importance = True
            
            return has_three_classes and has_municipalities and has_municipio_importance
            
        except Exception as e:
            if self.verbose:
                print(f"⚠️ Error validando modelo: {e}")
            return False
    
    def _auto_build_model(self):
        """🤖 Construye automáticamente un modelo con datos oficiales"""
        if self.verbose:
            print("\n🏗️ Construyendo modelo con datos oficiales...")
        
        # Intentar cargar datos oficiales primero
        if os.path.exists('data/security/security_points_processed.csv'):
            if self.verbose:
                print("📊 Datos oficiales encontrados, usando datos reales...")
            df = pd.read_csv('data/security/security_points_processed.csv')
            official_data = self._prepare_official_data(df)
            self.train_model(official_data)
        else:
            if self.verbose:
                print("⚠️ No hay datos oficiales, creando dataset sintético balanceado...")
            df = self._create_balanced_dataset(3000)
            self.train_model(df)
        
        if self.verbose:
            print("✅ Modelo construido y guardado automáticamente")
    
    def _prepare_official_data(self, security_points_df: pd.DataFrame) -> pd.DataFrame:
        """📊 Prepara datos oficiales para entrenamiento"""
        if self.verbose:
            print(f"\n📊 PREPARANDO DATOS OFICIALES")
            print("-" * 40)
            print(f"📈 Puntos oficiales cargados: {len(security_points_df)}")
        
        # Normalizar localidades
        security_points_df['localidad_clean'] = security_points_df['localidad'].apply(self.normalize_localidad)
        
        unique_clean = security_points_df['localidad_clean'].unique()
        if self.verbose:
            print(f"🏘️ Localidades encontradas ({len(unique_clean)}):")
            for i, loc in enumerate(sorted(unique_clean)[:10]):  # Mostrar solo 10
                count = len(security_points_df[security_points_df['localidad_clean'] == loc])
                print(f"  {loc}: {count} puntos")
            if len(unique_clean) > 10:
                print(f"  ... y {len(unique_clean) - 10} más")
        
        # Crear mapeo correcto
        self.municipio_to_id = {loc: idx for idx, loc in enumerate(sorted(unique_clean))}
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        # Factores de riesgo por localidad (basados en realidad de Bogotá)
        localidad_risk_factors = {
            'CIUDAD BOLIVAR': 0.25,      # Zona más peligrosa
            'SAN CRISTOBAL': 0.20,       # Alta criminalidad
            'USME': 0.15,                # Periferia peligrosa
            'RAFAEL URIBE URIBE': 0.15,  # Sur de Bogotá
            'KENNEDY': 0.10,             # Densamente poblada
            'BOSA': 0.10,                # Periferia sur
            'TUNJUELITO': 0.08,          # Sur
            'LOS MARTIRES': 0.05,        # Centro con problemas
            'LA CANDELARIA': 0.05,       # Centro histórico
            'SANTA FE': 0.05,            # Centro
            'PUENTE ARANDA': 0.02,       # Industrial
            'ANTONIO NARIÑO': 0.00,      # Residencial
            'ENGATIVA': -0.02,           # Zona media-alta
            'BARRIOS UNIDOS': -0.05,     # Zona media
            'FONTIBON': -0.05,           # Zona media
            'TEUSAQUILLO': -0.08,        # Zona alta
            'CHAPINERO': -0.10,          # Zona alta
            'SUBA': -0.12,               # Zona residencial segura
            'USAQUEN': -0.15,            # Zona más segura
        }
        
        # Generar ejemplos de entrenamiento
        training_examples = []
        
        if self.verbose:
            print(f"\n🤖 Generando ejemplos de entrenamiento...")
        
        for _, point in security_points_df.iterrows():
            try:
                localidad_clean = point['localidad_clean']
                municipio_id = self.municipio_to_id[localidad_clean]
                
                # Factor de riesgo base por localidad
                localidad_factor = localidad_risk_factors.get(localidad_clean, 0.0)
                
                # Crear ejemplos variados
                for hora in [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2]:
                    for dia in [0, 1, 2, 3, 4, 5, 6]:  # Todos los días
                        
                        # Risk base del punto oficial
                        risk_base = point['risk_score']
                        
                        # Agregar factor de localidad
                        risk_base += localidad_factor
                        
                        # Factores temporales
                        if 22 <= hora or hora <= 5:  # Noche profunda
                            risk_base += 0.20
                        elif 18 <= hora <= 21:       # Noche temprana
                            risk_base += 0.10
                        elif 6 <= hora <= 8:         # Amanecer
                            risk_base += 0.05
                        
                        # Factor día de semana
                        if dia in [5, 6]:  # Sábado, domingo
                            risk_base += 0.12
                        elif dia == 4:     # Viernes
                            risk_base += 0.08
                        
                        # Factores adicionales de los datos oficiales
                        if 'iluminacion_score' in point and not pd.isna(point['iluminacion_score']):
                            ilum_penalty = (1 - point['iluminacion_score']) * 0.08
                            risk_base += ilum_penalty
                        
                        if 'personas_score' in point and not pd.isna(point['personas_score']):
                            personas_penalty = (1 - point['personas_score']) * 0.06
                            risk_base += personas_penalty
                        
                        # Normalizar
                        risk_final = np.clip(risk_base, 0.0, 1.0)
                        
                        # Convertir a categoría
                        if risk_final < 0.35:
                            risk_category = 0  # Bajo
                        elif risk_final < 0.65:
                            risk_category = 1  # Medio
                        else:
                            risk_category = 2  # Alto
                        
                        training_examples.append({
                            'hora': hora,
                            'dia_semana': dia,
                            'mes': 7,
                            'es_fin_semana': 1 if dia in [5, 6] else 0,
                            'es_nocturno': 1 if (hora >= 20 or hora <= 6) else 0,
                            'municipio_encoded': municipio_id,  # ✅ ID CORRECTO!
                            'risk_level': risk_category
                        })
            
            except Exception as e:
                if self.verbose:
                    print(f"⚠️ Error con punto: {e}")
                continue
        
        training_df = pd.DataFrame(training_examples)
        
        if self.verbose:
            print(f"✅ Ejemplos generados: {len(training_df):,}")
            
            # Distribución por municipio (mostrar top 5)
            municipio_counts = training_df['municipio_encoded'].value_counts().sort_index()
            print(f"\n📊 Top 5 municipios por ejemplos:")
            for i, (muni_id, count) in enumerate(municipio_counts.head().items()):
                muni_name = self.id_to_municipio[muni_id]
                print(f"  {muni_name}: {count:,} ejemplos")
            
            # Distribución por riesgo
            risk_counts = training_df['risk_level'].value_counts().sort_index()
            print(f"\n📊 Distribución por riesgo:")
            print(f"  Bajo (0): {risk_counts.get(0, 0):,}")
            print(f"  Medio (1): {risk_counts.get(1, 0):,}")
            print(f"  Alto (2): {risk_counts.get(2, 0):,}")
        
        return training_df
    
    def _create_balanced_dataset(self, n_samples: int = 3000) -> pd.DataFrame:
        """📊 Crea dataset sintético balanceado (fallback)"""
        if self.verbose:
            print(f"📊 Creando dataset sintético balanceado con {n_samples} ejemplos...")
        
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
        
        if self.verbose:
            # Mostrar distribución
            distribution = df['risk_level'].value_counts().sort_index()
            print(f"📈 Distribución sintética: Bajo({distribution.get(0, 0)}) Medio({distribution.get(1, 0)}) Alto({distribution.get(2, 0)})")
        
        return df
        
    def train_model(self, df: pd.DataFrame) -> None:
        """Entrena el modelo de predicción de riesgo"""
        if self.verbose:
            print(f"\n🤖 ENTRENANDO MODELO DE IA")
            print("-" * 40)
        
        try:
            # Usar datos directamente si ya están preparados
            if 'risk_level' in df.columns:
                training_df = df
            else:
                training_df = self._prepare_official_data(df)
            
            if training_df is None or len(training_df) < 5:
                if self.verbose:
                    print("❌ Muy pocos datos, usando datos sintéticos")
                training_df = self._create_balanced_dataset(3000)
            
            # Separar features y target
            X = training_df[self.feature_columns]
            y = training_df['risk_level']
            
            if self.verbose:
                print(f"📈 Entrenando con {len(X):,} ejemplos")
            
            # Entrenar modelo
            self.model = RandomForestClassifier(
                n_estimators=50,
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
                
                if self.verbose:
                    print(f"📊 Precisión del modelo: {accuracy:.3f}")
                    
                    # Feature importance
                    if hasattr(self.model, 'feature_importances_'):
                        print(f"\n🎯 Importancia de características:")
                        importances = self.model.feature_importances_
                        for feature, importance in zip(self.feature_columns, importances):
                            print(f"  {feature}: {importance:.3f}")
                
            else:
                # Entrenar con todos los datos
                self.model.fit(X, y)
                if self.verbose:
                    print("📊 Modelo entrenado con todos los datos disponibles")
            
            # Guardar modelo
            self._save_model()
            
            if self.verbose:
                print("✅ Modelo entrenado y guardado!")
                
                # Test rápido
                self._quick_test()

        except Exception as e:
            if self.verbose:
                print(f"❌ Error entrenando modelo: {e}")
            self._create_fallback_model()
    
    def _quick_test(self):
        """🧪 Test rápido del modelo entrenado"""
        if self.verbose:
            print(f"\n🧪 TEST RÁPIDO DEL MODELO")
            print("-" * 30)
        
        test_cases = [
            ('CHAPINERO', 14, 2, 'Zona segura + Día'),
            ('CIUDAD BOLIVAR', 14, 2, 'Zona peligrosa + Día'),
            ('USAQUEN', 10, 1, 'Zona muy segura'),
            ('CIUDAD BOLIVAR', 22, 6, 'Zona peligrosa + Noche + Sábado')
        ]
        
        for municipio, hora, dia, desc in test_cases:
            try:
                risk = self.predict_risk(municipio, hora, dia)
                nivel = "Alto" if risk > 0.6 else ("Medio" if risk > 0.3 else "Bajo")
                if self.verbose:
                    print(f"  📍 {municipio}: {risk:.3f} ({nivel}) - {desc}")
            except Exception as e:
                if self.verbose:
                    print(f"  ❌ {municipio}: Error - {e}")
        
        # Verificar diferenciación
        if len(test_cases) >= 2:
            try:
                risk1 = self.predict_risk(test_cases[0][0], 14, 2)
                risk2 = self.predict_risk(test_cases[1][0], 14, 2)
                diff = abs(risk2 - risk1)
                
                if self.verbose:
                    print(f"\n🔍 Verificación diferenciación:")
                    print(f"  Diferencia entre zonas: {diff:.3f}")
                    if diff > 0.05:
                        print(f"  ✅ ¡Modelo diferencia correctamente!")
                    else:
                        print(f"  ⚠️ Diferenciación baja")
            except Exception as e:
                if self.verbose:
                    print(f"  ❌ Error en verificación: {e}")

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
            if self.verbose:
                print(f"⚠️ Error cargando modelo: {e}")
            return False
    
    def _create_fallback_model(self) -> None:
        """Crear modelo básico si todo falla"""
        if self.verbose:
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
        if self.verbose:
            print("✅ Modelo básico creado")
    
    def predict_risk(self, municipio: str, hora: int, dia_semana: int = 1, mes: int = 7) -> float:
        """Predice riesgo para una zona-hora específica"""
    
        # Asegurar que el modelo esté cargado
        if self.model is None:
            self.ensure_valid_model()
    
        try:
            # Normalizar municipio y obtener ID
            municipio_clean = self.normalize_localidad(municipio)
            municipio_id = self.municipio_to_id.get(municipio_clean, 0)
        
            # Crear DataFrame para predicción
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
            if self.verbose:
                print(f"⚠️ Error en predicción: {e}")
            return self._heuristic_prediction(hora, dia_semana)
    
    def _heuristic_prediction(self, hora: int, dia_semana: int) -> float:
        """Predicción basada en heurísticas simples"""
        risk = 0.3  # Base
        
        # Factor hora
        if 22 <= hora or hora <= 5:
            risk += 0.15
        elif 18 <= hora <= 21:
            risk += 0.1
        
        # Factor día
        if dia_semana in [5, 6]:
            risk += 0.05
        
        return min(risk, 1.0)

# Test del modelo
if __name__ == "__main__":
    try:
        print("🚀 INICIANDO REALGROUTE ML MODEL")
        print("=" * 80)
        
        # Entrenar modelo con auto-construcción y verbose
        predictor = RiskPredictor(auto_build=True, verbose=True)
        
        print(f"\n🎉 ¡MODELO LISTO PARA USAR!")
        print(f"✅ {len(predictor.municipio_to_id)} municipios mapeados")
        print(f"✅ Listo para integrar con API")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()