---
layout: post
title: "MLOps: Machine Learning Deployment Strategies"
date: 2024-04-15
tags: [mlops, machine-learning, deployment, model-serving, kubernetes, docker]
---

# MLOps: Machine Learning Deployment Strategies

Moving machine learning models from development to production is one of the biggest challenges in ML projects. MLOps bridges this gap by applying DevOps principles to machine learning workflows, ensuring reliable, scalable, and maintainable ML systems.

## The MLOps Challenge

Traditional software deployment differs significantly from ML model deployment:

- **Data Dependencies**: Models depend on specific data distributions
- **Model Drift**: Performance degrades over time as data changes
- **Experimentation**: Constant need for A/B testing and model comparison
- **Reproducibility**: Complex dependencies and environment requirements
- **Monitoring**: Need to track both technical and business metrics

## MLOps Architecture Overview

### Core Components
1. **Model Training Pipeline**: Automated training and validation
2. **Model Registry**: Centralized model versioning and metadata
3. **Deployment Pipeline**: Automated model deployment
4. **Monitoring System**: Performance and drift detection
5. **Feature Store**: Centralized feature management

## Model Packaging and Containerization

### Docker-based Model Serving
```dockerfile
# Dockerfile for ML model serving
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model artifacts and application code
COPY model/ ./model/
COPY src/ ./src/
COPY app.py .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### FastAPI Model Serving Application
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ML Model API", version="1.0.0")

# Load model at startup
model = None
feature_columns = None

@app.on_event("startup")
async def load_model():
    global model, feature_columns
    try:
        model = joblib.load("model/model.pkl")
        feature_columns = joblib.load("model/feature_columns.pkl")
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

class PredictionRequest(BaseModel):
    features: Dict[str, Any]
    model_version: str = "v1.0"

class PredictionResponse(BaseModel):
    prediction: float
    probability: List[float] = None
    model_version: str
    timestamp: str

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        # Validate input features
        if not all(col in request.features for col in feature_columns):
            missing_cols = set(feature_columns) - set(request.features.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Missing features: {missing_cols}"
            )
        
        # Prepare input data
        input_data = pd.DataFrame([request.features])[feature_columns]
        
        # Make prediction
        prediction = model.predict(input_data)[0]
        
        # Get prediction probabilities if available
        probabilities = None
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(input_data)[0].tolist()
        
        # Log prediction for monitoring
        logger.info(f"Prediction made: {prediction}")
        
        return PredictionResponse(
            prediction=float(prediction),
            probability=probabilities,
            model_version=request.model_version,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.get("/model/info")
async def model_info():
    return {
        "model_type": type(model).__name__,
        "feature_count": len(feature_columns),
        "features": feature_columns
    }
```

## Kubernetes Deployment

### Model Deployment Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-model-deployment
  labels:
    app: ml-model
    version: v1.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-model
  template:
    metadata:
      labels:
        app: ml-model
        version: v1.0
    spec:
      containers:
      - name: ml-model
        image: your-registry/ml-model:v1.0
        ports:
        - containerPort: 8000
        env:
        - name: MODEL_VERSION
          value: "v1.0"
        - name: LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ml-model-service
spec:
  selector:
    app: ml-model
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

## CI/CD Pipeline for ML Models

### GitHub Actions Workflow
```yaml
name: ML Model CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/ml-model

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        pytest tests/ --cov=src/ --cov-report=xml
    
    - name: Model validation
      run: |
        python scripts/validate_model.py
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    
    - name: Deploy to staging
      run: |
        # Update Kubernetes deployment
        kubectl set image deployment/ml-model-deployment \
          ml-model=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

## Model Monitoring and Observability

### Prometheus Metrics
```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time

# Define metrics
prediction_requests = Counter('ml_prediction_requests_total', 'Total prediction requests')
prediction_latency = Histogram('ml_prediction_duration_seconds', 'Prediction latency')
model_accuracy = Gauge('ml_model_accuracy', 'Current model accuracy')
data_drift_score = Gauge('ml_data_drift_score', 'Data drift detection score')

