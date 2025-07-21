import unittest
from intelligent_routing import IntelligentRouter, RoutePoint
import math

class MockPredictor:
    def __init__(self):
        self.zone_classifier = {'SAFE_ZONES': {}, 'MEDIUM_ZONES': {}, 'HIGH_ZONES': {}}
        self.municipio_to_id = {'USAQUEN': 0, 'CIUDAD BOLIVAR': 1, 'CHAPINERO': 2, 'KENNEDY': 3}
        self.feature_columns = ['test'] * 15

    def predict_balanced_risk(self, municipio, lat, lng, hora, dia):
        # Riesgo bajo para USAQUEN, alto para CIUDAD BOLIVAR, medio para otros
        if 'BOLIVAR' in municipio or lat < 4.5:
            return 0.85
        elif 'USAQUEN' in municipio or lat > 4.7:
            return 0.15
        elif hora >= 20 or hora <= 6:
            return 0.65
        else:
            return 0.40

    def get_zone_type(self, municipio):
        if 'USAQUEN' in municipio or 'CHAPINERO' in municipio:
            return 'SAFE_ZONES'
        elif 'BOLIVAR' in municipio or 'CRISTOBAL' in municipio:
            return 'HIGH_ZONES'
        else:
            return 'MEDIUM_ZONES'

class TestIntelligentRouter(unittest.TestCase):
    def setUp(self):
    # Monkeypatch para evitar el import problemático
        def fake_load_localidades_coords(self):
            self.localidades_coords = {
                'USAQUEN': {'lat': 4.7030, 'lng': -74.0350},
                'CHAPINERO': {'lat': 4.6590, 'lng': -74.0630},
                'CIUDAD BOLIVAR': {'lat': 4.4940, 'lng': -74.1430},
                'KENNEDY': {'lat': 4.6280, 'lng': -74.1460},
                # ... el resto ...
            }
        from intelligent_routing import IntelligentRouter
        IntelligentRouter._load_localidades_coords = fake_load_localidades_coords

        self.router = IntelligentRouter(MockPredictor(), verbose=False)

    def test_basic_routing_security(self):
        """Test básico: ruta de USAQUEN a CIUDAD BOLIVAR priorizando seguridad"""
        self.router.routing_factors['safety_weight'] = 0.8
        self.router.routing_factors['distance_weight'] = 0.2
        route = self.router.find_safest_route(4.7030, -74.0350, 4.4940, -74.1430, hora=14, dia_semana=2)
        self.assertIn('route_points', route)
        self.assertGreater(len(route['route_points']), 2)
        stats = route['statistics']
        self.assertLess(stats['average_risk'], 0.7)  # Debería evitar el máximo riesgo

    def test_basic_routing_time_priority(self):
        """Test: ruta de USAQUEN a CIUDAD BOLIVAR priorizando tiempo/distancia"""
        self.router.routing_factors['safety_weight'] = 0.2
        self.router.routing_factors['distance_weight'] = 0.8
        route = self.router.find_safest_route(4.7030, -74.0350, 4.4940, -74.1430, hora=14, dia_semana=2)
        stats = route['statistics']
        # El riesgo puede ser mayor cuando priorizamos distancia
        self.assertGreaterEqual(stats['average_risk'], 0.4)

    def test_get_route_with_intelligence(self):
        """Test con nombres de municipios"""
        route = self.router.get_route_with_intelligence("USAQUEN", "CIUDAD BOLIVAR", hora=12, dia_semana=1)
        self.assertIn('route_points', route)
        self.assertIn('statistics', route)

    def test_recommendations(self):
        """Test de recomendaciones según el riesgo"""
        # Forzar riesgo alto
        points = [
            RoutePoint(lat=4.7, lng=-74.03, risk_score=0.8),
            RoutePoint(lat=4.6, lng=-74.1, risk_score=0.9),
        ]
        stats = self.router._calculate_route_stats(points, hora=23, dia_semana=6)
        recommendations = self.router._generate_route_recommendations(stats)
        self.assertTrue(any("peligrosa" in r.lower() for r in recommendations))

    def test_scoring_variation(self):
        """Test que la función de scoring varía con los pesos"""
        # Misma ubicación, distintos pesos
        lat, lng = 4.6, -74.1
        score_sec = self.router._scoring(lat, lng, 14, 2, lat, lng)
        self.router.routing_factors['safety_weight'] = 0.1
        self.router.routing_factors['distance_weight'] = 0.9
        score_dist = self.router._scoring(lat, lng, 14, 2, lat, lng+0.05)
        self.assertNotEqual(score_sec, score_dist)

if __name__ == "__main__":
    unittest.main()