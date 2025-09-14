---
layout: post
title: "Setting up Apache Airflow for Workflow Orchestration"
date: 2021-08-20
tags: [apache-airflow, workflow-orchestration, data-pipelines, automation]
excerpt: "Master Apache Airflow for building robust, scalable workflow orchestration systems with DAGs, scheduling, and monitoring capabilities."
image: "/assets/images/posts/airflow-orchestration.svg"
author: "Niranjan Agaram"
---

# Setting up Apache Airflow for Workflow Orchestration

Apache Airflow has become the gold standard for orchestrating complex data workflows. In this post, I'll walk you through setting up Airflow and creating your first DAG.

## Why Apache Airflow?

Airflow provides:
- **Visual workflow management** with a web-based UI
- **Scalable task execution** across multiple workers
- **Rich scheduling capabilities** with cron-like expressions
- **Extensive integrations** with cloud services and databases
- **Robust error handling** and retry mechanisms

## Installation and Setup

### Using Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: airflow
      POSTGRES_DB: airflow
    volumes:
      - postgres_db_volume:/var/lib/postgresql/data

  airflow-webserver:
    image: apache/airflow:2.7.0
    depends_on:
      - postgres
    environment:
      AIRFLOW__CORE__EXECUTOR: LocalExecutor
      AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@postgres/airflow
    ports:
      - "8080:8080"
    command: webserver
```

### Creating Your First DAG

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'data_pipeline_example',
    default_args=default_args,
    description='A simple data pipeline DAG',
    schedule_interval='@daily',
    catchup=False
)

def extract_data():
    # Your data extraction logic
    print("Extracting data from source...")
    return "data_extracted"

def transform_data():
    # Your data transformation logic
    print("Transforming data...")
    return "data_transformed"

extract_task = PythonOperator(
    task_id='extract_data',
    python_callable=extract_data,
    dag=dag
)

transform_task = PythonOperator(
    task_id='transform_data',
    python_callable=transform_data,
    dag=dag
)

load_task = BashOperator(
    task_id='load_data',
    bash_command='echo "Loading data to warehouse..."',
    dag=dag
)

# Define task dependencies
extract_task >> transform_task >> load_task
```

## Best Practices

### 1. DAG Design Principles
- Keep DAGs simple and focused
- Use meaningful task and DAG names
- Implement proper error handling
- Set appropriate timeouts and retries

### 2. Resource Management
- Configure worker pools for different workloads
- Use task concurrency limits
- Monitor resource usage

### 3. Testing and Monitoring
- Test DAGs locally before deployment
- Set up alerting for failed tasks
- Use Airflow's built-in logging

## Advanced Features

### Dynamic DAG Generation
```python
from airflow.models import Variable

# Get configuration from Airflow Variables
tables = Variable.get("tables_to_process", deserialize_json=True)

for table in tables:
    task = PythonOperator(
        task_id=f'process_{table}',
        python_callable=process_table,
        op_kwargs={'table_name': table},
        dag=dag
    )
```

### Custom Operators
```python
from airflow.models import BaseOperator
from airflow.utils.decorators import apply_defaults

class DataQualityOperator(BaseOperator):
    @apply_defaults
    def __init__(self, table_name, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.table_name = table_name
    
    def execute(self, context):
        # Custom data quality checks
        pass
```

## Next Steps

In upcoming posts, I'll cover:
- Advanced Airflow patterns and best practices
- Integrating Airflow with cloud services
- Monitoring and troubleshooting Airflow deployments
- Building reusable Airflow components

Airflow transforms how we think about data workflow orchestration, making complex pipelines manageable and reliable.

---

*Questions about Airflow setup or DAG design? Let me know in the comments!*