class ModelMonitor:
    def __init__(self):
        self.prediction_count = 0
        self.accuracy_window = []
        
    def record_prediction(self, prediction_time, actual_value=None, predicted_value=None):
        # Record metrics
        prediction_requests.inc()
        prediction_latency.observe(prediction_time)
        
        # Track accuracy if ground truth is available
        if actual_value is not None and predicted_value is not None:
            is_correct = abs(actual_value - predicted_value) < 0.1  # Threshold for regression
            self.accuracy_window.append(is_correct)
            
            # Keep only recent predictions for accuracy calculation
            if len(self.accuracy_window) > 1000:
                self.accuracy_window = self.accuracy_window[-1000:]
            
            # Update accuracy metric
            current_accuracy = sum(self.accuracy_window) / len(self.accuracy_window)
            model_accuracy.set(current_accuracy)
    
    def detect_data_drift(self, current_features, reference_features):
        """Simple data drift detection using statistical tests."""
        from scipy import stats
        
        drift_scores = []
        
        for feature in current_features.columns:
            if feature in reference_features.columns:
                # Kolmogorov-Smirnov test
                statistic, p_value = stats.ks_2samp(
                    current_features[feature].dropna(),
                    reference_features[feature].dropna()
                )
                drift_scores.append(statistic)
        
        avg_drift_score = sum(drift_scores) / len(drift_scores) if drift_scores else 0
        data_drift_score.set(avg_drift_score)
        
        return avg_drift_score

# Add to FastAPI app
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Model Performance Tracking
```python
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

class ModelTracker:
    def __init__(self, experiment_name="production_model"):
        mlflow.set_experiment(experiment_name)
        self.client = MlflowClient()
        self.run_id = None
    
    def start_run(self, model_version):
        self.run = mlflow.start_run(
            tags={"model_version": model_version, "environment": "production"}
        )
        self.run_id = self.run.info.run_id
    
    def log_prediction_metrics(self, predictions, actuals):
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
        
        mse = mean_squared_error(actuals, predictions)
        mae = mean_absolute_error(actuals, predictions)
        r2 = r2_score(actuals, predictions)
        
        mlflow.log_metrics({
            "mse": mse,
            "mae": mae,
            "r2_score": r2,
            "prediction_count": len(predictions)
        })
    
    def log_data_drift(self, drift_score):
        mlflow.log_metric("data_drift_score", drift_score)
        
        if drift_score > 0.1:  # Threshold for significant drift
            mlflow.log_param("drift_alert", True)
    
    def end_run(self):
        if self.run_id:
            mlflow.end_run()
```

## A/B Testing for Models

### Model Comparison Framework
```python
import random
from typing import Dict, Any

class ModelABTester:
    def __init__(self, models: Dict[str, Any], traffic_split: Dict[str, float]):
        self.models = models
        self.traffic_split = traffic_split
        self.results = {model_name: [] for model_name in models.keys()}
    
    def get_model_for_request(self, user_id: str = None) -> str:
        """Determine which model to use for this request."""
        if user_id:
            # Consistent assignment based on user ID
            random.seed(hash(user_id))
        
        rand_val = random.random()
        cumulative_prob = 0
        
        for model_name, prob in self.traffic_split.items():
            cumulative_prob += prob
            if rand_val <= cumulative_prob:
                return model_name
        
        # Fallback to first model
        return list(self.models.keys())[0]
    
    def make_prediction(self, features: Dict[str, Any], user_id: str = None):
        model_name = self.get_model_for_request(user_id)
        model = self.models[model_name]
        
        start_time = time.time()
        prediction = model.predict([list(features.values())])[0]
        prediction_time = time.time() - start_time
        
        # Log for analysis
        self.results[model_name].append({
            'prediction': prediction,
            'features': features,
            'prediction_time': prediction_time,
            'timestamp': datetime.now()
        })
        
        return {
            'prediction': prediction,
            'model_used': model_name,
            'prediction_time': prediction_time
        }
    
    def analyze_results(self):
        """Analyze A/B test results."""
        analysis = {}
        
        for model_name, results in self.results.items():
            if results:
                predictions = [r['prediction'] for r in results]
                times = [r['prediction_time'] for r in results]
                
                analysis[model_name] = {
                    'count': len(results),
                    'avg_prediction': sum(predictions) / len(predictions),
                    'avg_latency': sum(times) / len(times),
                    'p95_latency': sorted(times)[int(0.95 * len(times))]
                }
        
        return analysis

# Usage in FastAPI
ab_tester = ModelABTester(
    models={'model_v1': model_v1, 'model_v2': model_v2},
    traffic_split={'model_v1': 0.8, 'model_v2': 0.2}
)

@app.post("/predict_ab")
async def predict_with_ab_test(request: PredictionRequest, user_id: str = None):
    result = ab_tester.make_prediction(request.features, user_id)
    return result
```

