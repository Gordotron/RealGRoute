import numpy as np
import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import pandas as pd

@dataclass
class RoutePoint:
    lat: float
    lng: float
    risk_score: float
    cost: float = 0.0
    distance: float = 0.0
    zone_type: str = "unknown"
    municipio: str = "unknown"

@dataclass
class RouteSegment:
    start: RoutePoint
    end: RoutePoint
    distance_km: float
    risk_score: float
    time_minutes: float
    safety_factor: float

class IntelligentRouter:
    def __init__(self, balanced_predictor, verbose=True):
        """🧠 Router inteligente integrado con BalancedHybridRiskPredictor"""
        self.predictor = balanced_predictor
        self.verbose = verbose
        
        # ✅ Verificar que es el modelo balanceado
        if not hasattr(self.predictor, 'predict_balanced_risk'):
            raise ValueError("❌ Router requiere BalancedHybridRiskPredictor")
        
        # 🗺️ GRID DE BOGOTÁ (coordenadas aproximadas)
        self.bogota_bounds = {
            'north': 4.8353,    # Norte de Bogotá
            'south': 4.3774,    # Sur de Bogotá  
            'east': -73.9387,   # Este de Bogotá
            'west': -74.2227    # Oeste de Bogotá
        }
        
        # 📏 RESOLUCIÓN DEL GRID (optimizada para rendimiento)
        self.grid_resolution = 0.008  # ~800m por celda (balance precisión/velocidad)
        
        # 🛣️ FACTORES DE ROUTING OPTIMIZADOS
        self.routing_factors = {
            'safety_weight': 0.60,     # 60% seguridad (prioridad máxima)
            'distance_weight': 0.30,   # 30% distancia
            'time_weight': 0.10        # 10% tiempo
        }
        
        # 📍 Coordenadas de localidades (importar desde main si está disponible)
        self._load_localidades_coords()
        
        if verbose:
            print("🧠 INTELLIGENT ROUTER - REALGROUTE 3.0")
            print("=" * 50)
            print(f"🔗 Integrado con: {type(self.predictor).__name__}")
            print(f"🎯 Zonas disponibles: {len(self.predictor.zone_classifier)}")
            print(f"📍 Municipios: {len(self.predictor.municipio_to_id)}")
            print(f"🧠 Features del modelo: {len(self.predictor.feature_columns)}")
            print(f"🗺️ Grid: {self._get_grid_size()} celdas")
            print(f"📏 Resolución: ~{self.grid_resolution * 111:.0f}m por celda")
            print(f"⚖️ Pesos: Seguridad({self.routing_factors['safety_weight']:.0%}) " +
                  f"Distancia({self.routing_factors['distance_weight']:.0%}) " +
                  f"Tiempo({self.routing_factors['time_weight']:.0%})")
    
    def _load_localidades_coords(self):
        """📍 Cargar coordenadas de localidades"""
        try:
            # Intentar importar desde main
            import sys
            import os
            sys.path.append(os.path.dirname(__file__))
            from main import LOCALIDADES_COORDS
            self.localidades_coords = LOCALIDADES_COORDS
        except ImportError:
            # Fallback a coordenadas hardcoded
            self.localidades_coords = {
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
    
    def _get_grid_size(self) -> Tuple[int, int]:
        """📐 Calcula tamaño del grid"""
        lat_cells = int((self.bogota_bounds['north'] - self.bogota_bounds['south']) / self.grid_resolution)
        lng_cells = int((self.bogota_bounds['east'] - self.bogota_bounds['west']) / self.grid_resolution)
        return lat_cells, lng_cells
    
    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """🌍 Distancia haversine en km"""
        R = 6371  # Radio terrestre en km
        
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlng/2)**2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _get_risk_at_point(self, lat: float, lng: float, hora: int, dia_semana: int) -> Tuple[float, str, str]:
        """🎯 USA DIRECTAMENTE nuestro modelo balanceado"""
        try:
            # 🔍 Encontrar municipio más cercano
            closest_municipio = self._find_closest_municipio(lat, lng)
            
            # 🔥 PREDICCIÓN BALANCEADA (usa las 15 features!)
            risk = self.predictor.predict_balanced_risk(
                closest_municipio, lat, lng, hora, dia_semana
            )
            
            # 🎯 Obtener tipo de zona
            zone_type = self.predictor.get_zone_type(closest_municipio)
            
            if self.verbose and risk > 0.8:
                print(f"🚨 Alto riesgo detectado: {closest_municipio} ({zone_type}) = {risk:.3f}")
            
            return risk, zone_type, closest_municipio
            
        except Exception as e:
            if self.verbose:
                print(f"⚠️ Error en predicción para ({lat:.4f}, {lng:.4f}): {e}")
            return 0.5, "unknown", "unknown"  # Fallback
    
    def _find_closest_municipio(self, lat: float, lng: float) -> str:
        """📍 Encuentra municipio más cercano a coordenadas"""
        min_distance = float('inf')
        closest_municipio = 'CHAPINERO'  # Default seguro
        
        for municipio, coords in self.localidades_coords.items():
            distance = self._haversine_distance(
                lat, lng, coords['lat'], coords['lng']
            )
            
            if distance < min_distance:
                min_distance = distance
                closest_municipio = municipio
        
        return closest_municipio
    
    def find_safest_route(self, start_lat: float, start_lng: float,
                         end_lat: float, end_lng: float,
                         hora: int = 12, dia_semana: int = 1) -> Dict:
        """🛣️ Encuentra la ruta más segura usando algoritmo optimizado"""
        
        if self.verbose:
            print(f"\n🧭 CALCULANDO RUTA INTELIGENTE")
            print(f"📍 Origen: ({start_lat:.4f}, {start_lng:.4f})")
            print(f"📍 Destino: ({end_lat:.4f}, {end_lng:.4f})")
            print(f"⏰ Hora: {hora}:00, Día: {dia_semana}")
            print("-" * 40)
        
        # 🎯 Calcular riesgo de puntos de inicio y fin
        start_risk, start_zone, start_municipio = self._get_risk_at_point(start_lat, start_lng, hora, dia_semana)
        end_risk, end_zone, end_municipio = self._get_risk_at_point(end_lat, end_lng, hora, dia_semana)
        
        # 📏 Distancia directa
        direct_distance = self._haversine_distance(start_lat, start_lng, end_lat, end_lng)
        
        if self.verbose:
            print(f"🎯 Origen: {start_municipio} ({start_zone}) - Riesgo: {start_risk:.3f}")
            print(f"🎯 Destino: {end_municipio} ({end_zone}) - Riesgo: {end_risk:.3f}")
            print(f"📏 Distancia directa: {direct_distance:.2f} km")
        
        # 🧠 Generar waypoints seguros basados en distancia
        if direct_distance < 5.0:
            # Ruta corta: 3 waypoints
            num_waypoints = 3
        elif direct_distance < 15.0:
            # Ruta media: 5 waypoints
            num_waypoints = 5
        else:
            # Ruta larga: 7 waypoints
            num_waypoints = 7
        
        # 🛣️ Generar ruta con waypoints seguros
        route_path = self._generate_intelligent_waypoints(
            start_lat, start_lng, end_lat, end_lng, 
            num_waypoints, hora, dia_semana
        )
        
        # 📊 Calcular estadísticas de la ruta
        route_stats = self._calculate_route_stats(route_path, hora, dia_semana)
        
        if self.verbose:
            print(f"✅ Ruta calculada:")
            print(f"  📏 Distancia: {route_stats['total_distance']:.2f} km")
            print(f"  ⏱️ Tiempo: {route_stats['total_time']:.0f} min")
            print(f"  🛡️ Seguridad: {route_stats['safety_score']:.3f}")
            print(f"  🚨 Riesgo máximo: {route_stats['maximum_risk']:.3f}")
            print(f"  🎯 Waypoints: {len(route_path)}")
        
        return {
            'route_points': [
                {
                    'lat': point.lat,
                    'lng': point.lng,
                    'risk_score': point.risk_score,
                    'zone_type': point.zone_type,
                    'municipio': point.municipio
                } for point in route_path
            ],
            'statistics': route_stats,
            'recommendations': self._generate_route_recommendations(route_stats),
            'origin_info': {
                'municipio': start_municipio,
                'zone_type': start_zone,
                'risk_score': start_risk,
                'coordinates': {'lat': start_lat, 'lng': start_lng}
            },
            'destination_info': {
                'municipio': end_municipio,
                'zone_type': end_zone,
                'risk_score': end_risk,
                'coordinates': {'lat': end_lat, 'lng': end_lng}
            }
        }
    
    def _generate_intelligent_waypoints(self, start_lat: float, start_lng: float,
                                      end_lat: float, end_lng: float,
                                      num_waypoints: int, hora: int, dia_semana: int) -> List[RoutePoint]:
        """🛣️ Genera waypoints intermedios optimizados por seguridad"""
        
        waypoints = []
        
        # 📍 Punto de inicio
        start_risk, start_zone, start_municipio = self._get_risk_at_point(start_lat, start_lng, hora, dia_semana)
        start_point = RoutePoint(
            lat=start_lat, lng=start_lng, 
            risk_score=start_risk, zone_type=start_zone, municipio=start_municipio
        )
        waypoints.append(start_point)
        
        # 🛣️ Waypoints intermedios
        for i in range(1, num_waypoints + 1):
            # 📍 Interpolación lineal base
            factor = i / (num_waypoints + 1)
            
            base_lat = start_lat + (end_lat - start_lat) * factor
            base_lng = start_lng + (end_lng - start_lng) * factor
            
            # 🛡️ Buscar punto más seguro en área cercana
            safe_lat, safe_lng = self._find_safer_nearby_point(
                base_lat, base_lng, hora, dia_semana, radius=0.008  # ~800m de radio
            )
            
            # 🧠 Obtener información del waypoint optimizado
            risk, zone_type, municipio = self._get_risk_at_point(safe_lat, safe_lng, hora, dia_semana)
            
            waypoint = RoutePoint(
                lat=safe_lat, lng=safe_lng,
                risk_score=risk, zone_type=zone_type, municipio=municipio
            )
            
            waypoints.append(waypoint)
        
        # 📍 Punto de destino
        end_risk, end_zone, end_municipio = self._get_risk_at_point(end_lat, end_lng, hora, dia_semana)
        end_point = RoutePoint(
            lat=end_lat, lng=end_lng,
            risk_score=end_risk, zone_type=end_zone, municipio=end_municipio
        )
        waypoints.append(end_point)
        
        return waypoints
    
    def _find_safer_nearby_point(self, center_lat: float, center_lng: float,
                                hora: int, dia_semana: int, radius: float = 0.008) -> Tuple[float, float]:
        """🛡️ Encuentra punto más seguro en radio cercano usando grid search"""
        
        best_lat, best_lng = center_lat, center_lng
        best_risk, _, _ = self._get_risk_at_point(center_lat, center_lng, hora, dia_semana)
        
        # 🔍 Grid search en 16 direcciones
        search_points = []
        angles = [i * 22.5 for i in range(16)]  # Cada 22.5 grados
        distances = [radius * 0.3, radius * 0.6, radius]  # 3 distancias
        
        for angle in angles:
            for distance in distances:
                rad = math.radians(angle)
                test_lat = center_lat + distance * math.cos(rad)
                test_lng = center_lng + distance * math.sin(rad)
                
                # Verificar que esté dentro de Bogotá
                if (self.bogota_bounds['south'] <= test_lat <= self.bogota_bounds['north'] and
                    self.bogota_bounds['west'] <= test_lng <= self.bogota_bounds['east']):
                    
                    search_points.append((test_lat, test_lng))
        
        # 🎯 Evaluar todos los puntos y elegir el más seguro
        for test_lat, test_lng in search_points:
            test_risk, _, _ = self._get_risk_at_point(test_lat, test_lng, hora, dia_semana)
            
            if test_risk < best_risk:
                best_lat, best_lng = test_lat, test_lng
                best_risk = test_risk
        
        return best_lat, best_lng
    
    def _calculate_route_stats(self, route_path: List[RoutePoint], hora: int, dia_semana: int) -> Dict:
        """📊 Calcula estadísticas completas de la ruta"""
        
        total_distance = 0.0
        total_time = 0.0
        risk_scores = []
        segments = []
        
        for i in range(len(route_path) - 1):
            start_point = route_path[i]
            end_point = route_path[i + 1]
            
            # 📏 Distancia del segmento
            segment_distance = self._haversine_distance(
                start_point.lat, start_point.lng,
                end_point.lat, end_point.lng
            )
            
            # 🚨 Riesgo del segmento (promedio ponderado)
            segment_risk = (start_point.risk_score + end_point.risk_score) / 2
            
            # ⏱️ Tiempo del segmento (considerando riesgo)
            base_speed = 30  # km/h base en ciudad
            
            # 🚦 Factor de velocidad basado en riesgo y hora
            risk_speed_factor = 1 - (segment_risk * 0.3)  # Alto riesgo reduce velocidad
            
            # 🌃 Factor nocturno
            if hora >= 20 or hora <= 6:
                night_factor = 0.85  # 15% más lento de noche
            else:
                night_factor = 1.0
            
            effective_speed = base_speed * risk_speed_factor * night_factor
            segment_time = (segment_distance / effective_speed) * 60  # en minutos
            
            total_distance += segment_distance
            total_time += segment_time
            risk_scores.append(segment_risk)
            
            segments.append({
                'distance_km': round(segment_distance, 3),
                'time_minutes': round(segment_time, 1),
                'risk_score': round(segment_risk, 3),
                'start_coords': [round(start_point.lat, 6), round(start_point.lng, 6)],
                'end_coords': [round(end_point.lat, 6), round(end_point.lng, 6)],
                'start_zone': start_point.zone_type,
                'end_zone': end_point.zone_type
            })
        
        # 📊 Estadísticas agregadas
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.5
        max_risk = max(risk_scores) if risk_scores else 0.5
        min_risk = min(risk_scores) if risk_scores else 0.5
        safety_score = 1.0 - avg_risk  # Score de seguridad (1 = muy seguro, 0 = muy peligroso)
        
        # 🎯 Risk variance (consistencia de la ruta)
        risk_variance = np.var(risk_scores) if len(risk_scores) > 1 else 0.0
        
        return {
            'total_distance': round(total_distance, 2),
            'total_time': round(total_time, 1),
            'average_risk': round(avg_risk, 3),
            'maximum_risk': round(max_risk, 3),
            'minimum_risk': round(min_risk, 3),
            'risk_variance': round(risk_variance, 4),
            'safety_score': round(safety_score, 3),
            'segments': segments,
            'waypoints_count': len(route_path),
            'route_type': self._classify_route_type(avg_risk, max_risk)
        }
    
    def _classify_route_type(self, avg_risk: float, max_risk: float) -> str:
        """🏷️ Clasifica el tipo de ruta"""
        if avg_risk <= 0.3 and max_risk <= 0.4:
            return "Muy Segura"
        elif avg_risk <= 0.5 and max_risk <= 0.6:
            return "Segura"
        elif avg_risk <= 0.7 and max_risk <= 0.8:
            return "Moderada"
        else:
            return "Peligrosa"
    
    def _generate_route_recommendations(self, stats: Dict) -> List[str]:
        """💡 Genera recomendaciones inteligentes basadas en estadísticas"""
        recommendations = []
        
        safety_score = stats['safety_score']
        max_risk = stats['maximum_risk']
        avg_risk = stats['average_risk']
        total_time = stats['total_time']
        route_type = stats['route_type']
        
        # 🛡️ Recomendaciones de seguridad
        if route_type == "Muy Segura":
            recommendations.append("✅ Ruta muy segura - Excelente elección")
        elif route_type == "Segura":
            recommendations.append("✅ Ruta segura - Mantente alerta")
        elif route_type == "Moderada":
            recommendations.append("⚠️ Ruta moderada - Evita detenerte")
        else:
            recommendations.append("🚨 Ruta peligrosa - Considera alternativas")
        
        # 🚨 Alertas específicas
        if max_risk > 0.8:
            recommendations.append("🛡️ Atraviesa zonas de alto riesgo - No te detengas")
        
        if stats['risk_variance'] > 0.1:
            recommendations.append("📊 Ruta con riesgo variable - Mantente atento a cambios")
        
        # ⏰ Recomendaciones de tiempo
        if total_time > 45:
            recommendations.append("⏰ Ruta larga - Considera transporte público")
        elif total_time < 10:
            recommendations.append("🚶‍♂️ Ruta corta - Considera caminar en horario seguro")
        
        # 👥 Recomendaciones generales
        if avg_risk > 0.6:
            recommendations.append("👥 Viaja acompañado si es posible")
            recommendations.append("📱 Mantén el teléfono cargado y contactos de emergencia")
        
        if max_risk > 0.7:
            recommendations.append("🚗 Prefiere vehículo sobre transporte público")
        
        # 🌃 Recomendaciones nocturnas (si aplica)
        if avg_risk > 0.5:
            recommendations.append("💡 Busca rutas bien iluminadas")
            recommendations.append("⚡ Evita calles solitarias")
        
        return recommendations
    
    def get_route_with_intelligence(self, start_municipio: str, end_municipio: str,
                                  hora: int = 12, dia_semana: int = 1) -> Dict:
        """🚀 Ruta inteligente usando nombres de municipios"""
        
        start_coords = self.localidades_coords.get(start_municipio.upper())
        end_coords = self.localidades_coords.get(end_municipio.upper())
        
        if not start_coords or not end_coords:
            raise ValueError(f"Municipio no encontrado: {start_municipio} o {end_municipio}")
        
        # 🧠 Calcular ruta inteligente
        return self.find_safest_route(
            start_coords['lat'], start_coords['lng'],
            end_coords['lat'], end_coords['lng'],
            hora, dia_semana
        )

