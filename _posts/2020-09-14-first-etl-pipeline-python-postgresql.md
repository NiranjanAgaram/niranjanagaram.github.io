---
layout: post
title: "Building My First ETL Pipeline with Python and PostgreSQL"
date: 2020-09-14
tags: [python, etl, postgresql, data-engineering, learning]
excerpt: "I finally built my first proper ETL pipeline. It took 3 weeks, broke twice in production, and taught me why data engineering is harder than it looks."
author: "Niranjan Agaram"
---

# Building My First ETL Pipeline with Python and PostgreSQL

Remember how I said I was going to build an ETL pipeline? Well, I did it. Sort of. It works, it's in production, and it's only broken twice so far. Here's the story of my first real data engineering project.

## The Problem

Our hospital gets patient data from 3 different systems:
1. **EMR system**: Patient demographics and visits
2. **Lab system**: Test results and reports  
3. **Billing system**: Insurance and payment data

Each system exports CSV files daily, and someone (usually me) manually combines them for reporting. This takes about 2 hours every morning, and I was getting tired of it.

## The Plan (Overly Ambitious, As Usual)

I wanted to build something that would:
- Automatically pick up new files from each system
- Clean and validate the data
- Load everything into PostgreSQL
- Send me an email when done (or when it breaks)

Simple, right? Right?

## Week 1: The Database Design

First mistake: I spent way too much time on the "perfect" database schema. Coming from SAS where you just dump everything into datasets, designing normalized tables was... educational.

```sql
-- Patient master table
CREATE TABLE patients (
    patient_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender CHAR(1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits table
CREATE TABLE visits (
    visit_id VARCHAR(30) PRIMARY KEY,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    admit_date DATE,
    discharge_date DATE,
    department VARCHAR(50),
    diagnosis_code VARCHAR(20)
);

-- Lab results table
CREATE TABLE lab_results (
    result_id SERIAL PRIMARY KEY,
    visit_id VARCHAR(30) REFERENCES visits(visit_id),
    test_code VARCHAR(20),
    test_name VARCHAR(200),
    result_value VARCHAR(500),
    result_date DATE
);
```

This looked good on paper. In practice, the real data had so many edge cases that I ended up changing the schema 5 times.

## Week 2: The Python Code (First Attempt)

My first version was basically one giant function:

```python
import pandas as pd
import psycopg2
from sqlalchemy import create_engine
import os
import glob

def process_daily_files():
    # Connect to database
    engine = create_engine('postgresql://user:pass@localhost/hospital')
    
    # Process EMR files
    emr_files = glob.glob('/data/emr/*.csv')
    for file in emr_files:
        df = pd.read_csv(file)
        # ... lots of cleaning code ...
        df.to_sql('patients', engine, if_exists='append', index=False)
        os.move(file, '/data/processed/')
    
    # Process lab files
    lab_files = glob.glob('/data/lab/*.csv')
    for file in lab_files:
        df = pd.read_csv(file)
        # ... more cleaning code ...
        df.to_sql('lab_results', engine, if_exists='append', index=False)
        os.move(file, '/data/processed/')
    
    # Process billing files
    # ... you get the idea ...
    
    print("Done!")

if __name__ == "__main__":
    process_daily_files()
```

This actually worked! For about 3 days. Then it broke spectacularly when the EMR system changed their date format from MM/DD/YYYY to DD/MM/YYYY without telling anyone.

## Week 3: Making It Actually Work

After the first crash, I realized I needed proper error handling, logging, and data validation. The rewrite was painful but necessary:

