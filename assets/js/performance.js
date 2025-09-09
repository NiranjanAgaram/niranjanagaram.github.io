// Performance Optimization & Technical Excellence
document.addEventListener('DOMContentLoaded', function() {
    
    // Lazy Loading Images with WebP Support
    function initLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // WebP support detection
                    const supportsWebP = (function() {
                        const canvas = document.createElement('canvas');
                        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                    })();
                    
                    // Load appropriate format
                    const src = supportsWebP && img.dataset.webp ? img.dataset.webp : img.dataset.src;
                    img.src = src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    // Smooth Scroll with Performance
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    // Intersection Observer for Animations
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.fade-in, .hover-lift');
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    entry.target.classList.add('animate');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        animatedElements.forEach(el => {
            el.style.animationPlayState = 'paused';
            animationObserver.observe(el);
        });
    }
    
    // Service Worker Registration
    function initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }
    
    // Critical CSS Loading
    function loadNonCriticalCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/css/non-critical.css';
        link.media = 'print';
        link.onload = function() {
            this.media = 'all';
        };
        document.head.appendChild(link);
    }
    
    // Performance Monitoring
    function initPerformanceMonitoring() {
        // Core Web Vitals
        if ('web-vital' in window) {
            import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(console.log);
                getFID(console.log);
                getFCP(console.log);
                getLCP(console.log);
                getTTFB(console.log);
            });
        }
        
        // Custom performance metrics
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
            
            // Send to analytics (replace with your analytics)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_load_time', {
                    event_category: 'Performance',
                    event_label: 'Load Time',
                    value: Math.round(loadTime)
                });
            }
        });
    }
    
    // Preload Critical Resources
    function preloadCriticalResources() {
        const criticalResources = [
            '/assets/css/style.css',
            '/assets/js/main.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'script';
            document.head.appendChild(link);
        });
    }
    
    // Initialize all optimizations
    initLazyLoading();
    initSmoothScroll();
    initScrollAnimations();
    initServiceWorker();
    loadNonCriticalCSS();
    initPerformanceMonitoring();
    preloadCriticalResources();
    
    // Add loading states
    document.body.classList.add('loaded');
});

// PWA Installation Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    const installBtn = document.querySelector('.install-pwa');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
            });
        });
    }
});