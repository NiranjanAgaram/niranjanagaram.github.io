---
layout: post
title: "From Data Engineer to ML Engineer: My Learning Path"
date: 2023-01-15
tags: [machine-learning, mlops, career-transition, tensorflow, model-deployment]
excerpt: "After 3 years of data engineering, I'm making the jump to ML engineering. Here's what I'm learning and why it's harder than I expected."
author: "Niranjan Agaram"
---

# From Data Engineer to ML Engineer: My Learning Path

Three years ago, I was a SAS analyst. Two years ago, I became a data engineer. Now I'm trying to become an ML engineer. Apparently, I like making my life complicated.

The push came from our hospital's new initiative to "leverage AI for better patient outcomes." Translation: they want predictive models, and I'm the closest thing they have to a machine learning person.

## Why the Transition?

**The honest reason**: Job security. Every job posting mentions ML/AI now, and I don't want to be left behind.

**The professional reason**: After building data pipelines for 2 years, I want to see what happens to the data after it's cleaned and stored. Plus, the problems are more interesting.

**The practical reason**: Our hospital hired a "Chief AI Officer" who keeps asking for "predictive analytics." Someone needs to build these models.

## What I Thought I Knew

Coming from data engineering, I figured I had some advantages:
- ✅ I understand data (quality, pipelines, storage)
- ✅ I can code in Python
- ✅ I know SQL and databases
- ✅ I've worked with large datasets

What I didn't realize is how much I didn't know about the actual "learning" part of machine learning.

## My Learning Plan (Overly Ambitious, As Always)

**Month 1-2**: ML Fundamentals
- Andrew Ng's Coursera course
- "Hands-On Machine Learning" book
- Basic scikit-learn

**Month 3-4**: Deep Learning
- TensorFlow tutorials
- Build a few toy projects
- Understand neural networks

**Month 5-6**: MLOps and Production
- Model deployment
- Monitoring and maintenance
- Integration with existing systems

Spoiler alert: I'm still working on Month 1 stuff.

## The Reality Check

### Week 1: Math is Hard

My first attempt at understanding linear regression:

```python
from sklearn.linear_model import LinearRegression

# This works, but I have no idea why
model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
```

The model worked, but when someone asked me to explain the coefficients, I realized I didn't actually understand what was happening. Back to Khan Academy for linear algebra review.

### Week 2: Feature Engineering is an Art

Coming from data engineering, I thought feature engineering would be easy. "I clean data all the time!"

Wrong. Cleaning data for storage is different from preparing data for learning:

```python
# Data engineering mindset: make it clean
df['age'] = df['age'].fillna(df['age'].median())

# ML engineering mindset: make it predictive
# Maybe missing age is actually informative?
df['age_missing'] = df['age'].isnull()
df['age_filled'] = df['age'].fillna(df['age'].median())
```

I spent 2 weeks on a patient readmission model before realizing I was leaking future information into my features. Oops.

### Week 3: Evaluation Metrics Matter

My first model had 95% accuracy! I was so proud.

Then my colleague pointed out that only 5% of patients get readmitted, so a model that always predicts "no readmission" would also be 95% accurate.

Enter precision, recall, F1-score, AUC-ROC, and a dozen other metrics I'd never heard of:

```python
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

# Accuracy is not enough
print(f"Accuracy: {accuracy_score(y_test, predictions)}")
print(f"ROC-AUC: {roc_auc_score(y_test, predictions)}")
print("\nClassification Report:")
print(classification_report(y_test, predictions))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, predictions))
```

My "amazing" model had a precision of 0.12 for the positive class. Not so amazing anymore.

## My First Real Project: Predicting Patient Length of Stay

After a month of tutorials, I tackled a real problem: predicting how long patients would stay in the hospital.

### The Data

- **Patient demographics**: Age, gender, insurance type
- **Admission details**: Department, diagnosis codes, severity scores
- **Historical data**: Previous visits, chronic conditions
- **Target**: Length of stay (in days)

### Attempt 1: Throw Everything at a Random Forest

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Load data (my data engineering skills helped here)
df = load_and_clean_patient_data()

# Prepare features (badly)
features = ['age', 'gender', 'department', 'diagnosis_primary', 
           'insurance_type', 'admission_type']

