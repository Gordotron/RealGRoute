# Archivo para investigar el modelo en profundidad
from ml_model import RiskPredictor
import joblib
import os
import numpy as np

def debug_model_loading():
    """Investiga qué modelo se está cargando"""
    print("🔍 INVESTIGANDO EL MODELO...")
    
    # 1. Verificar archivos existentes
    print("\n📁 Archivos en data/:")
    if os.path.exists('data'):
        files = os.listdir('data')
        for file in files:
            size = os.path.getsize(f'data/{file}')
            print(f"  {file} ({size} bytes)")
    else:
        print("  ❌ Carpeta 'data' no existe")
    
    # 2. Inspeccionar metadata
    print("\n🗺️ METADATA:")
    try:
        metadata = joblib.load('data/model_metadata.pkl')
        print(f"  Municipios: {len(metadata['municipio_to_id'])}")
        print(f"  Features: {metadata['feature_columns']}")
    except Exception as e:
        print(f"  ❌ Error cargando metadata: {e}")
    
    # 3. Inspeccionar modelo
    print("\n🤖 MODELO:")
    try:
        model = joblib.load('data/risk_model.pkl')
        print(f"  Tipo: {type(model)}")
        print(f"  Classes: {model.classes_ if hasattr(model, 'classes_') else 'N/A'}")
        print(f"  N estimators: {model.n_estimators if hasattr(model, 'n_estimators') else 'N/A'}")
        print(f"  Feature importances: {model.feature_importances_ if hasattr(model, 'feature_importances_') else 'N/A'}")
    except Exception as e:
        print(f"  ❌ Error cargando modelo: {e}")
    
    # 4. Crear predictor y probar
    print("\n🧪 TESTEO INTERNO:")
    predictor = RiskPredictor()
    
    # Verificar si carga modelo
    if predictor._load_model():
        print("  ✅ Modelo cargado")
        
        # Test con datos específicos
        test_cases = [
            ("CIUDAD BOLIVAR", 2, 6, 18),  # ID conocido
            ("USAQUEN", 14, 2, 0),         # ID conocido
            ("FAKE_MUNICIPIO", 12, 1, -1)  # ID desconocido
        ]
        
        for municipio, hora, dia, expected_id in test_cases:
            print(f"\n  🎯 Test {municipio}:")
            
            # Verificar mapeo
            actual_id = predictor.municipio_to_id.get(municipio.upper(), -1)
            print(f"    Municipio ID: {actual_id} (esperado: {expected_id})")
            
            # Crear features manualmente
            features = np.array([[
                hora,
                dia,
                7,  # mes
                1 if dia in [5, 6] else 0,
                1 if (hora >= 20 or hora <= 6) else 0,
                actual_id if actual_id != -1 else 0
            ]])
            
            print(f"    Features: {features[0]}")
            
            # Predicción del modelo
            if predictor.model:
                try:
                    probabilities = predictor.model.predict_proba(features)[0]
                    prediction = predictor.model.predict(features)[0]
                    print(f"    Probabilidades: {probabilities}")
                    print(f"    Predicción clase: {prediction}")
                    
                    # Calcular risk_score manualmente
                    if len(probabilities) == 3:
                        risk_score = probabilities[0] * 0.1 + probabilities[1] * 0.5 + probabilities[2] * 0.9
                        print(f"    Risk score calculado: {risk_score}")
                except Exception as e:
                    print(f"    ❌ Error en predicción: {e}")
            
            # Predicción con la función completa
            final_risk = predictor.predict_risk(municipio, hora, dia)
            print(f"    Risk final: {final_risk}")
    
    else:
        print("  ❌ No se pudo cargar modelo")
        print("  🔄 Probando predicción heurística...")
        risk = predictor._heuristic_prediction(2, 6)  # 2 AM sábado
        print(f"    Heurística 2 AM sábado: {risk}")

if __name__ == "__main__":
    debug_model_loading()