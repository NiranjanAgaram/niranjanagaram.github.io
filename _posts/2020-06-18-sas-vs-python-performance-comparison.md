---
layout: post
title: "SAS vs Python: Performance Comparison on Real Healthcare Data"
date: 2020-06-18
tags: [sas, python, performance, healthcare-data, benchmarking]
excerpt: "I tested SAS and Python on our actual healthcare dataset. The results surprised me, and not always in a good way."
author: "Niranjan Agaram"
---

# SAS vs Python: Performance Comparison on Real Healthcare Data

After 4 months of using both SAS and Python, my manager finally asked the question I was dreading: "Which one should we standardize on?" 

So I did what any data person would do - I ran some tests. Here's what I found when I compared SAS and Python on our actual healthcare data.

## The Dataset

Our main patient table:
- **Size**: 1.8 million rows, 47 columns
- **File size**: 2.3 GB CSV
- **Data types**: Mix of numeric, dates, and text
- **Messiness level**: High (real-world healthcare data is... special)

## Test Environment

- **Machine**: Dell workstation, 16GB RAM, SSD
- **SAS**: SAS 9.4 (company license)
- **Python**: 3.7 with pandas 1.0.3
- **Tests run**: 5 times each, averaged results

## The Tests

I picked 5 common operations we do regularly:

### Test 1: Reading the Data

**SAS**:
```sas
data patients;
    infile 'patient_data.csv' dlm=',' firstobs=2;
    input patient_id $ name $ age dob :date9. department $ ...;
run;
```
**Time**: 47 seconds

**Python**:
```python
df = pd.read_csv('patient_data.csv', 
                 parse_dates=['dob'],
                 dtype={'patient_id': 'str', 'department': 'category'})
```
**Time**: 1 minute 23 seconds

**Winner**: SAS (and it's not close)

### Test 2: Basic Summary Statistics

**SAS**:
```sas
proc means data=patients;
    var age length_of_stay;
    class department;
run;
```
**Time**: 12 seconds

**Python**:
```python
summary = df.groupby('department')['age', 'length_of_stay'].describe()
```
**Time**: 8 seconds

**Winner**: Python (barely)

### Test 3: Complex Filtering and Aggregation

This is where it gets interesting. I needed to:
- Filter patients admitted in last 6 months
- Group by department and age group
- Calculate multiple statistics

**SAS**:
```sas
proc sql;
    create table summary as
    select department,
           case when age < 18 then 'Child'
                when age < 65 then 'Adult'
                else 'Senior' end as age_group,
           count(*) as patient_count,
           mean(length_of_stay) as avg_los,
           std(length_of_stay) as std_los
    from patients
    where admit_date >= '01JAN2020'd
    group by department, calculated age_group;
quit;
```
**Time**: 28 seconds

**Python**:
```python
# Filter recent admissions
recent = df[df['admit_date'] >= '2020-01-01']

# Create age groups
recent['age_group'] = pd.cut(recent['age'], 
                            bins=[0, 18, 65, 100], 
                            labels=['Child', 'Adult', 'Senior'])

# Group and aggregate
summary = (recent.groupby(['department', 'age_group'])['length_of_stay']
           .agg(['count', 'mean', 'std'])
           .reset_index())
```
**Time**: 15 seconds

**Winner**: Python (significantly faster)

### Test 4: Data Cleaning

Cleaning messy diagnosis codes (removing spaces, standardizing format):

**SAS**:
```sas
data clean_patients;
    set patients;
    diagnosis_clean = compress(upcase(diagnosis), ' .-');
    if length(diagnosis_clean) < 3 then diagnosis_clean = 'UNKNOWN';
run;
```
**Time**: 1 minute 45 seconds

**Python**:
```python
df['diagnosis_clean'] = (df['diagnosis']
                        .str.upper()
                        .str.replace(r'[ .-]', '', regex=True)
                        .str.replace(r'^.{0,2}$', 'UNKNOWN', regex=True))
```
**Time**: 22 seconds

**Winner**: Python (by a lot)

### Test 5: Joining with Reference Data

Joining with a smaller lookup table (500 rows):

**SAS**:
```sas
proc sql;
    create table joined as
    select p.*, r.department_name, r.cost_center
    from patients p
    left join reference r
    on p.department = r.dept_code;
quit;
```
**Time**: 35 seconds

**Python**:
```python
result = df.merge(reference_df, 
                  left_on='department', 
                  right_on='dept_code', 
                  how='left')
```
**Time**: 18 seconds

**Winner**: Python

## The Results Summary

| Operation | SAS Time | Python Time | Winner |
|-----------|----------|-------------|---------|
| Reading Data | 47s | 83s | SAS |
| Summary Stats | 12s | 8s | Python |
| Complex Aggregation | 28s | 15s | Python |
| Data Cleaning | 105s | 22s | Python |
| Joining | 35s | 18s | Python |

## What I Learned

### SAS Strengths:
1. **File I/O**: SAS is incredibly efficient at reading large files
2. **Memory management**: Handles big datasets without breaking a sweat
3. **Consistency**: Performance is predictable
4. **Built for this**: 40+ years of optimization for data processing

### Python Strengths:
1. **String operations**: Regex and text processing are much faster
2. **Flexibility**: Can optimize for specific use cases
3. **Modern algorithms**: Benefits from newer computational approaches
4. **Memory efficiency**: When configured properly

## The Surprises

**Biggest surprise**: Python's string processing speed. Operations that took minutes in SAS completed in seconds with pandas.

**Biggest disappointment**: Reading large CSV files in Python is still painful. I tried different approaches:

```python
# Standard approach - slow
df = pd.read_csv('file.csv')

# Optimized dtypes - better but still slow
df = pd.read_csv('file.csv', dtype={'col1': 'category', 'col2': 'int32'})

# Chunking - faster but more complex
chunks = pd.read_csv('file.csv', chunksize=10000)
df = pd.concat(chunks, ignore_index=True)
```

Even the optimized version was slower than SAS.

## Real-World Implications

For our team, the choice isn't clear-cut:

**Use SAS when**:
- Working with very large datasets (> 2GB)
- Need rock-solid reliability
- Doing standard statistical analysis
- Working with SAS-native formats

**Use Python when**:
- Heavy text processing/cleaning
- Need custom logic or algorithms
- Want to integrate with web APIs
- Building automated workflows

## The Memory Story

One thing the timing tests don't show: memory usage.

SAS consistently used about 4-6GB RAM for these operations. Python varied wildly - from 2GB (when optimized) to 12GB (when I was careless with data types).

This matters on our shared server where memory is limited.

## My Recommendation

After all this testing, my recommendation to management was: **Keep both, for now.**

- Use SAS for the heavy-duty data processing
- Use Python for the creative/custom work
- Gradually shift new projects to Python
- Train the team on both

Not the clean answer they wanted, but the honest one.

## What's Next

I'm planning to test:
1. **Dask**: For larger-than-memory datasets in Python
2. **SAS/Python integration**: Can we get the best of both?
3. **Cloud performance**: How do these compare on AWS/Azure?

## For Other Teams Facing This Decision

**Don't just benchmark toy datasets.** Use your actual data with your actual workflows. The results might surprise you.

**Consider the total cost**: SAS licensing vs. Python development time vs. training costs.

**Think long-term**: Where is your team going? What skills do you want to build?

---

*Next post: I'm going to try building my first real ETL pipeline in Python. Spoiler alert: it's going to be messy.*