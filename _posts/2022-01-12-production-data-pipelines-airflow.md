---
layout: post
title: "Building Production Data Pipelines with Apache Airflow"
date: 2022-01-12
tags: [airflow, data-engineering, etl, production, workflow-orchestration]
excerpt: "After a year of cron jobs and manual scripts, I finally implemented Apache Airflow. Here's what I learned about workflow orchestration in production."
author: "Niranjan Agaram"
---

# Building Production Data Pipelines with Apache Airflow

My data pipelines were getting out of hand. What started as a simple Python script had grown into 15+ different scripts running on various schedules, with dependencies I tracked in a spreadsheet. When our CFO asked for a "simple" monthly report that required data from 8 different sources, I knew it was time for proper workflow orchestration.

Enter Apache Airflow.

## The Problem with My Current Setup

By late 2021, my data infrastructure looked like this:
- **12 Python scripts** running via cron
- **Dependencies managed manually** (run script A, wait, then run script B)
- **No visibility** into what was running or failing
- **Error handling** via email alerts (when I remembered to add them)
- **Retry logic** was "run it again tomorrow"

When the monthly financial report failed because the billing data wasn't ready yet, and I had to manually restart 6 downstream jobs, I finally admitted I needed help.

## Why Airflow?

I looked at several options:
- **Luigi**: Seemed dead (last update was months ago)
- **Prefect**: Looked promising but was still pretty new
- **Airflow**: Mature, lots of community support, used by big companies

Airflow won mostly because of the community and documentation. Plus, it was free.

## Installation and Setup (The Easy Part)

Setting up Airflow locally was surprisingly straightforward:

```bash
# Install Airflow
pip install apache-airflow

# Initialize database
airflow db init

# Create admin user
airflow users create \
    --username admin \
    --firstname Niranjan \
    --lastname Agaram \
    --role Admin \
    --email niranjan@company.com
```

The web UI looked professional, and I was feeling confident. That lasted about 2 hours.

## My First DAG (Disaster)

Here's my first attempt at converting my patient data pipeline:

```python
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from datetime import datetime, timedelta

def extract_patient_data():
    # My existing extraction code
    import pandas as pd
    df = pd.read_csv('/data/patients.csv')
    df.to_pickle('/tmp/patients.pkl')

def transform_patient_data():
    # My existing transformation code
    import pandas as pd
    df = pd.read_pickle('/tmp/patients.pkl')
    # ... transformation logic ...
    df.to_pickle('/tmp/patients_clean.pkl')

def load_patient_data():
    # My existing loading code
    import pandas as pd
    from sqlalchemy import create_engine
    df = pd.read_pickle('/tmp/patients_clean.pkl')
    engine = create_engine('postgresql://...')
    df.to_sql('patients', engine, if_exists='replace')

default_args = {
    'owner': 'niranjan',
    'depends_on_past': False,
    'start_date': datetime(2022, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'patient_data_pipeline',
    default_args=default_args,
    description='Daily patient data processing',
    schedule_interval='0 6 * * *',  # 6 AM daily
    catchup=False
)

extract_task = PythonOperator(
    task_id='extract_patient_data',
    python_callable=extract_patient_data,
    dag=dag
)

transform_task = PythonOperator(
    task_id='transform_patient_data',
    python_callable=transform_patient_data,
    dag=dag
)

load_task = PythonOperator(
    task_id='load_patient_data',
    python_callable=load_patient_data,
    dag=dag
)

extract_task >> transform_task >> load_task
```

This looked clean and worked... once. Then it failed spectacularly in production.

## The Problems I Discovered

### 1. Task Isolation Issues

My functions were sharing state through pickle files in `/tmp/`. When multiple DAG runs happened (due to retries), they overwrote each other's files.

**Solution**: Use XCom for small data, proper data storage for large datasets:

```python
def extract_patient_data(**context):
    import pandas as pd
    df = pd.read_csv('/data/patients.csv')
    
    # Store in proper location with run_id
    run_id = context['run_id']
    file_path = f'/data/staging/patients_{run_id}.pkl'
    df.to_pickle(file_path)
    
    # Return path via XCom
    return file_path

def transform_patient_data(**context):
    # Get file path from previous task
    file_path = context['task_instance'].xcom_pull(task_ids='extract_patient_data')
    
    import pandas as pd
    df = pd.read_pickle(file_path)
    # ... transformation logic ...
    
    output_path = file_path.replace('patients_', 'patients_clean_')
    df.to_pickle(output_path)
    return output_path
```

### 2. Database Connection Management

My functions were creating new database connections every time, leading to connection pool exhaustion.

**Solution**: Use Airflow's connection management:

```python
from airflow.hooks.postgres_hook import PostgresHook

def load_patient_data(**context):
    file_path = context['task_instance'].xcom_pull(task_ids='transform_patient_data')
    
    import pandas as pd
    df = pd.read_pickle(file_path)
    
    # Use Airflow's connection management
    postgres_hook = PostgresHook(postgres_conn_id='hospital_db')
    engine = postgres_hook.get_sqlalchemy_engine()
    
    df.to_sql('patients', engine, if_exists='replace', index=False)
```

### 3. Error Handling and Monitoring

My original scripts had basic error handling. In Airflow, I needed to think about:
- What happens when a task fails?
- How do I clean up partial data?
- How do I know what went wrong?

