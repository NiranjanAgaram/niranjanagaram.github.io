---
layout: default
title: "Welcome to Niranjan's Data Engineering Blog"
---

# Welcome to My Data Engineering Blog

I'm a passionate data engineer sharing insights, tutorials, and best practices in the world of data engineering, machine learning, and analytics.

## Recent Posts

{% for post in site.posts limit:5 %}
<div class="post-card">
    {% assign post_icons = 'apache-airflow:⚡,data-lakes:🏞️,kafka:🚀,data-quality:🎯,mlops:🤖' | split: ',' %}
    {% assign post_icon = '💡' %}
    {% for icon_pair in post_icons %}
        {% assign pair = icon_pair | split: ':' %}
        {% if post.tags contains pair[0] %}
            {% assign post_icon = pair[1] %}
            {% break %}
        {% endif %}
    {% endfor %}
    <div class="post-image">{{ post_icon }}</div>
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    <div class="post-meta">{{ post.date | date: "%B %d, %Y" }}</div>
    <div class="post-excerpt">{{ post.excerpt | strip_html | truncatewords: 30 }}</div>
    {% if post.tags %}
    <div class="tags">
    {% for tag in post.tags %}
        <span class="tag">{{ tag }}</span>
    {% endfor %}
    </div>
    {% endif %}
</div>
{% endfor %}

## What I Write About

- **Data Pipeline Architecture**: Building scalable and reliable data processing systems
- **Cloud Technologies**: Working with AWS, GCP, and Azure for data solutions
- **Machine Learning Operations**: MLOps practices and deployment strategies
- **Analytics & Visualization**: Tools and techniques for data analysis
- **Career Development**: Insights and advice for data engineering professionals

## Get In Touch

Interested in collaborating or have questions about data engineering? Feel free to reach out!

---

*This blog is built with Jekyll and hosted on GitHub Pages.*