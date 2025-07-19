import pandas as pd
import requests
from datetime import datetime, timedelta
import os

class CrimeDataLoader:
    def __init__(self):
        self.data_dir = "data"
        os.makedirs(self.data_dir, exist_ok=True)
    
    def download_bogota_crime_data(self, days_back=365):
        """Descarga datos reales de hurtos en Bogotá"""
        print("📥 Descargando datos de criminalidad...")
        
        # 🆕 USAR datetime para filtrar datos recientes
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # API de datos abiertos Colombia
        url = "https://www.datos.gov.co/resource/4rxi-8m8d.json"
        params = {
            "$where": f"departamento='BOGOTA D.C.' AND fecha_hecho >= '{start_date.isoformat()}'",
            "$limit": 10000,
            "$order": "fecha_hecho DESC"
        }
        
        print(f"📅 Descargando datos desde: {start_date.strftime('%Y-%m-%d')}")
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Convertir a DataFrame
            df = pd.DataFrame(data)
            
            # 🆕 Agregar metadata de descarga
            df['downloaded_at'] = datetime.now().isoformat()
            
            # Guardar datos crudos
            df.to_csv(f"{self.data_dir}/crime_raw.csv", index=False)
            print(f"✅ Descargados {len(df)} registros de crimen")
            print(f"📊 Rango: {start_date.strftime('%Y-%m-%d')} a {end_date.strftime('%Y-%m-%d')}")
            
            return df
            
        except Exception as e:
            print(f"❌ Error descargando datos: {e}")
            return None
    
    def clean_data(self, df):
        """Limpia y prepara datos para IA"""
        print("🧹 Limpiando datos...")
        
        # Convertir fechas
        df['fecha_hecho'] = pd.to_datetime(df['fecha_hecho'])
        
        # 🆕 Filtrar datos muy antiguos o futuros usando datetime
        now = datetime.now()
        cutoff_date = now - timedelta(days=730)  # Máximo 2 años atrás
        
        df = df[df['fecha_hecho'] >= cutoff_date]
        df = df[df['fecha_hecho'] <= now]
        
        print(f"📅 Datos filtrados: después de {cutoff_date.strftime('%Y-%m-%d')}")
        
        # Crear features temporales
        df['hora'] = df['fecha_hecho'].dt.hour
        df['dia_semana'] = df['fecha_hecho'].dt.dayofweek
        df['mes'] = df['fecha_hecho'].dt.month
        df['es_fin_semana'] = df['dia_semana'].isin([5, 6]).astype(int)
        df['es_nocturno'] = ((df['hora'] >= 20) | (df['hora'] <= 6)).astype(int)
        
        # 🆕 Agregar features temporales adicionales
        df['dias_desde_hoy'] = (now - df['fecha_hecho']).dt.days
        df['es_reciente'] = (df['dias_desde_hoy'] <= 30).astype(int)  # Último mes
        
        # Limpiar nombres de municipios/localidades
        if 'municipio' in df.columns:
            df['municipio'] = df['municipio'].str.upper().str.strip()
        
        # Guardar datos limpios
        df.to_csv(f"{self.data_dir}/crime_clean.csv", index=False)
        print(f"✅ Datos limpiados: {len(df)} registros válidos")
        
        return df

    def get_data_stats(self):
        """🆕 Estadísticas de los datos usando datetime"""
        try:
            df = pd.read_csv(f"{self.data_dir}/crime_clean.csv")
            df['fecha_hecho'] = pd.to_datetime(df['fecha_hecho'])
            
            now = datetime.now()
            stats = {
                'total_records': len(df),
                'date_range': {
                    'from': df['fecha_hecho'].min().strftime('%Y-%m-%d'),
                    'to': df['fecha_hecho'].max().strftime('%Y-%m-%d')
                },
                'data_freshness_days': (now - df['fecha_hecho'].max()).days,
                'municipios': df['municipio'].nunique(),
                'last_30_days': len(df[df['fecha_hecho'] >= (now - timedelta(days=30))])
            }
            
            return stats
        except:
            return None

# Test el pipeline
if __name__ == "__main__":
    loader = CrimeDataLoader()
    
    # 🆕 Descargar solo últimos 6 meses (más rápido)
    raw_data = loader.download_bogota_crime_data(days_back=180)
    
    if raw_data is not None:
        clean_data = loader.clean_data(raw_data)
        
        # 🆕 Mostrar estadísticas
        stats = loader.get_data_stats()
        if stats:
            print(f"\n📊 Estadísticas de datos:")
            print(f"  📝 Total registros: {stats['total_records']}")
            print(f"  📅 Rango: {stats['date_range']['from']} a {stats['date_range']['to']}")
            print(f"  🕐 Datos más recientes: hace {stats['data_freshness_days']} días")
            print(f"  🏘️ Municipios: {stats['municipios']}")
            print(f"  📈 Últimos 30 días: {stats['last_30_days']} crímenes")
        
        print("🎉 Pipeline de datos funcionando!")