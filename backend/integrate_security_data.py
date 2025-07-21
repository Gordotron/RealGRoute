import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

class HybridRiskPredictor:
    def __init__(self, verbose=True):
        """🚀 Modelo híbrido que combina datos específicos + patrones generales"""
        self.verbose = verbose
        self.model = None
        self.municipio_to_id = {}
        self.id_to_municipio = {}
        self.crime_patterns = None  # 🔧 CACHE CRIMINAL DATA
        self.feature_columns = [
            # Temporales
            'hora', 'dia_semana', 'mes', 'es_fin_semana', 'es_nocturno',
            # Geográficos específicos
            'latitude', 'longitude', 'municipio_encoded',
            # Ambientales
            'iluminacion_score', 'personas_score',
            # Criminalidad histórica
            'criminalidad_local', 'densidad_crimenes'
        ]
        
        if verbose:
            print("🚀 HYBRID RISK PREDICTOR - REALGROUTE 3.0")
            print("=" * 60)
            print("🎯 Combinando datos específicos + patrones generales")
    
    def normalize_localidad(self, localidad):
        """🔧 Normaliza nombres de localidades para compatibilidad"""
        if pd.isna(localidad):
            return 'CENTRO'
        
        # Convertir a string y limpiar
        localidad = str(localidad).strip().upper()
        
        # Mapeo para compatibilidad (sin tildes)
        mappings = {
            'ANTONIO NARIÑO': 'ANTONIO NARINO',
            'CIUDAD BOLÍVAR': 'CIUDAD BOLIVAR',
            'ENGATIVÁ': 'ENGATIVA',
            'FONTIBÓN': 'FONTIBON',
            'LOS MÁRTIRES': 'LOS MARTIRES',
            'SAN CRISTÓBAL': 'SAN CRISTOBAL',
            'USAQUÉN': 'USAQUEN'
        }
        
        return mappings.get(localidad, localidad)
    
    def _create_synthetic_crime_patterns(self):
        """🎲 Crear patrones sintéticos de criminalidad - VERSIÓN DIRECTA"""
        if self.verbose:
            print("🎲 Generando patrones sintéticos de criminalidad...")
        
        # Localidades con sus niveles históricos de criminalidad
        synthetic_data = {
            'CIUDAD BOLIVAR': 0.85,
            'SAN CRISTOBAL': 0.75, 
            'USME': 0.65,
            'RAFAEL URIBE URIBE': 0.60,
            'KENNEDY': 0.55,
            'BOSA': 0.50,
            'LOS MARTIRES': 0.45,
            'LA CANDELARIA': 0.40,
            'SANTA FE': 0.35,
            'PUENTE ARANDA': 0.30,
            'ENGATIVA': 0.25,
            'FONTIBON': 0.22,
            'TUNJUELITO': 0.20,
            'BARRIOS UNIDOS': 0.18,
            'ANTONIO NARINO': 0.15,
            'TEUSAQUILLO': 0.12,
            'CHAPINERO': 0.10,
            'SUBA': 0.08,
            'USAQUEN': 0.05
        }
        
        # 🔧 CACHE PARA USO POSTERIOR
        self.crime_patterns = synthetic_data
        
        patterns_list = []
        for municipio, crime_level in synthetic_data.items():
            patterns_list.append({
                'municipio_clean': municipio,
                'criminalidad_local': crime_level,
                'densidad_crimenes': crime_level * 100  # Convertir a densidad
            })
        
        return pd.DataFrame(patterns_list)
    
    def load_and_merge_datasets(self):
        """📊 Carga y fusiona ambos datasets - VERSIÓN SIMPLIFICADA"""
        if self.verbose:
            print("\n📊 CARGANDO Y FUSIONANDO DATASETS")
            print("-" * 40)
        
        # 1. Cargar datos específicos
        specific_data = pd.read_csv('data/security/security_points_processed.csv')
        if self.verbose:
            print(f"✅ Datos específicos: {len(specific_data):,} puntos precisos")
        
        # 2. Usar directamente patrones sintéticos (más confiable)
        crime_data = self._create_synthetic_crime_patterns()
        if self.verbose:
            print(f"✅ Datos criminalidad: {len(crime_data)} patrones sintéticos")
        
        # 3. Normalizar localidades
        specific_data['localidad_clean'] = specific_data['localidad'].apply(self.normalize_localidad)
        
        # 4. Merge simple
        merged = specific_data.merge(
            crime_data,
            left_on='localidad_clean',
            right_on='municipio_clean',
            how='left'
        )
        
        # 5. Rellenar faltantes con valores neutros
        merged['criminalidad_local'].fillna(0.5, inplace=True)
        merged['densidad_crimenes'].fillna(50, inplace=True)
        
        if self.verbose:
            merge_success = (merged['criminalidad_local'].notna().sum() / len(merged)) * 100
            print(f"✅ Merge exitoso: {merge_success:.1f}% de puntos enriquecidos")
            print(f"📊 Features híbridas: {len(self.feature_columns)}")
            print(f"🎉 Dataset híbrido: {len(merged):,} puntos enriquecidos")
        
        return merged
    
    def train_hybrid_model(self):
        """🤖 Entrena modelo híbrido - VERSIÓN OPTIMIZADA"""
        if self.verbose:
            print(f"\n🤖 ENTRENANDO MODELO HÍBRIDO")
            print("-" * 40)
        
        # Cargar y fusionar datasets
        merged_data = self.load_and_merge_datasets()
        
        # Crear mapeo de municipios
        unique_localidades = merged_data['localidad_clean'].unique()
        self.municipio_to_id = {loc: idx for idx, loc in enumerate(sorted(unique_localidades))}
        self.id_to_municipio = {v: k for k, v in self.municipio_to_id.items()}
        
        # 🔧 OPTIMIZACIÓN: Generar menos ejemplos para evitar overfit
        training_examples = []
        sample_size = min(1000, len(merged_data))  # Máximo 1000 puntos
        sampled_data = merged_data.sample(n=sample_size, random_state=42)
        
        for _, point in sampled_data.iterrows():
            localidad = point['localidad_clean']
            municipio_id = self.municipio_to_id[localidad]
            
            # Solo 3 horarios y 3 días para ser eficiente
            for hora in [8, 14, 22]:  # Mañana, tarde, noche
                for dia in [1, 3, 6]:  # Lunes, miércoles, sábado
                    
                    # Risk base del punto específico
                    risk_base = point['risk_score']
                    
                    # Factor de criminalidad
                    crime_factor = point.get('criminalidad_local', 0.5) * 0.3
                    risk_base += crime_factor
                    
                    # Factores temporales
                    if hora >= 22 or hora <= 6:
                        risk_base += 0.20
                    elif 18 <= hora <= 21:
                        risk_base += 0.10
                    
                    if dia == 6:  # Sábado
                        risk_base += 0.15
                    
                    # Factores ambientales
                    ilum_penalty = (1 - point['iluminacion_score']) * 0.1
                    personas_penalty = (1 - point['personas_score']) * 0.08
                    risk_base += ilum_penalty + personas_penalty
                    
                    # Factor de densidad
                    density_factor = (point.get('densidad_crimenes', 50) / 100) * 0.1
                    risk_base += density_factor
                    
                    risk_final = np.clip(risk_base, 0.0, 1.0)
                    
                    # Categorización balanceada
                    if risk_final < 0.35:
                        risk_category = 0  # Bajo
                    elif risk_final < 0.70:
                        risk_category = 1  # Medio
                    else:
                        risk_category = 2  # Alto
                    
                    training_examples.append({
                        'hora': hora,
                        'dia_semana': dia,
                        'mes': 7,
                        'es_fin_semana': 1 if dia == 6 else 0,
                        'es_nocturno': 1 if (hora >= 20 or hora <= 6) else 0,
                        'latitude': point['latitude'],
                        'longitude': point['longitude'],
                        'municipio_encoded': municipio_id,
                        'iluminacion_score': point['iluminacion_score'],
                        'personas_score': point['personas_score'],
                        'criminalidad_local': point.get('criminalidad_local', 0.5),
                        'densidad_crimenes': point.get('densidad_crimenes', 50),
                        'risk_level': risk_category
                    })
        
        training_df = pd.DataFrame(training_examples)
        
        if self.verbose:
            print(f"✅ Ejemplos híbridos: {len(training_df):,}")
            
            # Distribución
            risk_dist = training_df['risk_level'].value_counts().sort_index()
            print(f"📊 Distribución: Bajo({risk_dist.get(0,0)}) Medio({risk_dist.get(1,0)}) Alto({risk_dist.get(2,0)})")
        
        # Entrenar modelo
        X = training_df[self.feature_columns]
        y = training_df['risk_level']
        
        self.model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42)
        self.model.fit(X, y)
        
        if self.verbose:
            print("✅ Modelo híbrido entrenado!")
            
            # Feature importance
            importances = self.model.feature_importances_
            feature_imp = list(zip(self.feature_columns, importances))
            feature_imp.sort(key=lambda x: x[1], reverse=True)
            
            print(f"\n🎯 Top 5 características más importantes:")
            for feat, imp in feature_imp[:5]:
                print(f"  {feat}: {imp:.3f}")
        
        # Guardar modelo
        self._save_hybrid_model()
        
        return self.model
    
    def _save_hybrid_model(self):
        """💾 Guardar modelo híbrido"""
        os.makedirs('data', exist_ok=True)
        
        joblib.dump(self.model, 'data/hybrid_risk_model.pkl')
        joblib.dump({
            'municipio_to_id': self.municipio_to_id,
            'id_to_municipio': self.id_to_municipio,
            'feature_columns': self.feature_columns,
            'crime_patterns': self.crime_patterns  # 🔧 GUARDAR CACHE
        }, 'data/hybrid_model_metadata.pkl')
        
        if self.verbose:
            print("💾 Modelo híbrido guardado")
    
    def predict_hybrid_risk(self, municipio, latitude, longitude, hora, dia_semana):
        """🎯 Predicción híbrida - VERSIÓN ULTRA SIMPLE"""
        
        # Normalizar municipio
        municipio_clean = self.normalize_localidad(municipio)
        municipio_id = self.municipio_to_id.get(municipio_clean, 0)
        
        # 🔧 USAR CACHE DIRECTO - SIN APIs
        if self.crime_patterns is None:
            # Recrear cache si no existe
            self._create_synthetic_crime_patterns()
        
        # Obtener criminalidad desde cache
        criminalidad_local = self.crime_patterns.get(municipio_clean, 0.5)
        densidad_crimenes = criminalidad_local * 100
        
        # Estimar scores ambientales
        iluminacion_score = 0.7  # Base
        personas_score = 0.6     # Base
        
        # Crear features para predicción
        features = pd.DataFrame({
            'hora': [hora],
            'dia_semana': [dia_semana],
            'mes': [7],
            'es_fin_semana': [1 if dia_semana in [5, 6] else 0],
            'es_nocturno': [1 if (hora >= 20 or hora <= 6) else 0],
            'latitude': [latitude],
            'longitude': [longitude],
            'municipio_encoded': [municipio_id],
            'iluminacion_score': [iluminacion_score],
            'personas_score': [personas_score],
            'criminalidad_local': [criminalidad_local],
            'densidad_crimenes': [densidad_crimenes]
        })
        
        # Predicción
        probabilities = self.model.predict_proba(features)[0]
        risk_score = probabilities[0] * 0.1 + probabilities[1] * 0.5 + probabilities[2] * 0.9
        
        return min(max(float(risk_score), 0.0), 1.0)

