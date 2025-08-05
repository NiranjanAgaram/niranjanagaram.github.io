---
layout: default
title: "Post Archive"
permalink: /archive/
---

# Post Archive

<div class="archive-filters">
  <button class="filter-btn active" data-filter="all">All Posts</button>
  <button class="filter-btn" data-filter="python">Python</button>
  <button class="filter-btn" data-filter="kafka">Kafka</button>
  <button class="filter-btn" data-filter="airflow">Airflow</button>
  <button class="filter-btn" data-filter="ai">AI/ML</button>
</div>

<div class="archive-grid">
  {% for post in site.posts %}
    <div class="archive-item" data-tags="{{ post.tags | join: ' ' | downcase }}">
      <div class="archive-date">{{ post.date | date: "%b %Y" }}</div>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <div class="archive-excerpt">{{ post.excerpt | strip_html | truncatewords: 15 }}</div>
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
.archive-filters {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-btn {
  padding: 0.75rem 1.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 25px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.filter-btn.active,
.filter-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin: 3rem 0;
}

.archive-item {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
}

.archive-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.1);
  border-color: var(--primary);
}

.archive-date {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.archive-item h3 {
  margin: 0.5rem 0 1rem 0;
  font-size: 1.25rem;
}

.archive-item h3 a {
  color: var(--text-primary);
  text-decoration: none;
}

.archive-item h3 a:hover {
  color: var(--primary);
}

.archive-excerpt {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .archive-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const archiveItems = document.querySelectorAll('.archive-item');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      archiveItems.forEach(item => {
        if (filter === 'all') {
          item.style.display = 'block';
        } else {
          const tags = item.dataset.tags;
          if (tags.includes(filter)) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        }
      });
    });
  });
});
</script>