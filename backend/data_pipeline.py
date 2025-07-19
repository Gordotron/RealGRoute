import pandas as pd
import requests
from datetime import datetime, timedelta
import os

class CrimeDataLoader:
    def __init__(self):
        self.data_dir = "data"
        os.makedirs(self.data_dir, exist_ok=True)
    
    def download_bogota_crime_data(self):
        """Descarga datos reales de hurtos en Bogotá"""
        print("📥 Descargando datos de criminalidad...")
        
        # API de datos abiertos Colombia
        url = "https://www.datos.gov.co/resource/4rxi-8m8d.json"
        params = {
            "$where": "departamento='BOGOTA D.C.'",
            "$limit": 10000,  # Suficiente para el MVP
            "$order": "fecha_hecho DESC"
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Convertir a DataFrame
            df = pd.DataFrame(data)
            
            # Guardar datos crudos
            df.to_csv(f"{self.data_dir}/crime_raw.csv", index=False)
            print(f"✅ Descargados {len(df)} registros de crimen")
            
            return df
            
        except Exception as e:
            print(f"❌ Error descargando datos: {e}")
            return None
    
    def clean_data(self, df):
        """Limpia y prepara datos para IA"""
        print("🧹 Limpiando datos...")
        
        # Convertir fechas
        df['fecha_hecho'] = pd.to_datetime(df['fecha_hecho'])
        
        # Crear features temporales
        df['hora'] = df['fecha_hecho'].dt.hour
        df['dia_semana'] = df['fecha_hecho'].dt.dayofweek
        df['mes'] = df['fecha_hecho'].dt.month
        df['es_fin_semana'] = df['dia_semana'].isin([5, 6]).astype(int)
        df['es_nocturno'] = ((df['hora'] >= 20) | (df['hora'] <= 6)).astype(int)
        
        # Limpiar nombres de municipios/localidades
        if 'municipio' in df.columns:
            df['municipio'] = df['municipio'].str.upper().str.strip()
        
        # Guardar datos limpios
        df.to_csv(f"{self.data_dir}/crime_clean.csv", index=False)
        print(f"✅ Datos limpiados: {len(df)} registros válidos")
        
        return df

# Test el pipeline
if __name__ == "__main__":
    loader = CrimeDataLoader()
    raw_data = loader.download_bogota_crime_data()
    if raw_data is not None:
        clean_data = loader.clean_data(raw_data)
        print("🎉 Pipeline de datos funcionando!")