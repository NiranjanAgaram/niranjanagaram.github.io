---
layout: post
title: "Learning Pandas: My First Month with Python for Data Analysis"
date: 2020-03-22
tags: [python, pandas, learning, data-analysis]
excerpt: "One month into my Python journey. Here's what I've learned, what I've struggled with, and why I almost gave up twice."
author: "Niranjan Agaram"
---

# Learning Pandas: My First Month with Python for Data Analysis

It's been exactly one month since I decided to learn Python, and wow... this has been a rollercoaster. I almost quit twice, had three "aha!" moments, and I'm pretty sure I've googled "pandas vs SAS" about 50 times.

## The Good News First

I successfully recreated our monthly patient demographics report in Python! It took me 3 days (compared to 30 minutes in SAS), but it works. And honestly, the final code looks cleaner than my SAS version.

## The Struggles Were Real

### Week 1: Everything is Broken

My first week was basically:
- Install Python ✓
- Install pandas ✓  
- Try to read a CSV ✗
- Spend 4 hours figuring out why ✗
- Question life choices ✗

The encoding issues were killing me. In SAS, you just point to a file and it works. In pandas:

```python
# This didn't work
df = pd.read_csv('data.csv')  # UnicodeDecodeError

# Neither did this
df = pd.read_csv('data.csv', encoding='utf-8')  # Still broken

# Finally this worked (after Stack Overflow)
df = pd.read_csv('data.csv', encoding='latin-1', low_memory=False)
```

Why is this so complicated?

### Week 2: Index Hell

SAS doesn't really have this concept of "index" that pandas obsesses over. I spent an entire day trying to figure out why my merge wasn't working, only to discover it was because of mismatched indices.

```python
# This looked right to me
result = df1.merge(df2, on='patient_id')

# But I needed this
result = df1.reset_index().merge(df2.reset_index(), on='patient_id')
```

Coming from SAS PROC SQL, this felt unnecessarily complex.

### Week 3: The Breakthrough

Something clicked in week 3. I was working on a data cleaning task that would have been painful in SAS, and pandas just... made sense.

```python
# Cleaning messy age data
df['age_clean'] = (df['age']
                   .str.replace('years', '')
                   .str.replace('yrs', '')
                   .str.strip()
                   .astype(float))

# Multiple conditions - so much cleaner than nested IF-THEN-ELSE
df['age_group'] = pd.cut(df['age_clean'], 
                        bins=[0, 18, 35, 50, 65, 100], 
                        labels=['Child', 'Young Adult', 'Adult', 'Middle Age', 'Senior'])
```

This would have been a nightmare in SAS. In pandas, it's actually readable.

## What I've Learned

### 1. The Documentation is... Different

SAS documentation tells you exactly what each PROC does. Pandas documentation assumes you already know what you want to do. I've bookmarked about 20 different tutorial sites.

### 2. Error Messages Are Cryptic

SAS: "ERROR: Variable AGE not found in dataset PATIENTS"
Pandas: "KeyError: 'age'" (after a 50-line traceback)

I miss SAS error messages.

### 3. But the Flexibility is Amazing

Want to apply a custom function to every row? Easy.
```python
df['custom_score'] = df.apply(lambda row: some_complex_logic(row), axis=1)
```

Try doing that in SAS without writing a macro.

### 4. Performance is... Complicated

Small datasets (< 100K rows): Pandas is faster
Large datasets (> 1M rows): SAS still wins
But pandas has tricks (chunking, dtypes optimization) that help.

## My Current Workflow

I'm now using both tools:
- **SAS**: For the heavy lifting on large datasets
- **Python**: For data cleaning, visualization, and anything involving APIs

This hybrid approach is working well, though my manager keeps asking when I'll "pick one."

## The Mistakes I Made

1. **Trying to write SAS in Python**: Pandas isn't SAS. Stop fighting it.
2. **Not learning the basics first**: I jumped straight to complex operations
3. **Ignoring data types**: Everything defaulting to object type caused so many issues
4. **Not using .copy()**: Spent hours debugging why my original dataframe kept changing

## What's Next

I'm getting comfortable with basic pandas operations, but I know I'm still thinking like a SAS programmer. My next goals:

1. **Learn proper Python patterns**: Stop writing everything in one giant function
2. **Master groupby operations**: They're powerful but confusing
3. **Get serious about visualization**: matplotlib basics
4. **Try some real machine learning**: scikit-learn looks interesting

## For Other SAS Users Considering the Switch

**The honest truth**: It's harder than the tutorials make it seem. Python assumes you know programming concepts that SAS abstracts away. But the flexibility and community support make it worth the struggle.

**My advice**:
- Don't try to replicate SAS exactly
- Embrace the different way of thinking
- Use Stack Overflow liberally (no shame)
- Keep SAS around for now - hybrid approach works

## Code That Actually Helped Me

Here's the pandas equivalent of common SAS operations that took me forever to figure out:

```python
# SAS: PROC FREQ
df['category'].value_counts()

# SAS: PROC MEANS by group
df.groupby('department')['salary'].agg(['mean', 'std', 'count'])

# SAS: WHERE statement
df[df['age'] > 30]

# SAS: IF-THEN-ELSE
df['status'] = np.where(df['score'] > 80, 'Pass', 'Fail')
```

Next month, I'm planning to tackle matplotlib. Wish me luck - I have a feeling I'll need it.

---

*P.S. - I finally understand why people love Jupyter notebooks. Being able to see your data at each step is game-changing compared to SAS Enterprise Guide.*