```python
def extract_patient_data(**context):
    try:
        import pandas as pd
        df = pd.read_csv('/data/patients.csv')
        
        # Basic data validation
        if len(df) == 0:
            raise ValueError("No patient data found")
        
        if df['patient_id'].isnull().sum() > 0:
            raise ValueError("Found null patient IDs")
        
        run_id = context['run_id']
        file_path = f'/data/staging/patients_{run_id}.pkl'
        df.to_pickle(file_path)
        
        # Log success metrics
        logging.info(f"Extracted {len(df)} patient records")
        return file_path
        
    except Exception as e:
        # Clean up any partial files
        if 'file_path' in locals():
            os.remove(file_path)
        
        # Log detailed error
        logging.error(f"Patient extraction failed: {str(e)}")
        raise
```

## Building Complex Workflows

Once I got the basics working, I started building more complex DAGs. Here's my monthly financial report pipeline:

```python
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator
from airflow.sensors.s3_key_sensor import S3KeySensor

# This DAG waits for multiple data sources and processes them in parallel
dag = DAG(
    'monthly_financial_report',
    default_args=default_args,
    schedule_interval='0 2 1 * *',  # 2 AM on 1st of each month
    catchup=False
)

# Wait for external data sources
wait_for_billing = S3KeySensor(
    task_id='wait_for_billing_data',
    bucket_name='hospital-data',
    bucket_key='billing/{{ ds }}/billing_data.csv',
    timeout=3600,  # Wait up to 1 hour
    dag=dag
)

wait_for_insurance = S3KeySensor(
    task_id='wait_for_insurance_data',
    bucket_name='hospital-data', 
    bucket_key='insurance/{{ ds }}/insurance_data.csv',
    timeout=3600,
    dag=dag
)

# Process data in parallel
process_billing = PythonOperator(
    task_id='process_billing_data',
    python_callable=process_billing_data,
    dag=dag
)

process_insurance = PythonOperator(
    task_id='process_insurance_data',
    python_callable=process_insurance_data,
    dag=dag
)

# Combine and generate report
generate_report = PythonOperator(
    task_id='generate_monthly_report',
    python_callable=generate_financial_report,
    dag=dag
)

# Send report
email_report = BashOperator(
    task_id='email_report',
    bash_command='python /scripts/send_report.py {{ ds }}',
    dag=dag
)

# Define dependencies
wait_for_billing >> process_billing
wait_for_insurance >> process_insurance
[process_billing, process_insurance] >> generate_report >> email_report
```

## Production Deployment Challenges

### 1. Scheduler Configuration

Getting the Airflow scheduler stable in production took several iterations:

```bash
# airflow.cfg adjustments
[core]
executor = LocalExecutor
sql_alchemy_conn = postgresql://airflow:password@localhost/airflow
load_examples = False

[scheduler]
job_heartbeat_sec = 5
scheduler_heartbeat_sec = 5
num_runs = -1
processor_poll_interval = 1

[webserver]
web_server_port = 8080
workers = 4
```

### 2. Resource Management

Some of my tasks were memory-intensive and would crash the scheduler:

```python
# Bad: This could use 8GB+ RAM
def process_large_dataset():
    df = pd.read_csv('huge_file.csv')  # Loads everything into memory
    return df.groupby('category').sum()

# Better: Process in chunks
def process_large_dataset_chunked():
    results = []
    for chunk in pd.read_csv('huge_file.csv', chunksize=10000):
        result = chunk.groupby('category').sum()
        results.append(result)
    return pd.concat(results).groupby('category').sum()
```

### 3. Monitoring and Alerting

Setting up proper monitoring was crucial:

```python
# Custom failure callback
def task_failure_alert(context):
    task_instance = context.get('task_instance')
    dag_id = task_instance.dag_id
    task_id = task_instance.task_id
    execution_date = context.get('execution_date')
    
    # Send Slack notification
    send_slack_message(
        f"🚨 Task Failed: {dag_id}.{task_id} on {execution_date}"
    )

# Add to DAG default_args
default_args = {
    'on_failure_callback': task_failure_alert,
    # ... other args
}
```

## What I Learned

### 1. Start Simple
My first DAGs tried to do too much. Simple, single-purpose DAGs are easier to debug and maintain.

### 2. Think About Data Flow
Airflow is great for orchestration, but it's not a data processing engine. Keep heavy computation in your tasks, use Airflow for coordination.

### 3. Test Everything
DAGs that work in development can fail in production due to timing, resources, or environment differences.

### 4. Monitor Resource Usage
Airflow can consume significant resources. Monitor CPU, memory, and database connections.

## The Results

After 3 months with Airflow:

**Before Airflow:**
- 15+ cron jobs with manual dependency management
- Average failure recovery time: 4+ hours
- No visibility into pipeline status
- Manual intervention required for most failures

**After Airflow:**
- 8 well-organized DAGs with clear dependencies
- Average failure recovery time: 15 minutes (automatic retries)
- Full visibility via web UI
- 80% of failures resolve automatically

## Lessons for Others

### 1. Plan Your DAG Structure
Think about how to break your workflows into logical, reusable tasks.

### 2. Use Airflow's Features
Connections, Variables, XCom - these exist for good reasons. Use them.

### 3. Test Failure Scenarios
What happens when your database is down? When a file is missing? Plan for these.

### 4. Start with LocalExecutor
CeleryExecutor adds complexity you probably don't need initially.

## What's Next

I'm planning to explore:
1. **Kubernetes Executor** for better resource isolation
2. **Custom operators** for common patterns
3. **Data lineage tracking** with Apache Atlas
4. **Integration with dbt** for transformation workflows

Airflow solved my orchestration problems, but it introduced new complexity. For teams with multiple data pipelines, it's worth the investment. For simple, single-pipeline setups, it might be overkill.

---

*Next post: I'm diving into real-time data processing with Kafka and Spark Streaming. Our business users want "real-time dashboards," and I'm about to learn why that's harder than it sounds.*