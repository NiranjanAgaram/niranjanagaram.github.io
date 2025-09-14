---
layout: post
title: "Getting Started with Apache Spark: Lessons from My First Project"
date: 2021-02-08
tags: [spark, pyspark, big-data, learning, performance]
excerpt: "I finally tried Apache Spark on a real project. Here's what worked, what didn't, and why I'm both excited and frustrated."
author: "Niranjan Agaram"
---

# Getting Started with Apache Spark: Lessons from My First Project

After months of hearing about Apache Spark at every data meetup, I finally got a chance to use it on a real project. Our patient data had grown to 5+ million records, and my trusty pandas + PostgreSQL setup was starting to struggle. Time to see what all the Spark hype was about.

## The Project

We needed to analyze 3 years of patient visit data to identify readmission patterns. The dataset:
- **5.2 million patient visits**
- **15 million lab results** 
- **8 million billing records**
- **Total size**: ~12 GB across multiple CSV files

My existing Python pipeline was taking 4+ hours to process this, and our business users were getting impatient.

## Setting Up Spark (Harder Than Expected)

Everyone talks about how easy Spark is to get started with. They're lying.

### Attempt 1: Local Installation

```bash
# This looked simple enough
pip install pyspark
```

First script:
```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("PatientAnalysis").getOrCreate()
df = spark.read.csv("patient_visits.csv", header=True, inferSchema=True)
df.show()
```

Result: `java.lang.OutOfMemoryError`

Turns out my laptop's 8GB RAM wasn't enough for Spark's default settings.

### Attempt 2: Tuning Memory Settings

```python
spark = SparkSession.builder \
    .appName("PatientAnalysis") \
    .config("spark.executor.memory", "4g") \
    .config("spark.driver.memory", "2g") \
    .config("spark.sql.adaptive.enabled", "true") \
    .getOrCreate()
```

Better, but still crashed on larger operations. Learned that Spark's memory management is... complex.

### Attempt 3: Understanding Partitions

This was my "aha" moment. Spark works with partitions, not entire datasets:

```python
# Read with explicit partitioning
df = spark.read.csv("patient_visits.csv", header=True) \
    .repartition(8)  # 8 partitions for my 4-core machine

# Check partition count
print(f"Partitions: {df.rdd.getNumPartitions()}")
```

Finally, something that worked consistently!

## The Learning Curve

### DataFrames vs RDDs

Everyone said "use DataFrames, not RDDs." But the DataFrame API felt weird coming from pandas:

```python
# Pandas way (familiar)
df[df['age'] > 65]['department'].value_counts()

# Spark way (confusing at first)
df.filter(df.age > 65) \
  .groupBy('department') \
  .count() \
  .orderBy('count', ascending=False) \
  .show()
```

The Spark way is more verbose, but it's actually more explicit about what's happening.

### Lazy Evaluation

This concept took me a while to grasp:

```python
# This doesn't actually do anything yet
filtered_df = df.filter(df.age > 65)
grouped_df = filtered_df.groupBy('department').count()

# Only this triggers actual computation
result = grouped_df.collect()  # or .show(), .write(), etc.
```

At first, this felt inefficient. Why not just do the work immediately? But once I understood query optimization, it made sense.

## My First Real Analysis

Here's the readmission analysis I built:

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.window import Window

spark = SparkSession.builder \
    .appName("ReadmissionAnalysis") \
    .config("spark.executor.memory", "4g") \
    .getOrCreate()

# Load data
visits = spark.read.csv("patient_visits.csv", header=True, inferSchema=True)
patients = spark.read.csv("patient_demographics.csv", header=True, inferSchema=True)

# Join datasets
combined = visits.join(patients, "patient_id", "inner")

# Define window for finding next visit
window_spec = Window.partitionBy("patient_id").orderBy("admit_date")

# Calculate days to next visit
with_next_visit = combined.withColumn(
    "next_admit_date", 
    lead("admit_date").over(window_spec)
).withColumn(
    "days_to_readmission",
    datediff(col("next_admit_date"), col("discharge_date"))
)

# Identify readmissions (within 30 days)
readmissions = with_next_visit.filter(
    (col("days_to_readmission") <= 30) & 
    (col("days_to_readmission") > 0)
)

# Analysis by department
readmission_rates = combined.groupBy("department") \
    .agg(
        count("*").alias("total_visits"),
        sum(when(col("days_to_readmission") <= 30, 1).otherwise(0)).alias("readmissions")
    ).withColumn(
        "readmission_rate",
        round(col("readmissions") / col("total_visits") * 100, 2)
    )

