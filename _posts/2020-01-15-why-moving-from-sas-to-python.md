---
layout: post
title: "Why I'm Moving from SAS to Python: A Data Analyst's Journey"
date: 2020-01-15
tags: [sas, python, data-analysis, career-transition]
excerpt: "After 3 years with SAS, I'm making the switch to Python. Here's why, and what I'm learning along the way."
author: "Niranjan Agaram"
---

# Why I'm Moving from SAS to Python: A Data Analyst's Journey

So I've been working with SAS for about 3 years now, mostly doing healthcare analytics. It's been good - SAS is powerful, reliable, and my manager loves those clean reports. But lately, I've been feeling... stuck.

## The Wake-Up Call

Last month, I was at a data meetup in Bangalore (yes, we had those before COVID hit), and this guy was showing off some Python visualization with matplotlib. In 10 lines of code, he created something that would take me 50+ lines in SAS. That hurt.

But what really got me was when he mentioned the cost. Our company pays lakhs for SAS licenses, and here's this open-source tool doing the same thing. Maybe better.

## Why SAS Isn't Cutting It Anymore

Don't get me wrong - SAS has its place. PROC SQL is solid, and the statistical procedures are rock-solid. But:

1. **Cost**: Our renewal is coming up, and finance is asking questions
2. **Flexibility**: Want to scrape some web data? Good luck with SAS
3. **Community**: Stack Overflow has like 10x more Python answers than SAS
4. **Job Market**: Every job posting mentions Python. SAS? Not so much.

## My Learning Plan (Probably Too Ambitious)

I've given myself 6 months to get comfortable with Python for data analysis. Here's what I'm planning:

**Month 1-2**: Basic Python + Pandas
- Codecademy Python course (already started)
- "Python for Data Analysis" book (ordered from Amazon)
- Recreate my current SAS reports in pandas

**Month 3-4**: Visualization + Statistics
- matplotlib and seaborn
- scipy for statistical tests
- Maybe try plotly if I'm feeling fancy

**Month 5-6**: Real Projects
- Migrate one of our monthly reports completely
- Learn some basic machine learning (scikit-learn)

## The Challenges I'm Expecting

**Learning Curve**: After years of PROC this and PROC that, thinking in functions and objects is... different.

**Performance**: SAS handles big datasets really well. Will Python keep up? (I know about Dask, but one thing at a time)

**Convincing My Team**: My manager still thinks "real analytics" means SAS. This might be the hardest part.

## First Week with Python

I installed Anaconda last weekend and started playing around. Here's my first pandas code that actually worked:

```python
import pandas as pd

# Reading a CSV (took me 20 minutes to figure out encoding issues)
df = pd.read_csv('patient_data.csv', encoding='latin-1')

# This felt familiar - like PROC MEANS
print(df.describe())

# Group by - similar to SAS but syntax is weird
summary = df.groupby('department')['age'].mean()
print(summary)
```

It's not pretty, but it works! The encoding thing was annoying - SAS never gave me those headaches.

## What I'm Worried About

1. **Am I too late?** Everyone seems to already know Python
2. **Will I miss SAS?** Those error messages are actually helpful
3. **Performance on large datasets** - our main table has 2M+ rows
4. **Explaining this to stakeholders** who are used to SAS output formats

## The Plan Forward

I'm going to document this journey here. Partly for accountability, partly because I couldn't find many "SAS to Python" stories online. Maybe this helps someone else making the same transition.

Next post: I'll share how my first attempt at recreating a SAS report in pandas went. Spoiler: it didn't go smoothly.

If you've made a similar transition, I'd love to hear your experience. What worked? What didn't? Any resources you'd recommend?

---

*Update: It's been a week since I wrote this, and I'm already second-guessing myself. Python's indentation thing is driving me crazy. Why can't it just use BEGIN/END like normal languages?*