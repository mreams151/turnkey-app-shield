// Main Application JavaScript - Modern Turnkey Software Shield
// Frontend functionality for the landing page and general app features

class TurnkeyShield {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    async init() {
        await this.loadSystemInfo();
        this.setupEventListeners();
        this.startStatsAnimation();
    }

    async loadSystemInfo() {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/info`);
            const info = response.data;
            
            // Update page title with version
            document.title = `${info.name} v${info.version} - Modern Software Protection`;
            
            // Store system info for later use
            this.systemInfo = info;
            
            console.log('Turnkey Software Shield v' + info.version + ' loaded');
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    setupEventListeners() {
        // Add click tracking for navigation links
        document.querySelectorAll('a[href^="/"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                console.log('Navigation:', href);
                
                // Track internal navigation
                this.trackEvent('navigation', { destination: href });
            });
        });

        // Add smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add form enhancements if any forms exist
        document.querySelectorAll('form').forEach(form => {
            this.enhanceForm(form);
        });
    }

    enhanceForm(form) {
        // Add loading states to form submissions
        form.addEventListener('submit', (e) => {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
                
                // Re-enable after 5 seconds as fallback
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
                }, 5000);
            }
        });

        // Add validation styling
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('invalid', (e) => {
                input.classList.add('border-red-500', 'bg-red-50');
            });
            
            input.addEventListener('input', (e) => {
                if (input.checkValidity()) {
                    input.classList.remove('border-red-500', 'bg-red-50');
                    input.classList.add('border-green-500', 'bg-green-50');
                }
            });
        });
    }

    startStatsAnimation() {
        // Animate the stats counters on the homepage
        const statElements = [
            { id: 'stat-response-time', target: '< 100ms', duration: 2000 },
            { id: 'stat-uptime', target: '99.9%', duration: 2500 },
            { id: 'stat-locations', target: '290+', duration: 3000 },
            { id: 'stat-security', target: '100%', duration: 2000 }
        ];

        statElements.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                this.animateCounter(element, stat.target, stat.duration);
            }
        });

        // Update last updated timestamp
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = new Date().toLocaleString();
        }
    }

    animateCounter(element, target, duration) {
        // Extract numeric value if present
        const numericMatch = target.match(/\d+/);
        if (numericMatch) {
            const targetNum = parseInt(numericMatch[0]);
            const prefix = target.substring(0, target.indexOf(numericMatch[0]));
            const suffix = target.substring(target.indexOf(numericMatch[0]) + numericMatch[0].length);
            
            let currentNum = 0;
            const increment = targetNum / (duration / 50);
            
            const timer = setInterval(() => {
                currentNum += increment;
                if (currentNum >= targetNum) {
                    currentNum = targetNum;
                    clearInterval(timer);
                }
                element.textContent = prefix + Math.floor(currentNum) + suffix;
            }, 50);
        }
    }

    // Utility method for API calls
    async apiCall(endpoint, options = {}) {
        try {
            const config = {
                baseURL: this.apiBaseUrl,
                timeout: 10000,
                ...options
            };
            
            const response = await axios(endpoint, config);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error);
            
            let errorMessage = 'An error occurred';
            if (error.response) {
                errorMessage = error.response.data?.message || error.response.statusText;
            } else if (error.request) {
                errorMessage = 'Network error - please check your connection';
            }
            
            return { 
                success: false, 
                error: errorMessage, 
                status: error.response?.status 
            };
        }
    }

    // Event tracking for analytics
    trackEvent(eventName, data = {}) {
        // In a production app, you might send this to analytics services
        console.log('Event tracked:', eventName, data);
        
        // Store in localStorage for basic tracking
        const events = JSON.parse(localStorage.getItem('turnkey_events') || '[]');
        events.push({
            event: eventName,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('turnkey_events', JSON.stringify(events));
    }

    // System status checker
    async checkSystemHealth() {
        const result = await this.apiCall('/health');
        
        if (result.success) {
            this.updateHealthIndicator('healthy', result.data);
        } else {
            this.updateHealthIndicator('unhealthy', result.error);
        }
        
        return result;
    }

    updateHealthIndicator(status, data) {
        // Find health indicators on the page
        const indicators = document.querySelectorAll('[data-health-indicator]');
        
        indicators.forEach(indicator => {
            if (status === 'healthy') {
                indicator.className = indicator.className.replace(/bg-red-\d+/, 'bg-green-500');
                indicator.title = `System healthy - Last check: ${new Date().toLocaleString()}`;
            } else {
                indicator.className = indicator.className.replace(/bg-green-\d+/, 'bg-red-500');
                indicator.title = `System issue detected: ${data}`;
            }
        });
    }

    // Notification system
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md transform transition-transform duration-300 translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-black',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ' ' + colors[type];
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type]} mr-3"></i>
                <span class="flex-1">${message}</span>
                <button class="ml-3 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }, duration);
        }
    }

    // Format utilities
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.TurnkeyShield = new TurnkeyShield();
});

// Add some CSS animations via JavaScript
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.5s ease-in-out;
    }
    
    .animate-slide-up {
        animation: slideUp 0.6s ease-out;
    }
    
    /* Loading spinner enhancement */
    .spinner-border {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        vertical-align: text-bottom;
        border: 0.125em solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spinner-border 0.75s linear infinite;
    }
    
    @keyframes spinner-border {
        to { transform: rotate(360deg); }
    }
    
    /* Form validation styles */
    .invalid-feedback {
        display: block;
        width: 100%;
        margin-top: 0.25rem;
        font-size: 0.875em;
        color: #dc3545;
    }
    
    .was-validated .form-control:invalid {
        border-color: #dc3545;
        background-image: none;
    }
    
    .was-validated .form-control:valid {
        border-color: #28a745;
    }
`;
document.head.appendChild(style);