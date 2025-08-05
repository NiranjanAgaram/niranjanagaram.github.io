---
layout: default
title: "All Posts"
permalink: /posts/
---

# All Posts

<div class="posts-container">
  {% for post in site.posts %}
    <div class="post-card">
      {% assign post_icon = '💡' %}
      {% if post.tags contains 'apache-airflow' %}{% assign post_icon = '⚡' %}{% endif %}
      {% if post.tags contains 'data-lakes' %}{% assign post_icon = '🏞️' %}{% endif %}
      {% if post.tags contains 'kafka' %}{% assign post_icon = '🚀' %}{% endif %}
      {% if post.tags contains 'data-quality' %}{% assign post_icon = '🎯' %}{% endif %}
      {% if post.tags contains 'mlops' %}{% assign post_icon = '🤖' %}{% endif %}
      {% if post.tags contains 'python' %}{% assign post_icon = '🐍' %}{% endif %}
      {% if post.tags contains 'streaming' %}{% assign post_icon = '📊' %}{% endif %}
      {% if post.tags contains 'ai' %}{% assign post_icon = '🧠' %}{% endif %}
      {% if post.tags contains 'monitoring' %}{% assign post_icon = '📈' %}{% endif %}
      {% if post.tags contains 'analytics' %}{% assign post_icon = '📋' %}{% endif %}
      
      <div class="post-image">{{ post_icon }}</div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <div class="post-meta">
        {{ post.date | date: "%B %d, %Y" }}
        <span class="reading-time">📖 {{ post.content | number_of_words | divided_by: 200 | plus: 1 }} min read</span>
      </div>
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
</div>

<style>
.posts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin: 2rem 0;
}

.post-meta .reading-time {
  margin-left: 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .posts-container {
    grid-template-columns: 1fr;
  }
  
  .post-meta .reading-time {
    display: block;
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>