## Model Rollback Strategy

### Blue-Green Deployment
```python
class ModelDeploymentManager:
    def __init__(self):
        self.active_model = "blue"
        self.models = {
            "blue": None,
            "green": None
        }
        self.health_checks = {
            "blue": True,
            "green": True
        }
    
    def deploy_new_model(self, new_model, validation_data):
        # Deploy to inactive environment
        inactive_env = "green" if self.active_model == "blue" else "blue"
        self.models[inactive_env] = new_model
        
        # Run validation tests
        if self.validate_model(new_model, validation_data):
            # Switch traffic to new model
            self.active_model = inactive_env
            logger.info(f"Successfully switched to {inactive_env} environment")
            return True
        else:
            # Rollback - keep current model active
            logger.error(f"Validation failed for {inactive_env}, keeping {self.active_model}")
            return False
    
    def validate_model(self, model, validation_data):
        try:
            # Run validation tests
            predictions = model.predict(validation_data['features'])
            accuracy = calculate_accuracy(predictions, validation_data['targets'])
            
            # Check if accuracy meets threshold
            return accuracy > 0.85
        except Exception as e:
            logger.error(f"Model validation failed: {e}")
            return False
    
    def get_active_model(self):
        return self.models[self.active_model]
    
    def rollback(self):
        # Switch back to previous environment
        self.active_model = "green" if self.active_model == "blue" else "blue"
        logger.info(f"Rolled back to {self.active_model} environment")
```

## Best Practices

### 1. Model Versioning
- Use semantic versioning for models
- Track model lineage and dependencies
- Maintain model metadata and documentation

### 2. Automated Testing
```python
# Model validation tests
def test_model_performance(model, test_data):
    predictions = model.predict(test_data['features'])
    accuracy = calculate_accuracy(predictions, test_data['targets'])
    assert accuracy > 0.8, f"Model accuracy {accuracy} below threshold"

def test_model_latency(model, sample_data):
    start_time = time.time()
    model.predict(sample_data)
    latency = time.time() - start_time
    assert latency < 0.1, f"Model latency {latency}s exceeds threshold"

def test_model_memory_usage(model):
    import psutil
    process = psutil.Process()
    memory_before = process.memory_info().rss
    
    # Make predictions
    model.predict(sample_data)
    
    memory_after = process.memory_info().rss
    memory_increase = (memory_after - memory_before) / 1024 / 1024  # MB
    
    assert memory_increase < 100, f"Memory increase {memory_increase}MB too high"
```

### 3. Monitoring and Alerting
- Set up alerts for model performance degradation
- Monitor data drift and feature importance changes
- Track business metrics alongside technical metrics

### 4. Security Considerations
- Implement authentication and authorization
- Encrypt model artifacts and communications
- Regular security audits and vulnerability assessments

## Next Steps

In upcoming posts, I'll explore:
- Advanced model monitoring techniques
- Feature stores and feature engineering pipelines
- Multi-model serving and ensemble strategies
- MLOps for deep learning and large language models

MLOps is essential for scaling machine learning in production environments. By implementing proper deployment strategies, monitoring, and governance, organizations can reliably deliver ML-powered applications.

---

*Implementing MLOps in your organization? Share your challenges and successes!*