readmission_rates.orderBy(desc("readmission_rate")).show()
```

This analysis took 12 minutes in Spark vs. 3+ hours in my pandas version. I was impressed.

## What Worked Well

### 1. Performance on Large Datasets
Once I got the configuration right, Spark was significantly faster than pandas for operations on large datasets.

### 2. SQL Interface
Being able to use SQL was great:

```python
# Register as temp view
combined.createOrReplaceTempView("patient_visits")

# Use familiar SQL
result = spark.sql("""
    SELECT department, 
           COUNT(*) as total_visits,
           AVG(length_of_stay) as avg_los
    FROM patient_visits 
    WHERE admit_date >= '2020-01-01'
    GROUP BY department
    ORDER BY avg_los DESC
""")
```

### 3. Built-in Optimizations
The Catalyst optimizer actually made some of my queries faster than I expected. It's like having a DBA optimize your queries automatically.

## What Frustrated Me

### 1. Error Messages
Spark error messages are terrible. A simple typo gives you a 50-line Java stack trace that tells you nothing useful.

```
py4j.protocol.Py4JJavaError: An error occurred while calling o123.showString.
: org.apache.spark.SparkException: Job aborted due to stage failure: 
Task 0 in stage 12.0 failed 1 times, most recent failure: 
Lost task 0.0 in stage 12.0 (TID 12, localhost, executor driver): 
org.apache.spark.api.python.PythonException: Traceback (most recent call last):
...
```

Compare this to pandas: `KeyError: 'column_name'`. Much clearer.

### 2. Memory Tuning
Getting memory settings right is still black magic to me. Too little memory = crashes. Too much memory = slow startup. The sweet spot is hard to find.

### 3. Development Workflow
The feedback loop is slower than pandas. Every operation takes a few seconds to start up, which makes interactive development painful.

## Performance Comparison

I ran the same readmission analysis on both platforms:

| Operation | Pandas | Spark | Dataset Size |
|-----------|--------|-------|--------------|
| Data Loading | 45s | 12s | 5M records |
| Filtering | 8s | 3s | 5M records |
| Grouping/Aggregation | 25s | 7s | 5M records |
| Window Functions | 180s | 15s | 5M records |
| **Total Runtime** | **258s** | **37s** | **5M records** |

Spark was 7x faster overall, but the difference was most dramatic for complex operations like window functions.

## Lessons Learned

### 1. Spark Isn't Always Better
For small datasets (< 1M records), pandas is often faster and definitely easier to work with. Spark's overhead isn't worth it.

### 2. Partitioning Matters
Understanding how your data is partitioned is crucial for performance:

```python
# Check partition distribution
df.groupBy(spark_partition_id()).count().show()

# Repartition if needed
df = df.repartition(col("department"))  # Partition by department
```

### 3. Caching Is Important
For iterative operations, caching intermediate results makes a huge difference:

```python
# Cache frequently used datasets
filtered_data = df.filter(df.age > 18).cache()

# Use it multiple times without recomputing
result1 = filtered_data.groupBy("department").count()
result2 = filtered_data.groupBy("gender").count()
```

### 4. Start Simple
My first Spark script tried to do everything at once. Breaking it into smaller, testable pieces made debugging much easier.

## When to Use Spark

Based on my experience:

**Use Spark when:**
- Dataset > 2-3 GB
- Complex transformations (joins, window functions)
- Need to scale beyond single machine
- Working with multiple data sources

**Stick with pandas when:**
- Dataset < 1 GB
- Simple operations
- Interactive analysis
- Rapid prototyping

## What's Next

I'm planning to explore:
1. **Spark on cloud platforms** (AWS EMR, Databricks)
2. **Streaming with Spark** (real-time data processing)
3. **MLlib** (Spark's machine learning library)
4. **Delta Lake** (for better data management)

## For Others Getting Started

**Don't expect it to be easy.** Spark has a learning curve, especially if you're coming from pandas.

**Start with the DataFrame API.** Ignore RDDs unless you have a specific need.

**Learn about partitioning early.** It affects everything in Spark.

**Use the Spark UI.** It's invaluable for understanding what's actually happening: `http://localhost:4040`

**Practice on real data.** Toy examples don't show you the real challenges.

## The Bottom Line

Spark is powerful, but it's not magic. It solved my performance problems, but introduced new complexity. For large-scale data processing, it's worth the learning curve. For everything else, pandas is still my go-to.

---

*Next post: I'm going to compare AWS and Azure for data workloads. My company is considering a cloud migration, and I volunteered to do the research. Wish me luck navigating enterprise procurement!*