X = pd.get_dummies(df[features])
y = df['length_of_stay']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model
model = RandomForestRegressor(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
mse = mean_squared_error(y_test, predictions)
print(f"MSE: {mse}")
```

**Result**: MSE of 12.3 days. Not great when average stay is 4.2 days.

### Attempt 2: Better Feature Engineering

I realized I was ignoring a lot of useful information:

```python
# Better features
def engineer_features(df):
    # Age groups instead of raw age
    df['age_group'] = pd.cut(df['age'], bins=[0, 18, 35, 50, 65, 100], 
                            labels=['child', 'young', 'adult', 'middle', 'senior'])
    
    # Historical patterns
    df['previous_visits'] = df.groupby('patient_id')['patient_id'].transform('count') - 1
    df['avg_previous_los'] = df.groupby('patient_id')['length_of_stay'].transform('mean')
    
    # Diagnosis complexity (number of diagnosis codes)
    df['diagnosis_count'] = df['diagnosis_codes'].str.count(',') + 1
    
    # Day of week and month (seasonal patterns)
    df['admit_day_of_week'] = pd.to_datetime(df['admit_date']).dt.dayofweek
    df['admit_month'] = pd.to_datetime(df['admit_date']).dt.month
    
    return df

df_engineered = engineer_features(df)
```

**Result**: MSE improved to 8.7 days. Better, but still not great.

### Attempt 3: Trying Different Algorithms

```python
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.svm import SVR

models = {
    'Random Forest': RandomForestRegressor(n_estimators=100),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=100),
    'Ridge Regression': Ridge(alpha=1.0),
    'SVR': SVR(kernel='rbf')
}

results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    results[name] = mse
    print(f"{name}: MSE = {mse:.2f}")
```

**Results**:
- Random Forest: 8.7
- Gradient Boosting: 7.9
- Ridge Regression: 9.2
- SVR: 11.4

Gradient Boosting won, but I still wasn't happy with the performance.

## The Breakthrough: Domain Knowledge

The real improvement came when I started talking to doctors and nurses. They told me things like:
- "Emergency admissions usually stay longer"
- "Patients with multiple chronic conditions are unpredictable"
- "Surgery patients have more predictable stays"

This led to better features:

```python
def add_domain_features(df):
    # Emergency vs planned admissions
    df['is_emergency'] = df['admission_type'] == 'Emergency'
    
    # Chronic condition count
    chronic_conditions = ['diabetes', 'hypertension', 'heart_disease', 'copd']
    df['chronic_count'] = df[chronic_conditions].sum(axis=1)
    
    # Surgery indicator
    df['has_surgery'] = df['procedure_codes'].str.contains('surgery', na=False)
    
    # Weekend admission (different staffing)
    df['weekend_admission'] = df['admit_day_of_week'].isin([5, 6])
    
    return df
```

**Final Result**: MSE of 5.2 days. Much better!

## What I Learned About ML Engineering vs Data Engineering

### 1. Different Success Metrics

**Data Engineering**: Did the pipeline run? Is the data accurate?
**ML Engineering**: Does the model generalize? Is it better than the baseline?

### 2. Experimentation is Key

In data engineering, you build something that works and move on. In ML, you build something that works, then try 10 other approaches to see if they work better.

### 3. Domain Knowledge is Crucial

The best features came from talking to domain experts, not from automated feature selection.

### 4. Models Degrade Over Time

Unlike data pipelines that run the same way forever, ML models get worse as the world changes. You need monitoring and retraining.

## The Deployment Challenge

Building a model is one thing. Getting it into production is another:

```python
# This works in Jupyter
model = joblib.load('length_of_stay_model.pkl')
prediction = model.predict(patient_features)

# This needs to work in production
class LengthOfStayPredictor:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)
        self.feature_columns = [...] # Need to track this
    
    def predict(self, patient_data):
        # Handle missing features
        # Apply same transformations as training
        # Return prediction with confidence
        pass
```

I'm still figuring this part out.

## Current Status

After 6 months, I can:
- ✅ Build basic ML models
- ✅ Evaluate them properly
- ✅ Do feature engineering
- ✅ Understand when models are overfitting
- ❌ Deploy models reliably
- ❌ Monitor model performance in production
- ❌ Handle model versioning and rollbacks

## What's Next

My 2023 goals:
1. **Learn MLOps properly**: MLflow, model registries, A/B testing
2. **Deep learning**: TensorFlow for more complex problems
3. **Production deployment**: Get at least one model running in production
4. **Model monitoring**: Understand drift detection and retraining

## For Other Data Engineers Considering the Switch

**The good news**: Your data skills transfer well. You understand data quality, pipelines, and scale.

**The challenging news**: The modeling part is genuinely different. It requires experimentation, domain knowledge, and a different way of thinking about success.

**My advice**:
- Start with simple problems and real data
- Talk to domain experts early and often
- Focus on the fundamentals before jumping to deep learning
- Expect to spend more time on evaluation than you think

The transition is harder than I expected, but also more interesting. Instead of just moving data around, I'm trying to extract insights from it. That feels like progress.

---

*Next post: I'm going to attempt to deploy my length-of-stay model using MLflow and Docker. Based on my track record, this should be... educational.*