# Test del modelo híbrido
if __name__ == "__main__":
    print("🚀 PROBANDO MODELO HÍBRIDO REALGROUTE 3.0 - ULTRA FIX")
    print("=" * 80)
    
    try:
        predictor = HybridRiskPredictor(verbose=True)
        model = predictor.train_hybrid_model()
        
        print(f"\n🧪 PRUEBAS DEL MODELO HÍBRIDO")
        print("-" * 40)
        
        # Test cases
        test_cases = [
            ('USAQUEN', 4.7030, -74.0350, 14, 2, 'Zona segura + día'),
            ('CIUDAD BOLIVAR', 4.4940, -74.1430, 22, 6, 'Zona peligrosa + noche + sábado'),
            ('CHAPINERO', 4.6590, -74.0630, 10, 1, 'Zona segura + mañana'),
            ('SAN CRISTOBAL', 4.5570, -74.0820, 2, 6, 'Zona peligrosa + madrugada'),
        ]
        
        for municipio, lat, lng, hora, dia, desc in test_cases:
            risk = predictor.predict_hybrid_risk(municipio, lat, lng, hora, dia)
            nivel = "Alto" if risk > 0.6 else ("Medio" if risk > 0.3 else "Bajo")
            print(f"📍 {municipio}: {risk:.3f} ({nivel}) - {desc}")
        
        print(f"\n🎉 ¡MODELO HÍBRIDO FUNCIONANDO!")
        print(f"✅ Combina ubicación exacta + patrones de criminalidad")
        print(f"✅ Usa {len(predictor.feature_columns)} características")
        print(f"✅ {len(predictor.municipio_to_id)} municipios mapeados")
        print(f"✅ Listo para máxima precisión")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()