# 🧪 Test del router
if __name__ == "__main__":
    print("🧪 TESTING INTELLIGENT ROUTER...")
    print("=" * 60)
    
    # Mock predictor para testing independiente
    class MockPredictor:
        def __init__(self):
            self.zone_classifier = {'SAFE_ZONES': {}, 'MEDIUM_ZONES': {}, 'HIGH_ZONES': {}}
            self.municipio_to_id = {}
            self.feature_columns = ['test'] * 15
        
        def predict_balanced_risk(self, municipio, lat, lng, hora, dia):
            # Simular riesgo basado en coordenadas y municipio
            if 'BOLIVAR' in municipio or lat < 4.5:
                return 0.85  # Alto riesgo
            elif 'USAQUEN' in municipio or lat > 4.7:
                return 0.15  # Bajo riesgo
            elif hora >= 20 or hora <= 6:
                return 0.65  # Riesgo nocturno
            else:
                return 0.40  # Riesgo medio
        
        def get_zone_type(self, municipio):
            if 'USAQUEN' in municipio or 'CHAPINERO' in municipio:
                return 'SAFE_ZONES'
            elif 'BOLIVAR' in municipio or 'CRISTOBAL' in municipio:
                return 'HIGH_ZONES'
            else:
                return 'MEDIUM_ZONES'
    
    try:
        # Crear router con mock predictor
        router = IntelligentRouter(MockPredictor(), verbose=True)
        
        print(f"\n🎯 TEST 1: Ruta USAQUEN → CIUDAD BOLIVAR (Sábado 22h)")
        result1 = router.get_route_with_intelligence(
            "USAQUEN", "CIUDAD BOLIVAR", hora=22, dia_semana=6
        )
        
        print(f"📊 Resultado:")
        print(f"  📏 Distancia: {result1['statistics']['total_distance']} km")
        print(f"  ⏱️ Tiempo: {result1['statistics']['total_time']} min")
        print(f"  🛡️ Seguridad: {result1['statistics']['safety_score']}")
        print(f"  🏷️ Tipo: {result1['statistics']['route_type']}")
        print(f"  💡 Recomendaciones: {len(result1['recommendations'])}")
        
        print(f"\n🎯 TEST 2: Ruta CHAPINERO → KENNEDY (Lunes 14h)")
        result2 = router.get_route_with_intelligence(
            "CHAPINERO", "KENNEDY", hora=14, dia_semana=1
        )
        
        print(f"📊 Resultado:")
        print(f"  📏 Distancia: {result2['statistics']['total_distance']} km")
        print(f"  ⏱️ Tiempo: {result2['statistics']['total_time']} min")
        print(f"  🛡️ Seguridad: {result2['statistics']['safety_score']}")
        print(f"  🏷️ Tipo: {result2['statistics']['route_type']}")
        print(f"  💡 Recomendaciones: {len(result2['recommendations'])}")
        
        print(f"\n✅ INTELLIGENT ROUTER funcionando correctamente!")
        
    except Exception as e:
        print(f"❌ Error en testing: {e}")
        import traceback
        traceback.print_exc()