```python
import logging
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime
import smtplib
from email.mime.text import MIMEText

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/logs/etl.log'),
        logging.StreamHandler()
    ]
)

class ETLPipeline:
    def __init__(self, db_connection_string):
        self.engine = create_engine(db_connection_string)
        self.errors = []
        
    def validate_patient_data(self, df):
        """Validate patient data before loading"""
        initial_count = len(df)
        
        # Remove rows with missing patient_id
        df = df.dropna(subset=['patient_id'])
        
        # Validate date formats
        try:
            df['date_of_birth'] = pd.to_datetime(df['date_of_birth'], 
                                               format='%m/%d/%Y', 
                                               errors='coerce')
        except:
            # Try alternative format
            df['date_of_birth'] = pd.to_datetime(df['date_of_birth'], 
                                               format='%d/%m/%Y', 
                                               errors='coerce')
        
        # Remove invalid dates
        df = df.dropna(subset=['date_of_birth'])
        
        final_count = len(df)
        if final_count < initial_count * 0.9:  # Lost more than 10%
            raise ValueError(f"Too many invalid records: {initial_count} -> {final_count}")
            
        logging.info(f"Validated patient data: {final_count} records")
        return df
    
    def process_emr_files(self):
        """Process EMR files with error handling"""
        try:
            emr_files = glob.glob('/data/emr/*.csv')
            logging.info(f"Found {len(emr_files)} EMR files to process")
            
            for file_path in emr_files:
                logging.info(f"Processing {file_path}")
                
                # Read and validate
                df = pd.read_csv(file_path)
                df = self.validate_patient_data(df)
                
                # Load to database
                df.to_sql('patients', self.engine, 
                         if_exists='append', index=False, method='multi')
                
                # Move processed file
                processed_path = file_path.replace('/emr/', '/processed/emr/')
                os.rename(file_path, processed_path)
                
                logging.info(f"Successfully processed {len(df)} records from {file_path}")
                
        except Exception as e:
            error_msg = f"Error processing EMR files: {str(e)}"
            logging.error(error_msg)
            self.errors.append(error_msg)
    
    def send_notification(self, success=True):
        """Send email notification"""
        if success and not self.errors:
            subject = "ETL Pipeline - Success"
            body = f"Daily ETL completed successfully at {datetime.now()}"
        else:
            subject = "ETL Pipeline - ERRORS"
            body = f"ETL completed with errors:\n\n" + "\n".join(self.errors)
        
        # Email sending code here...
        logging.info(f"Notification sent: {subject}")
    
    def run_pipeline(self):
        """Run the complete ETL pipeline"""
        start_time = datetime.now()
        logging.info("Starting ETL pipeline")
        
        try:
            self.process_emr_files()
            self.process_lab_files()
            self.process_billing_files()
            
            end_time = datetime.now()
            duration = end_time - start_time
            logging.info(f"ETL pipeline completed in {duration}")
            
            self.send_notification(success=True)
            
        except Exception as e:
            logging.error(f"Pipeline failed: {str(e)}")
            self.errors.append(str(e))
            self.send_notification(success=False)
```

## The Challenges I Didn't Expect

### 1. Data Quality Issues

Real healthcare data is messy. Really messy. Some gems I found:
- Patient birthdates in the future
- Negative ages
- Gender values like "M", "Male", "MALE", "m", and my favorite: "Yes"
- Diagnosis codes with emojis (how??)

### 2. File Locking Issues

The source systems sometimes took a while to finish writing files. My script would try to read half-written files and crash. Solution: check file modification time and wait if it's too recent.

```python
def is_file_ready(file_path, wait_seconds=60):
    """Check if file is ready for processing"""
    file_time = os.path.getmtime(file_path)
    current_time = time.time()
    return (current_time - file_time) > wait_seconds
```

### 3. Database Connection Issues

PostgreSQL connections would timeout during long-running operations. Learned about connection pooling the hard way.

### 4. Memory Problems

Loading large CSV files into pandas DataFrames ate up all the RAM. Had to implement chunking:

```python
def process_large_file(file_path, chunk_size=10000):
    """Process large files in chunks"""
    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        # Process chunk
        cleaned_chunk = validate_and_clean(chunk)
        # Load to database
        cleaned_chunk.to_sql('table_name', engine, if_exists='append')
```

## Production Deployment

Getting this running on our server was another adventure:

1. **Cron job setup**: Runs every morning at 6 AM
2. **Virtual environment**: Learned about pip freeze and requirements.txt
3. **File permissions**: Spent a day figuring out why the script couldn't read files
4. **Monitoring**: Added basic health checks

```bash
# Crontab entry
0 6 * * * /home/niranjan/etl_env/bin/python /home/niranjan/etl/run_pipeline.py
```

## The Results

After 3 weeks of development and 2 weeks of debugging, it works:

- **Processing time**: Reduced from 2 hours manual work to 15 minutes automated
- **Reliability**: Runs successfully 95% of the time
- **Data quality**: Better validation than manual process
- **Monitoring**: I know immediately when something breaks

## What I Learned

### Technical Lessons:
1. **Error handling is not optional**: Plan for everything to go wrong
2. **Logging is your friend**: You can't debug what you can't see
3. **Data validation is crucial**: Never trust source data
4. **Start simple**: My first version was too complex

### Process Lessons:
1. **Test with real data**: Toy datasets hide real problems
2. **Monitor everything**: Disk space, memory, connection counts
3. **Have a rollback plan**: Things will break in production
4. **Document your assumptions**: Future you will thank present you

## What's Next

This pipeline is working, but it's not pretty. My next improvements:
1. **Better error recovery**: Retry failed operations
2. **Data lineage tracking**: Know where each record came from
3. **Performance optimization**: It's still slower than I'd like
4. **Configuration management**: Stop hardcoding everything

## For Anyone Building Their First Pipeline

**Start smaller than you think.** My original plan was way too ambitious. Get something basic working first, then add features.

**Embrace the mess.** Real data is always messier than you expect. Build for that reality.

**Monitor everything.** You need to know when things break, preferably before your users do.

**Keep learning.** I'm already seeing better ways to do everything I built.

---

*Next up: I'm going to try Apache Airflow. Everyone says it's the "right" way to do ETL. We'll see if it's worth the complexity.*