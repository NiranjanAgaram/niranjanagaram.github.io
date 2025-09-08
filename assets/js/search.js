// Simple search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    // Simple posts data for testing
    const posts = [
        {
            title: "Building an Agentic AI Customer Service System",
            url: "/2024/12/25/agentic-ai-customer-service-automation/",
            excerpt: "How I built a multi-agent customer service system",
            date: "Dec 25, 2024"
        },
        {
            title: "AI-Powered Data Quality Monitoring",
            url: "/2024/12/20/ai-powered-data-quality-monitoring/",
            excerpt: "Discover how AI is revolutionizing data quality monitoring",
            date: "Dec 20, 2024"
        },
        {
            title: "Advanced Kafka Streaming Patterns",
            url: "/2024/12/15/advanced-kafka-streaming-patterns/",
            excerpt: "Explore advanced Apache Kafka streaming patterns",
            date: "Dec 15, 2024"
        }
    ];
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length > 2) {
                const results = posts.filter(post => 
                    post.title.toLowerCase().includes(query) ||
                    post.excerpt.toLowerCase().includes(query)
                );
                
                if (results.length > 0) {
                    searchResults.innerHTML = results.map(post => 
                        `<a href="${post.url}" class="search-result">
                            <h4>${post.title}</h4>
                            <p>${post.excerpt}</p>
                            <small>${post.date}</small>
                        </a>`
                    ).join('');
                    searchResults.style.display = 'block';
                } else {
                    searchResults.innerHTML = '<div class="no-results">No posts found</div>';
                    searchResults.style.display = 'block';
                }
            } else {
                searchResults.style.display = 'none';
            }
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
});