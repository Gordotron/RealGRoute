import pandas as pd
import numpy as np
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    precision_score, 
    recall_score, 
    f1_score,
    accuracy_score
)
import matplotlib.pyplot as plt
import seaborn as sns
import os
from typing import Dict, Any, Tuple

class ModelEvaluator:
    def __init__(self, feature_columns: list, id_to_municipio: dict):
        self.feature_columns = feature_columns
        self.id_to_municipio = id_to_municipio
        self.class_names = ['Bajo', 'Medio', 'Alto']
        
        # Crear directorio para reportes
        os.makedirs('reports', exist_ok=True)
    
    def comprehensive_evaluation(self, model, X_test, y_test, X_train=None, y_train=None) -> Dict[str, Any]:
        """🔍 Evaluación exhaustiva del modelo"""
        print("📊 Iniciando evaluación exhaustiva del modelo...")
        print("=" * 60)
        
        # Predicciones
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Resultados completos
        results = {}
        
        # 1. Métricas básicas
        results['basic_metrics'] = self._basic_metrics(y_test, y_pred)
        
        # 2. Métricas por clase
        results['class_metrics'] = self._class_metrics(y_test, y_pred)
        
        # 3. Matriz de confusión
        results['confusion_matrix'] = self._confusion_matrix_analysis(y_test, y_pred)
        
        # 4. Análisis de errores
        results['error_analysis'] = self._error_analysis(X_test, y_test, y_pred)
        
        # 5. Feature importance
        if hasattr(model, 'feature_importances_'):
            results['feature_importance'] = self._feature_importance_analysis(model)
        
        # 6. Análisis de confianza de predicciones
        results['confidence_analysis'] = self._confidence_analysis(y_pred_proba, y_test, y_pred)
        
        # 7. Métricas críticas de seguridad
        results['safety_metrics'] = self._safety_metrics(y_test, y_pred)
        
        # Generar reporte completo
        self._generate_report(results)
        
        print("✅ Evaluación completa finalizada!")
        print(f"📄 Reporte guardado en: reports/model_evaluation_report.txt")
        print(f"📊 Gráficos guardados en: reports/")
        
        return results
    
    def _basic_metrics(self, y_test, y_pred) -> Dict[str, float]:
        """📈 Métricas básicas del modelo"""
        print("📈 Calculando métricas básicas...")
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision_macro': precision_score(y_test, y_pred, average='macro', zero_division=0),
            'precision_weighted': precision_score(y_test, y_pred, average='weighted', zero_division=0),
            'recall_macro': recall_score(y_test, y_pred, average='macro', zero_division=0),
            'recall_weighted': recall_score(y_test, y_pred, average='weighted', zero_division=0),
            'f1_macro': f1_score(y_test, y_pred, average='macro', zero_division=0),
            'f1_weighted': f1_score(y_test, y_pred, average='weighted', zero_division=0)
        }
        
        print(f"  ✅ Accuracy: {metrics['accuracy']:.3f}")
        print(f"  ✅ Precision (weighted): {metrics['precision_weighted']:.3f}")
        print(f"  ✅ Recall (weighted): {metrics['recall_weighted']:.3f}")
        print(f"  ✅ F1-Score (weighted): {metrics['f1_weighted']:.3f}")
        
        return metrics
    
    def _class_metrics(self, y_test, y_pred) -> Dict[str, Dict[str, float]]:
        """📊 Métricas detalladas por cada clase"""
        print("\n📊 Analizando rendimiento por clase...")
        
        # Classification report como diccionario
        class_report = classification_report(y_test, y_pred, 
                                           target_names=self.class_names, 
                                           output_dict=True,
                                           zero_division=0)
        
        # Mostrar métricas por clase
        for i, class_name in enumerate(self.class_names):
            if str(i) in class_report:
                metrics = class_report[str(i)]
                print(f"  🎯 {class_name}:")
                print(f"    - Precision: {metrics['precision']:.3f}")
                print(f"    - Recall: {metrics['recall']:.3f}")
                print(f"    - F1-Score: {metrics['f1-score']:.3f}")
                print(f"    - Support: {int(metrics['support'])} muestras")
        
        return class_report
    
    def _confusion_matrix_analysis(self, y_test, y_pred) -> Dict[str, Any]:
        """🔍 Análisis detallado de la matriz de confusión"""
        print("\n🔍 Generando matriz de confusión...")
        
        cm = confusion_matrix(y_test, y_pred)
        
        # Crear visualización
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=self.class_names,
                   yticklabels=self.class_names,
                   annot_kws={'size': 14})
        plt.title('Matriz de Confusión - Safe Routes Model', fontsize=16, fontweight='bold')
        plt.ylabel('Clase Real', fontsize=12)
        plt.xlabel('Clase Predicha', fontsize=12)
        plt.tight_layout()
        plt.savefig('reports/confusion_matrix.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Análisis de errores críticos
        total_samples = cm.sum()
        
        # Errores críticos: predecir Bajo cuando es Alto
        critical_errors = cm[2, 0] if cm.shape[0] > 2 else 0
        
        # Errores moderados: confusiones entre clases adyacentes
        moderate_errors = 0
        if cm.shape[0] > 2:
            moderate_errors = cm[0, 1] + cm[1, 0] + cm[1, 2] + cm[2, 1]
        
        analysis = {
            'confusion_matrix': cm.tolist(),
            'total_samples': int(total_samples),
            'critical_errors': int(critical_errors),
            'critical_error_rate': float(critical_errors / total_samples) if total_samples > 0 else 0,
            'moderate_errors': int(moderate_errors),
            'moderate_error_rate': float(moderate_errors / total_samples) if total_samples > 0 else 0
        }
        
        print(f"  📊 Total muestras: {total_samples}")
        print(f"  🚨 Errores críticos (Alto→Bajo): {critical_errors} ({analysis['critical_error_rate']:.1%})")
        print(f"  ⚠️ Errores moderados: {moderate_errors} ({analysis['moderate_error_rate']:.1%})")
        
        return analysis
    
    def _error_analysis(self, X_test, y_test, y_pred) -> Dict[str, Any]:
        """🔍 Análisis detallado de errores"""
        print("\n🔍 Analizando patrones de errores...")
        
        # Identificar errores
        error_mask = y_test != y_pred
        error_indices = np.where(error_mask)[0]
        
        if len(error_indices) == 0:
            return {"total_errors": 0, "error_patterns": [], "error_rate": 0}
        
        # Crear DataFrame de errores
        errors_df = pd.DataFrame({
            'municipio_id': X_test.iloc[error_indices]['municipio_encoded'].values,
            'hora': X_test.iloc[error_indices]['hora'].values,
            'dia_semana': X_test.iloc[error_indices]['dia_semana'].values,
            'es_nocturno': X_test.iloc[error_indices]['es_nocturno'].values,
            'es_fin_semana': X_test.iloc[error_indices]['es_fin_semana'].values,
            'real': y_test.iloc[error_indices].values,
            'predicho': y_pred[error_indices]
        })
        
        # Mapear municipios
        errors_df['municipio'] = errors_df['municipio_id'].map(self.id_to_municipio)
        errors_df['municipio'] = errors_df['municipio'].fillna('Desconocido')
        
        # Análisis de patrones
        patterns = {}
        
        # Por municipio
        municipio_errors = errors_df.groupby('municipio').size().sort_values(ascending=False)
        patterns['municipios_problematicos'] = municipio_errors.head().to_dict()
        
        # Por hora
        hora_errors = errors_df.groupby('hora').size().sort_values(ascending=False)
        patterns['horas_problematicas'] = hora_errors.head().to_dict()
        
        # Errores críticos específicos
        critical_errors = errors_df[(errors_df['real'] == 2) & (errors_df['predicho'] == 0)]
        
        analysis = {
            'total_errors': len(error_indices),
            'error_rate': float(len(error_indices) / len(X_test)),
            'error_patterns': patterns,
            'critical_errors_detail': critical_errors[['municipio', 'hora', 'dia_semana']].to_dict('records') if len(critical_errors) > 0 else [],
            'errors_by_real_class': errors_df.groupby('real').size().to_dict(),
            'errors_by_predicted_class': errors_df.groupby('predicho').size().to_dict()
        }
        
        print(f"  📊 Total errores: {analysis['total_errors']} ({analysis['error_rate']:.1%})")
        if patterns['municipios_problematicos']:
            print(f"  🏢 Municipios problemáticos: {list(patterns['municipios_problematicos'].keys())[:3]}")
        if patterns['horas_problematicas']:
            print(f"  🕐 Horas problemáticas: {list(patterns['horas_problematicas'].keys())[:3]}")
        
        return analysis
    
    def _feature_importance_analysis(self, model) -> Dict[str, Any]:
        """📈 Análisis de importancia de características"""
        print("\n📈 Analizando importancia de características...")
        
        importance_df = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # Crear visualización
        plt.figure(figsize=(10, 6))
        sns.barplot(data=importance_df, x='importance', y='feature', palette='viridis')
        plt.title('Importancia de Características - Safe Routes Model', fontsize=14, fontweight='bold')
        plt.xlabel('Importancia', fontsize=12)
        plt.ylabel('Característica', fontsize=12)
        plt.tight_layout()
        plt.savefig('reports/feature_importance.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Mostrar top features
        print("  🏆 Top características más importantes:")
        for idx, row in importance_df.iterrows():
            print(f"    {row['feature']}: {row['importance']:.3f}")
        
        return {
            'feature_importance': importance_df.to_dict('records'),
            'top_feature': importance_df.iloc[0]['feature'],
            'top_importance': float(importance_df.iloc[0]['importance'])
        }
    
    def _confidence_analysis(self, y_pred_proba, y_test, y_pred) -> Dict[str, Any]:
        """🎯 Análisis de confianza de predicciones"""
        print("\n🎯 Analizando confianza de predicciones...")
        
        # Confianza máxima por predicción
        max_proba = np.max(y_pred_proba, axis=1)
        
        # Predicciones correctas vs incorrectas
        correct_mask = y_test.values == y_pred
        
        avg_confidence_correct = float(np.mean(max_proba[correct_mask])) if np.sum(correct_mask) > 0 else 0
        avg_confidence_incorrect = float(np.mean(max_proba[~correct_mask])) if np.sum(~correct_mask) > 0 else 0
        
        high_confidence_mask = max_proba > 0.8
        high_confidence_accuracy = float(np.mean(correct_mask[high_confidence_mask])) if np.sum(high_confidence_mask) > 0 else 0
        
        confidence_analysis = {
            'avg_confidence_correct': avg_confidence_correct,
            'avg_confidence_incorrect': avg_confidence_incorrect,
            'high_confidence_threshold': 0.8,
            'high_confidence_predictions': int(np.sum(high_confidence_mask)),
            'high_confidence_accuracy': high_confidence_accuracy
        }
        
        print(f"  ✅ Confianza promedio (correctas): {confidence_analysis['avg_confidence_correct']:.3f}")
        print(f"  ❌ Confianza promedio (incorrectas): {confidence_analysis['avg_confidence_incorrect']:.3f}")
        print(f"  🎯 Predicciones alta confianza (>0.8): {confidence_analysis['high_confidence_predictions']}")
        
        return confidence_analysis
    
    def _safety_metrics(self, y_test, y_pred) -> Dict[str, float]:
        """🛡️ Métricas críticas de seguridad"""
        print("\n🛡️ Calculando métricas de seguridad...")
        
        # Para seguridad, es MÁS IMPORTANTE detectar casos de Alto riesgo
        # False Negative en "Alto" es MUY PELIGROSO
        
        # Casos de cada clase
        alto_real = np.sum(y_test == 2)
        medio_real = np.sum(y_test == 1)
        bajo_real = np.sum(y_test == 0)
        
        # Métricas específicas para clase "Alto riesgo" (clase 2)
        if alto_real > 0:
            alto_pred_correct = np.sum((y_test == 2) & (y_pred == 2))
            alto_precision = alto_pred_correct / np.sum(y_pred == 2) if np.sum(y_pred == 2) > 0 else 0
            alto_recall = alto_pred_correct / alto_real
        else:
            alto_precision = 1.0
            alto_recall = 1.0
        
        # Casos críticos: predecir Bajo cuando es Alto
        critical_misses = np.sum((y_test == 2) & (y_pred == 0))
        
        safety_metrics = {
            'alto_precision': float(alto_precision),
            'alto_recall': float(alto_recall),
            'critical_miss_rate': float(critical_misses / alto_real) if alto_real > 0 else 0,
            'critical_misses': int(critical_misses),
            'total_alto_cases': int(alto_real),
            'safety_score': float(1 - (critical_misses / alto_real)) if alto_real > 0 else 1.0
        }
        
        print(f"  🎯 Precision Alto Riesgo: {safety_metrics['alto_precision']:.3f}")
        print(f"  🎯 Recall Alto Riesgo: {safety_metrics['alto_recall']:.3f}")
        print(f"  🚨 Errores críticos: {critical_misses}/{alto_real} ({safety_metrics['critical_miss_rate']:.1%})")
        print(f"  🛡️ Safety Score: {safety_metrics['safety_score']:.3f}")
        
        return safety_metrics
    
    def _generate_report(self, results: Dict[str, Any]) -> None:
        """📄 Genera reporte completo en texto"""
        report_path = 'reports/model_evaluation_report.txt'
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("🛡️ SAFE ROUTES - REPORTE DE EVALUACIÓN DEL MODELO\n")
            f.write("=" * 80 + "\n")
            f.write(f"Fecha: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Evaluado por: Gordotron\n\n")
            
            # Métricas básicas
            f.write("📈 MÉTRICAS GENERALES\n")
            f.write("-" * 40 + "\n")
            basic = results['basic_metrics']
            f.write(f"Accuracy: {basic['accuracy']:.3f}\n")
            f.write(f"Precision (weighted): {basic['precision_weighted']:.3f}\n")
            f.write(f"Recall (weighted): {basic['recall_weighted']:.3f}\n")
            f.write(f"F1-Score (weighted): {basic['f1_weighted']:.3f}\n\n")
            
            # Seguridad
            f.write("🛡️ MÉTRICAS DE SEGURIDAD\n")
            f.write("-" * 40 + "\n")
            safety = results['safety_metrics']
            f.write(f"Safety Score: {safety['safety_score']:.3f}\n")
            f.write(f"Precision Alto Riesgo: {safety['alto_precision']:.3f}\n")
            f.write(f"Recall Alto Riesgo: {safety['alto_recall']:.3f}\n")
            f.write(f"Errores Críticos: {safety['critical_misses']}/{safety['total_alto_cases']}\n")
            f.write(f"Tasa de Error Crítico: {safety['critical_miss_rate']:.1%}\n\n")
            
            # Feature importance
            if 'feature_importance' in results:
                f.write("📊 IMPORTANCIA DE CARACTERÍSTICAS\n")
                f.write("-" * 40 + "\n")
                for feat in results['feature_importance']['feature_importance']:
                    f.write(f"{feat['feature']}: {feat['importance']:.3f}\n")
                f.write("\n")
            
            # Análisis de errores
            f.write("🔍 ANÁLISIS DE ERRORES\n")
            f.write("-" * 40 + "\n")
            error_analysis = results['error_analysis']
            f.write(f"Total errores: {error_analysis['total_errors']}\n")
            f.write(f"Tasa de error: {error_analysis['error_rate']:.1%}\n")
            
            if 'error_patterns' in error_analysis and error_analysis['error_patterns']:
                if 'municipios_problematicos' in error_analysis['error_patterns']:
                    f.write("Municipios problemáticos:\n")
                    for muni, count in list(error_analysis['error_patterns']['municipios_problematicos'].items())[:5]:
                        f.write(f"  - {muni}: {count} errores\n")
                        
                if 'horas_problematicas' in error_analysis['error_patterns']:
                    f.write("Horas problemáticas:\n")
                    for hora, count in list(error_analysis['error_patterns']['horas_problematicas'].items())[:5]:
                        f.write(f"  - {hora}:00h: {count} errores\n")
            
            # Conclusiones
            f.write("\n🎯 CONCLUSIONES\n")
            f.write("-" * 40 + "\n")
            f.write(f"El modelo alcanza un accuracy de {basic['accuracy']:.1%} con un safety score de {safety['safety_score']:.1%}.\n")
            
            if safety['critical_miss_rate'] < 0.05:
                f.write("✅ Excelente detección de casos de alto riesgo (< 5% errores críticos).\n")
            elif safety['critical_miss_rate'] < 0.10:
                f.write("⚠️ Buena detección de alto riesgo, pero mejorable (< 10% errores críticos).\n")
            else:
                f.write("🚨 Requiere mejoras en detección de casos de alto riesgo (> 10% errores críticos).\n")
                
            if 'feature_importance' in results:
                top_feature = results['feature_importance']['top_feature']
                f.write(f"La característica más importante es: {top_feature}\n")

# Test independiente
if __name__ == "__main__":
    print("🧪 Test de ModelEvaluator...")
    
    # Datos de prueba
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    
    # Crear datos sintéticos
    np.random.seed(42)
    X = pd.DataFrame({
        'hora': np.random.randint(0, 24, 100),
        'dia_semana': np.random.randint(0, 7, 100),
        'municipio_encoded': np.random.randint(0, 5, 100),
        'es_nocturno': np.random.randint(0, 2, 100),
        'es_fin_semana': np.random.randint(0, 2, 100),
        'mes': np.random.randint(1, 13, 100)
    })
    y = pd.Series(np.random.randint(0, 3, 100))
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    
    # Entrenar modelo
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluar
    feature_columns = ['hora', 'dia_semana', 'municipio_encoded', 'es_nocturno', 'es_fin_semana', 'mes']
    id_to_municipio = {0: 'CHAPINERO', 1: 'USAQUEN', 2: 'KENNEDY', 3: 'SUBA', 4: 'CIUDAD BOLIVAR'}
    
    evaluator = ModelEvaluator(feature_columns, id_to_municipio)
    results = evaluator.comprehensive_evaluation(model, X_test, y_test, X_train, y_train)
    
    print("✅ Test completado!")