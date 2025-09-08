// Interactive Pricing Calculator
function updateQuote() {
    const projectType = document.getElementById('project-type')?.value;
    const timeline = document.getElementById('timeline')?.value;
    const companySize = document.getElementById('company-size')?.value;
    
    if (!projectType) return;
    
    let basePrice = 0;
    let description = '';
    
    switch(projectType) {
        case 'strategy':
            basePrice = 500;
            description = 'Strategy Session - 2 hours';
            break;
        case 'mvp':
            basePrice = 11500;
            description = 'MVP Development - 2-4 weeks';
            break;
        case 'enterprise':
            basePrice = 35000;
            description = 'Enterprise Solution - 6-12 weeks';
            break;
    }
    
    let timelineMultiplier = 1;
    if (timeline === 'urgent') timelineMultiplier = 1.2;
    if (timeline === 'flexible') timelineMultiplier = 0.9;
    
    let sizeMultiplier = 1;
    if (companySize === 'medium') sizeMultiplier = 1.15;
    if (companySize === 'enterprise') sizeMultiplier = 1.3;
    
    const finalPrice = Math.round(basePrice * timelineMultiplier * sizeMultiplier);
    
    const priceElement = document.getElementById('quote-price');
    const detailsElement = document.getElementById('quote-details');
    
    if (priceElement) {
        priceElement.textContent = `$${finalPrice.toLocaleString()}`;
    }
    if (detailsElement) {
        detailsElement.textContent = description;
    }
}

// Book consultation function
window.bookConsultation = function() {
    const projectType = document.getElementById('project-type')?.value || 'strategy';
    const price = document.getElementById('quote-price')?.textContent || '$500';
    
    const subject = encodeURIComponent('AI Consultation Request');
    const body = encodeURIComponent(`Hi Niranjan,\n\nI'm interested in booking a consultation for:\n\nProject Type: ${projectType}\nEstimated Cost: ${price}\n\nPlease let me know your availability.\n\nBest regards`);
    
    window.location.href = `mailto:niranjan@example.com?subject=${subject}&body=${body}`;
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for calculator
    ['project-type', 'timeline', 'company-size'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateQuote);
        }
    });
    
    // Initialize quote calculator
    updateQuote();
    
    // Social sharing functions
    window.shareLinkedIn = function(url, title) {
        const text = `Just read this insightful article: "${title}" - Expert analysis on AI and data engineering. ${url}`;
        const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
        window.open(linkedinUrl, '_blank', 'width=600,height=600');
    };
    
    window.shareTwitter = function(url, title) {
        const text = `${title}\n\nExpert insights on AI & Data Engineering by @NiranjanAgaram\n\n${url}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    };
    
    window.copyLink = function(url) {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    };
    
    // Lead form handling
    const leadForm = document.querySelector('.lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            
            // Simple success message (integrate with your email service)
            const button = e.target.querySelector('button');
            const originalText = button.textContent;
            button.textContent = 'Sending Playbook...';
            button.disabled = true;
            
            setTimeout(() => {
                button.textContent = 'Check Your Email!';
                button.style.background = '#10b981';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.disabled = false;
                    e.target.reset();
                }, 3000);
            }, 1000);
        });
    }
    
    // Newsletter form handling
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const button = e.target.querySelector('button');
            const originalText = button.textContent;
            button.textContent = 'Subscribed!';
            button.style.background = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = 'white';
                e.target.reset();
            }, 2000);
        });
    }
    
    // Parallax scrolling and advanced animations
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // Subtle parallax for background orbs
        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        
        if (orb1) orb1.style.transform = `translateY(${scrollY * 0.3}px) rotate(${scrollY * 0.1}deg)`;
        if (orb2) orb2.style.transform = `translateY(${scrollY * -0.2}px) rotate(${scrollY * -0.1}deg)`;
        
        // Parallax for hero visual
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual && scrollY < window.innerHeight) {
            heroVisual.style.transform = `translateY(${scrollY * 0.1}px)`;
        }
        
        // Fade in animations on scroll
        const cards = document.querySelectorAll('.service-card, .case-study, .insight-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
        });
    });
    
    // Initialize cards for fade-in animation
    const cards = document.querySelectorAll('.service-card, .case-study, .insight-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    

    
    // Smooth scrolling for anchor links
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
    
    // WhatsApp Chat Widget
    const whatsappChat = document.getElementById('whatsapp-chat');
    if (whatsappChat) {
        whatsappChat.addEventListener('click', function() {
            const phoneNumber = '919066612306'; // Niranjan's WhatsApp number
            const message = encodeURIComponent('Hi Niranjan! I found your website and I\'m interested in discussing an AI project. Can we chat?');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }
    
    // Contact form handling
    const inquiryForm = document.querySelector('.inquiry-form');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = e.target.querySelector('input[name="name"]').value;
            const submitBtn = e.target.querySelector('.submit-btn');
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Submit form data to Netlify
            fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(e.target)).toString()
            })
            .then(() => {
                // Show success popup
                showSuccessPopup(name);
                // Reset form
                e.target.reset();
            })
            .catch((error) => {
                alert('Error sending message. Please try again or email directly.');
            })
            .finally(() => {
                submitBtn.textContent = 'Get Custom Proposal';
                submitBtn.disabled = false;
            });
        });
    }
    
    // Success popup function
    function showSuccessPopup(name) {
        const popup = document.createElement('div');
        popup.className = 'success-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-icon">🎉</div>
                <h3>Thank You, ${name}!</h3>
                <p>Your inquiry has been received. Here's what happens next:</p>
                <ul class="next-steps">
                    <li>✅ Custom proposal within 24 hours</li>
                    <li>✅ Free 15-minute strategy call</li>
                    <li>✅ ROI analysis for your project</li>
                </ul>
                <div class="popup-stats">
                    <div class="popup-stat">
                        <strong>85%</strong>
                        <span>Faster Response Times</span>
                    </div>
                    <div class="popup-stat">
                        <strong>$485K+</strong>
                        <span>Average Annual Savings</span>
                    </div>
                </div>
                <button class="popup-close" onclick="closeSuccessPopup()">Continue</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Auto close after 8 seconds
        setTimeout(() => {
            closeSuccessPopup();
        }, 8000);
    }
    
    // Close popup function
    window.closeSuccessPopup = function() {
        const popup = document.querySelector('.success-popup');
        if (popup) {
            popup.remove();
        }
    }
});