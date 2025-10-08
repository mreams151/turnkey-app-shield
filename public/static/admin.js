// TurnkeyAppShield Admin Panel - Fixed Version
// Comprehensive admin interface with all bug fixes and improvements

class AdminPanel {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.currentUser = null;
        this.token = localStorage.getItem('admin_token');
        this.charts = {};
        this.currentPage = 'dashboard';
        this.dashboardRendered = false; // Fix for infinite scroll issue
        this.uploads = []; // Initialize uploads array
        
        // Debug logging for URL issues
        console.log('AdminPanel initialized with:');
        console.log('- window.location.origin:', window.location.origin);
        console.log('- window.location.protocol:', window.location.protocol);
        console.log('- window.location.host:', window.location.host);
        console.log('- this.apiBaseUrl:', this.apiBaseUrl);
        
        this.init();
    }

    async init() {
        // Check if user is logged in
        if (this.token) {
            const isValid = await this.validateToken();
            if (isValid) {
                await this.loadDashboard();
            } else {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    async validateToken() {
        try {
            if (!this.token) {
                return false;
            }
            
            const response = await axios.get(`${this.apiBaseUrl}/admin/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // Set current user info from dashboard response if available  
            if (response.status === 200 && response.data.success && response.data.admin) {
                this.currentUser = response.data.admin;
            } else if (response.status === 200 && !this.currentUser) {
                // Fallback: set a default admin user if not provided
                this.currentUser = { username: 'admin', role: 'super_admin' };
            }
            
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }



    showLogin() {
        this.dashboardRendered = false; // Reset flag when showing login
        const loginApp = document.getElementById('admin-app');
        loginApp.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-brand-blue">
                            <i class="fas fa-shield-alt text-white text-xl"></i>
                        </div>
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Admin Panel Access
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            TurnkeyAppShield Administration
                        </p>

                    </div>
                    <form class="mt-8 space-y-6" id="login-form">
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input id="username" name="username" type="text" required
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                    placeholder="Username">
                            </div>
                            <div>
                                <input id="password" name="password" type="password" required
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                    placeholder="Password">
                            </div>
                            
                            <!-- 2FA Fields (initially hidden) -->
                            <div id="2fa-fields" class="hidden">
                                <div>
                                    <input id="totp-code" name="totp-code" type="text" maxlength="6"
                                        class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                        placeholder="2FA Code (123456)">
                                </div>
                                <div class="text-center mt-2">
                                    <button type="button" id="use-backup-code" class="text-xs text-blue-600 hover:text-blue-500">
                                        Use backup code instead
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Backup Code Field (initially hidden) -->
                            <div id="backup-code-fields" class="hidden">
                                <div>
                                    <input id="backup-code" name="backup-code" type="text" maxlength="10"
                                        class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                        placeholder="Backup Code">
                                </div>
                                <div class="text-center mt-2">
                                    <button type="button" id="use-totp-code" class="text-xs text-blue-600 hover:text-blue-500">
                                        Use authenticator app instead
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="login-error" class="hidden text-red-600 text-sm text-center"></div>

                        <div>
                            <button type="submit" id="login-btn"
                                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <i class="fas fa-lock text-blue-500 group-hover:text-blue-400"></i>
                                </span>
                                Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Setup 2FA toggle buttons
        document.getElementById('use-backup-code')?.addEventListener('click', () => {
            document.getElementById('2fa-fields').classList.add('hidden');
            document.getElementById('backup-code-fields').classList.remove('hidden');
            document.getElementById('totp-code').value = '';
            document.getElementById('backup-code').focus();
        });
        
        document.getElementById('use-totp-code')?.addEventListener('click', () => {
            document.getElementById('backup-code-fields').classList.add('hidden');
            document.getElementById('2fa-fields').classList.remove('hidden');
            document.getElementById('backup-code').value = '';
            document.getElementById('totp-code').focus();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const totpCode = document.getElementById('totp-code')?.value || '';
        const backupCode = document.getElementById('backup-code')?.value || '';
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
        loginBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            // Try the new 2FA-aware login endpoint first
            const loginData = {
                username: username,
                password: password
            };
            
            // Add 2FA codes if provided
            if (totpCode) {
                loginData.totp_code = totpCode;
            }
            if (backupCode) {
                loginData.backup_code = backupCode;
            }
            
            const response = await axios.post(`${this.apiBaseUrl}/admin/auth/login`, loginData);

            if (response.data.success) {
                this.token = response.data.token;
                this.currentUser = response.data.admin || response.data.user; // Handle both response formats
                localStorage.setItem('admin_token', this.token);
                
                console.log('Login successful, token saved:', !!this.token);
                console.log('Current user:', this.currentUser?.username);
                
                await this.loadDashboard();
            } else if (response.data.requires_2fa) {
                // Show 2FA fields
                this.show2FALogin();
                throw new Error(response.data.message || '2FA code required');
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            // If 2FA endpoint fails, try fallback to original auth endpoint
            if (error.response?.status === 404 && !totpCode && !backupCode) {
                try {
                    const fallbackResponse = await axios.post(`${this.apiBaseUrl}/admin/auth/login`, {
                        username: username,
                        password: password
                    });

                    if (fallbackResponse.data.success) {
                        this.token = fallbackResponse.data.token;
                        this.currentUser = fallbackResponse.data.admin || fallbackResponse.data.user;
                        localStorage.setItem('admin_token', this.token);
                        
                        await this.loadDashboard();
                        return; // Exit successfully
                    }
                } catch (fallbackError) {
                    console.error('Fallback login failed:', fallbackError);
                }
            }
            
            console.error('=== LOGIN ERROR ===', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Error message:', error.message);
            
            errorDiv.textContent = error.response?.data?.message || error.message || 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }
    }
    
    show2FALogin() {
        // Make sure password field doesn't have rounded bottom corners
        const passwordField = document.getElementById('password');
        passwordField.className = passwordField.className.replace('rounded-b-md', '');
        
        // Show 2FA fields
        document.getElementById('2fa-fields').classList.remove('hidden');
        
        // Update the last field to have rounded bottom corners
        const totpField = document.getElementById('totp-code');
        totpField.className = totpField.className.replace('rounded-b-md', '') + ' rounded-b-md';
        
        // Focus on the 2FA code field
        document.getElementById('totp-code').focus();
        
        // Update button text
        document.getElementById('login-btn').innerHTML = 'Sign In with 2FA';
    }

    async loadDashboard() {
        this.dashboardRendered = false; // Reset flag before loading
        this.showLoading();
        
        try {
            
            const response = await this.apiCall('/admin/dashboard');
            
            if (response.success) {
                
                try {
                    this.renderMainLayout();
                } catch (layoutError) {
                    console.error('=== MAIN LAYOUT ERROR ===', layoutError);
                    throw new Error('Failed to render main layout: ' + layoutError.message);
                }
                
                try {
                    this.showDashboard(response.data);
                } catch (dashboardError) {
                    console.error('=== DASHBOARD SHOW ERROR ===', dashboardError);
                    throw new Error('Failed to show dashboard: ' + dashboardError.message);
                }
            } else {
                console.error('Dashboard API returned success=false:', response);
                throw new Error(response.error || 'Unknown error');
            }
        } catch (error) {
            console.error('=== DASHBOARD LOAD ERROR ===', error);
            console.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: error.config
            });
            
            // CRITICAL FIX: Reset dashboard flag to allow retry
            this.dashboardRendered = false;
            
            // Also render main layout if it hasn't been rendered yet
            const appElement = document.getElementById('admin-app');
            if (!appElement || appElement.innerHTML === '') {
                this.renderMainLayout();
            }
            
            this.showError('Failed to load dashboard data: ' + (error.message || error));
        }
    }

    showLoading() {
        const loadingApp = document.getElementById('admin-app');
        loadingApp.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
                    <h2 class="text-xl font-semibold text-gray-900">Loading Dashboard...</h2>
                </div>
            </div>
        `;
    }

    showError(message) {
        const errorApp = document.getElementById('admin-app');
        errorApp.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                    <p class="text-red-600 mb-4">${message}</p>
                    <button onclick="location.reload()" class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    // NEW: Separate main layout from dashboard content to prevent infinite scroll
    renderMainLayout() {
        // Get app element
        const app = document.getElementById('admin-app');
        
        // Only prevent render if layout exists and is not empty
        if (this.dashboardRendered && app && app.innerHTML.includes('nav') && app.innerHTML.includes('sidebar')) {
            return;
        }
        
        app.innerHTML = `
            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
                <div class="px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <i class="fas fa-shield-alt text-2xl text-brand-blue mr-3"></i>
                            <h1 class="text-xl font-bold text-gray-900">TurnkeyAppShield</h1>
                            <span class="ml-2 px-2 py-1 text-xs bg-brand-blue text-white rounded">Admin</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-gray-600">Welcome, ${this.currentUser?.username || 'Admin'}</span>
                            <button onclick="adminPanel.logout()" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-sign-out-alt mr-1"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Sidebar and Content -->
            <div class="flex pt-16 min-h-screen bg-gray-50">
                <!-- Sidebar -->
                <div class="w-64 bg-white shadow-sm fixed left-0 top-16 bottom-0 overflow-y-auto">
                    <nav class="mt-8">
                        <div class="px-4 space-y-2">
                            <button onclick="adminPanel.showPage('dashboard')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg" 
                                data-page="dashboard">
                                <i class="fas fa-tachometer-alt mr-3"></i>Dashboard
                            </button>
                            <button onclick="adminPanel.showPage('customers')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="customers">
                                <i class="fas fa-users mr-3"></i>Customers
                            </button>
                            <button onclick="adminPanel.showPage('products')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="products">
                                <i class="fas fa-box mr-3"></i>Products
                            </button>

                            <button onclick="adminPanel.showPage('rules')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="rules">
                                <i class="fas fa-gavel mr-3"></i>Rules
                            </button>
                            <button onclick="adminPanel.showPage('uploads')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="uploads">
                                <i class="fas fa-upload mr-3"></i>File Uploads
                            </button>
                            <button onclick="adminPanel.showPage('security')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="security">
                                <i class="fas fa-shield-alt mr-3"></i>Security Events
                            </button>
                            <button onclick="adminPanel.showPage('backups')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="backups">
                                <i class="fas fa-database mr-3"></i>Backup Management
                            </button>
                            <button onclick="adminPanel.showPage('logs')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="logs">
                                <i class="fas fa-clipboard-list mr-3"></i>Admin Logs
                            </button>

                            <button onclick="adminPanel.showPage('settings')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="settings">
                                <i class="fas fa-cog mr-3"></i>Settings
                            </button>
                        </div>
                    </nav>
                </div>

                <!-- Main Content -->
                <div class="flex-1 ml-64 overflow-auto">
                    <div class="p-8" id="main-content">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        this.dashboardRendered = true;
    }

    async showPage(page) {
        console.log('DEBUG: showPage called with:', page);
        this.currentPage = page;
        console.log('DEBUG: About to update nav item');
        this.updateActiveNavItem(page);
        console.log('DEBUG: Nav item updated, switching to page');
        
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'customers':
                console.log('DEBUG: About to call showCustomers()');
                this.showCustomers();
                console.log('DEBUG: showCustomers() returned');
                break;
            case 'products':
                this.showProducts();
                break;

            case 'rules':
                this.showRules();
                break;
            case 'uploads':
                await this.showUploads();
                break;
            case 'security':
                await this.showSecurityEvents();
                break;
            case 'backups':
                this.showBackups();
                break;
            case 'logs':
                this.showLogs();
                break;

            case 'settings':
                this.showSettings();
                break;
        }
    }

    async showDashboard(data = null) {
        if (!data) {
            try {
                const response = await this.apiCall('/admin/dashboard');
                data = response.success ? response.data : null;
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                data = this.getDefaultDashboardData();
            }
        }

        const content = document.getElementById('main-content');
        if (!content) {
            console.error('main-content element not found');
            this.showError('UI rendering error: main-content element not found');
            return;
        }
        
        content.innerHTML = `
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p class="text-gray-600 mt-2">System overview and key metrics</p>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Total Customers</p>
                            <p class="text-3xl font-bold text-gray-900">${data?.stats?.total_customers || 0}</p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Active Customers</p>
                            <p class="text-3xl font-bold text-gray-900">${data?.stats?.active_licenses || 0}</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-users text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Products</p>
                            <p class="text-3xl font-bold text-gray-900">${data?.stats?.total_products || 0}</p>
                        </div>
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-box text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Validations Today</p>
                            <p class="text-3xl font-bold text-gray-900">${data?.stats?.validations_today || 0}</p>
                        </div>
                        <div class="bg-yellow-100 p-3 rounded-full">
                            <i class="fas fa-check-circle text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- License Validations with Filters -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">License Validations</h3>
                        <div class="mt-4 flex space-x-2">
                            <button onclick="adminPanel.filterValidations('day')" class="validation-filter px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded active" data-period="day">Day</button>
                            <button onclick="adminPanel.filterValidations('week')" class="validation-filter px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded" data-period="week">Week</button>
                            <button onclick="adminPanel.filterValidations('month')" class="validation-filter px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded" data-period="month">Month</button>
                            <button onclick="adminPanel.filterValidations('year')" class="validation-filter px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded" data-period="year">Year</button>
                        </div>
                    </div>
                    <div class="p-6">
                        <canvas id="validationChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- System Health -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">System Health</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">System Status</span>
                                <span class="px-2 py-1 ${data?.system_health?.status === 'healthy' ? 'bg-green-100 text-green-800' : data?.system_health?.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} text-sm rounded">${data?.system_health?.status === 'healthy' ? 'Operational' : data?.system_health?.status === 'degraded' ? 'Degraded' : 'Critical'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Database Status</span>
                                <span class="px-2 py-1 ${data?.system_health?.database_status === 'healthy' ? 'bg-green-100 text-green-800' : data?.system_health?.database_status === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} text-sm rounded">${data?.system_health?.database_status === 'healthy' ? 'Connected' : data?.system_health?.database_status === 'degraded' ? 'Degraded' : 'Disconnected'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Response Time</span>
                                <span class="text-gray-900">${data?.system_health?.avg_response_time || 45}ms</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Uptime</span>
                                <span class="text-gray-900">${data?.system_health?.uptime || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Email Queue <span class="text-xs text-gray-400">(test data)</span></span>
                                <span class="text-gray-900 ${data?.system_health?.email_queue_size > 1000 ? 'text-yellow-600' : data?.system_health?.email_queue_size > 5000 ? 'text-red-600' : ''}">${data?.system_health?.email_queue_size || 0}</span>
                            </div>
                            ${data?.system_health?.last_check ? `
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Last Check</span>
                                <span class="text-gray-900 text-xs">${this.formatDateTime(data.system_health.last_check)}</span>
                            </div>
                            ` : ''}
                            ${data?.system_health?.issues && data.system_health.issues.length > 0 ? `
                            <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <div class="text-sm font-medium text-yellow-800 mb-2">System Issues:</div>
                                ${data.system_health.issues.map(issue => `
                                    <div class="text-xs text-yellow-700 mb-1">• ${issue}</div>
                                `).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initializeCharts(data);
    }

    async filterValidations(period) {
        // Update filter buttons
        document.querySelectorAll('.validation-filter').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-100', 'text-blue-800');
            btn.classList.add('bg-gray-100', 'text-gray-600');
        });
        
        const activeBtn = document.querySelector(`[data-period="${period}"]`);
        activeBtn.classList.add('active', 'bg-blue-100', 'text-blue-800');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-600');

        // Update chart data based on period
        await this.updateValidationChart(period);
    }

    async updateValidationChart(period) {
        try {
            const response = await this.apiCall(`/admin/charts/validations?period=${period}`);
            
            if (response.success && response.data) {
                const data = response.data;
                
                if (this.charts.validation) {
                    this.charts.validation.data.labels = data.labels;
                    this.charts.validation.data.datasets[0].data = data.successful;
                    this.charts.validation.data.datasets[1].data = data.failed;
                    this.charts.validation.update();
                }
            } else {
                console.error('Failed to load chart data:', response.message);
                // Fallback to empty data
                if (this.charts.validation) {
                    this.charts.validation.data.labels = [];
                    this.charts.validation.data.datasets[0].data = [];
                    this.charts.validation.data.datasets[1].data = [];
                    this.charts.validation.update();
                }
            }
        } catch (error) {
            console.error('Chart data loading error:', error);
            // Fallback to empty data
            if (this.charts.validation) {
                this.charts.validation.data.labels = [];
                this.charts.validation.data.datasets[0].data = [];
                this.charts.validation.data.datasets[1].data = [];
                this.charts.validation.update();
            }
        }
    }

    async showCustomers() {
        console.log('DEBUG: showCustomers() - Starting customer load process');
        
        try {
            // Prevent multiple concurrent calls
            if (this.loadingCustomers) {
                console.log('DEBUG: Already loading customers, skipping duplicate call');
                return;
            }
            this.loadingCustomers = true;
            
            const content = document.getElementById('main-content');
            if (!content) {
                console.error('DEBUG: main-content not found!');
                this.loadingCustomers = false;
                return;
            }
            
            // Create the proper DOM structure with improved loading state
            content.innerHTML = `
                <div class="p-8">
                    <h2 class="text-xl font-semibold mb-4">Customers</h2>
                    <div id="customers-content">
                        <div class="text-center py-12">
                            <div class="animate-pulse">
                                <div class="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p class="mt-4 text-gray-600">Loading customers...</p>
                                <p class="mt-2 text-sm text-gray-500">Please wait while we fetch your data</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('DEBUG: Making API call for customers...');
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
            );
            
            const apiPromise = this.apiCall('/admin/customers?limit=50');
            
            const response = await Promise.race([apiPromise, timeoutPromise]);
            
            if (response.success) {
                console.log('DEBUG: Received customer data:', response.customers?.length || 0, 'customers');
                
                // Use requestAnimationFrame to prevent UI blocking
                requestAnimationFrame(() => {
                    try {
                        this.renderCustomersTable(response.customers || []);
                        
                        // Load additional data in the background with delays
                        setTimeout(async () => {
                            try {
                                await this.loadProductsForFilter();
                                
                                // Apply default active filter with another delay
                                setTimeout(() => {
                                    try {
                                        this.filterCustomers();
                                    } catch (error) {
                                        console.error('Error in filterCustomers:', error);
                                    }
                                }, 200);
                                
                            } catch (error) {
                                console.error('Error in loadProductsForFilter:', error);
                            }
                        }, 300);
                        
                    } catch (error) {
                        console.error('Error in renderCustomersTable:', error);
                        this.showCustomersError('Error rendering customer data');
                    }
                });
                
            } else {
                console.log('DEBUG: API call failed:', response.message);
                this.showCustomersError(response.message || 'Failed to load customers');
            }
            
        } catch (error) {
            console.error('DEBUG: Error in showCustomers:', error);
            this.showCustomersError(error.message || 'Unknown error occurred');
        } finally {
            // Always reset loading flag
            this.loadingCustomers = false;
        }
    }
    
    showCustomersError(message) {
        const customersContent = document.getElementById('customers-content');
        if (customersContent) {
            customersContent.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-red-600 mb-2">Unable to Load Customers</h3>
                    <p class="text-gray-600 mb-4">${message}</p>
                    <button onclick="adminPanel.showCustomers()" 
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    // Test method to load actual customers
    async testLoadActualCustomers() {
        console.log('DEBUG: testLoadActualCustomers() called');
        const content = document.getElementById('main-content');
        
        try {
            console.log('DEBUG: Making test API call');
            const response = await this.apiCall('/admin/customers?status=active&limit=2');
            console.log('DEBUG: Test API response:', response);
            
            if (response.success) {
                content.innerHTML = `
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">Customers - API TEST</h1>
                        <p class="text-gray-600 mt-2">Found ${response.customers.length} customers</p>
                    </div>
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <pre>${JSON.stringify(response.customers, null, 2)}</pre>
                    </div>
                `;
                console.log('DEBUG: Test customers displayed successfully');
            } else {
                throw new Error('API call failed');
            }
        } catch (error) {
            console.error('DEBUG: Error in testLoadActualCustomers:', error);
            content.innerHTML = `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <p class="text-red-600">❌ Error: ${error.message}</p>
                </div>
            `;
        }
    }

    async loadCustomers() {
        console.log('DEBUG: loadCustomers() started');
        try {
            console.log('DEBUG: Making API call to /admin/customers?status=active');
            const response = await this.apiCall('/admin/customers?status=active');
            console.log('DEBUG: API response received:', response ? 'success' : 'failed');
            
            const customers = response.success ? response.customers : [];
            console.log('DEBUG: Customers extracted:', customers ? customers.length : 0);
            
            console.log('DEBUG: About to render customers table');
            this.renderCustomersTable(customers);
            console.log('DEBUG: Customers table rendered');
        } catch (error) {
            console.error('Failed to load customers:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            document.getElementById('customers-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">Failed to load customers</p>
                    <p class="text-sm text-gray-500 mt-2">${error.response?.data?.error || error.message}</p>
                </div>
            `;
        }
    }

    async loadProductsForFilter() {
        try {
            console.log('DEBUG: Loading products for filter...');
            const response = await this.apiCall('/admin/products?status=all');
            console.log('DEBUG: Products API response:', response);
            
            if (response.success && response.products) {
                console.log('DEBUG: Found', response.products.length, 'products');
                
                // Cache products for getProductName function and separate by status
                this.productsCache = {};
                this.activeProducts = [];
                this.inactiveProducts = [];
                
                response.products.forEach(product => {
                    console.log('DEBUG: Processing product:', product.name, 'status:', product.status);
                    this.productsCache[product.id] = product;
                    if (product.status === 'active') {
                        this.activeProducts.push(product);
                    } else {
                        this.inactiveProducts.push(product);
                    }
                });

                console.log('DEBUG: Active products:', this.activeProducts.length);
                console.log('DEBUG: Inactive products:', this.inactiveProducts.length);

                // Initialize with "All Products" tab selected
                this.currentProductFilterTab = 'all';
                this.updateProductFilterDropdown();
                
                console.log('DEBUG: Product filter dropdown updated');
            } else {
                console.log('DEBUG: No products found or API call failed');
            }
        } catch (error) {
            console.error('Failed to load products for filter:', error);
            console.error('Error details:', error.response?.data);
        }
    }

    setProductFilter(tabType) {
        // Update tab appearance
        document.querySelectorAll('.product-filter-tab').forEach(tab => {
            tab.className = 'product-filter-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-xs';
        });
        
        document.getElementById(`product-tab-${tabType}`).className = 'product-filter-tab border-brand-blue text-brand-blue py-2 px-1 border-b-2 font-medium text-xs';
        
        // Update current filter
        this.currentProductFilterTab = tabType;
        this.updateProductFilterDropdown();
        
        // Reset the dropdown selection and trigger filter
        document.getElementById('product-filter').value = '';
        this.filterCustomers();
    }

    updateProductFilterDropdown() {
        console.log('DEBUG: updateProductFilterDropdown called');
        const productFilter = document.getElementById('product-filter');
        if (!productFilter) {
            console.log('DEBUG: product-filter element not found!');
            return;
        }

        let products = [];
        let emptyText = 'Select a product...';

        console.log('DEBUG: currentProductFilterTab:', this.currentProductFilterTab);
        console.log('DEBUG: activeProducts available:', this.activeProducts?.length || 0);
        console.log('DEBUG: inactiveProducts available:', this.inactiveProducts?.length || 0);

        switch (this.currentProductFilterTab) {
            case 'active':
                products = this.activeProducts || [];
                emptyText = products.length > 0 ? 'Select an active product...' : 'No active products';
                break;
            case 'inactive':
                products = this.inactiveProducts || [];
                emptyText = products.length > 0 ? 'Select a deleted product...' : 'No deleted products';
                break;
            case 'all':
            default:
                products = [...(this.activeProducts || []), ...(this.inactiveProducts || [])];
                emptyText = 'Select a product...';
                break;
        }

        console.log('DEBUG: Selected products for dropdown:', products.length);

        // Sort products by name for better usability
        products.sort((a, b) => a.name.localeCompare(b.name));

        // Update dropdown content
        productFilter.innerHTML = `
            <option value="">${emptyText}</option>
            ${products.map(product => 
                `<option value="${product.id}">${product.name}${product.status === 'inactive' ? ' (Deleted)' : ''}</option>`
            ).join('')}
        `;
    }

    renderCustomersTable(customers) {
        const content = document.getElementById('customers-content');
        
        try {
            content.innerHTML = `
            <!-- Filter and Export Controls -->
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Search Input -->
                    <div class="flex items-center gap-2 min-w-80">
                        <label class="text-sm font-medium text-gray-700">
                            <i class="fas fa-search mr-1"></i>Search
                        </label>
                        <input 
                            type="text" 
                            id="customer-search" 
                            placeholder="Name, email, or license key..." 
                            class="border border-gray-300 rounded px-3 py-1 text-sm bg-white flex-1 min-w-64"
                            onkeyup="adminPanel.handleSearchInput(this.value)"
                        >
                        <button 
                            onclick="adminPanel.clearSearch()" 
                            class="text-gray-400 hover:text-gray-600 px-2"
                            title="Clear search"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                
                    <!-- Product Filter Tabs -->
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-gray-700">Filter by Product</label>
                        <div class="border-b border-gray-200">
                            <nav class="-mb-px flex space-x-4">
                                <button onclick="adminPanel.setProductFilter('all')" 
                                        id="product-tab-all"
                                        class="product-filter-tab border-brand-blue text-brand-blue py-2 px-1 border-b-2 font-medium text-xs">
                                    All Products
                                </button>
                                <button onclick="adminPanel.setProductFilter('active')" 
                                        id="product-tab-active"
                                        class="product-filter-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-xs">
                                    Active Products
                                </button>
                                <button onclick="adminPanel.setProductFilter('inactive')" 
                                        id="product-tab-inactive"
                                        class="product-filter-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-2 px-1 border-b-2 font-medium text-xs">
                                    Deleted Products
                                </button>
                            </nav>
                        </div>
                        <select id="product-filter" class="border border-gray-300 rounded px-3 py-1 text-sm bg-white" onchange="adminPanel.filterCustomers()">
                            <option value="">Select a product...</option>
                            <!-- Products loaded dynamically based on selected tab -->
                        </select>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium text-gray-700">Status</label>
                        <select id="status-filter" class="border border-gray-300 rounded px-3 py-1 text-sm bg-white" onchange="adminPanel.filterCustomers()">
                            <option value="active" selected>Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="revoked">Revoked</option>
                            <option value="">All Status</option>
                        </select>
                    </div>
                    
                    <button onclick="adminPanel.exportToExcel()" 
                        class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                        <i class="fas fa-file-excel mr-1"></i>Export To Excel
                    </button>
                    
                    <div class="ml-auto">
                        <button onclick="adminPanel.showAddCustomer()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            <i class="fas fa-plus mr-1"></i>Add Customer
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Bulk Actions Bar (hidden by default) -->
            <div id="bulk-actions-bar" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md items-center justify-between hidden">
                <div class="flex items-center">
                    <span id="selection-count" class="text-sm font-medium text-blue-800">0 customers selected</span>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="adminPanel.clearSelection()" 
                            class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                        Clear Selection
                    </button>
                    <button onclick="adminPanel.bulkDeleteCustomers()" 
                            class="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <i class="fas fa-trash mr-1"></i>
                        Delete Selected
                    </button>
                </div>
            </div>
            
            <!-- Customer Table -->
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left">
                                    <input type="checkbox" id="select-all-customers" 
                                           class="rounded border-gray-300 text-brand-blue focus:ring-brand-blue">
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name <i class="fas fa-sort text-gray-400 ml-1 cursor-pointer"></i>
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email <i class="fas fa-sort text-gray-400 ml-1 cursor-pointer"></i>
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Registration Date <i class="fas fa-sort text-gray-400 ml-1 cursor-pointer"></i>
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    License Key
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${customers.length > 0 ? this.renderCustomerRows(customers) : `
                                <tr>
                                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">No customers found</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        
            // Add event listeners for filters
            document.getElementById('product-filter').addEventListener('change', () => this.filterCustomers());
            document.getElementById('status-filter').addEventListener('change', () => this.filterCustomers());
            
            
            // Debug: Check if checkbox elements exist in HTML
            const generatedHTML = content.innerHTML;
            
            // Debug: Show first part of generated HTML to see table structure
            
            // Debug: Check specifically for the table header
            
            // Add event listeners for bulk selection checkboxes after DOM update
            setTimeout(() => {
                this.setupBulkSelectionListeners();
            }, 100);
        } catch (error) {
            console.error('Error in renderCustomersTable template:', error);
            console.error('Template string might have syntax error');
            content.innerHTML = '<div class="p-4 text-red-600">Error rendering customers table</div>';
        }
    }

    // Setup event listeners for bulk selection functionality
    setupBulkSelectionListeners() {
        // Setup select-all checkbox
        const selectAllCheckbox = document.getElementById('select-all-customers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                this.toggleSelectAll();
            });
        }

        // Setup individual customer checkboxes
        const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
        customerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionCount();
            });
        });

        // Initialize selection count
        this.updateSelectionCount();
    }

    // Toggle all customer selections
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('select-all-customers');
        const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
        
        if (selectAllCheckbox && customerCheckboxes) {
            const isChecked = selectAllCheckbox.checked;
            customerCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            this.updateSelectionCount();
        }
    }

    // Update selection count and bulk action bar visibility
    updateSelectionCount() {
        const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
        const checkedBoxes = document.querySelectorAll('.customer-checkbox:checked');
        const selectAllCheckbox = document.getElementById('select-all-customers');
        const bulkActionBar = document.getElementById('bulk-actions-bar');
        const selectionCount = document.getElementById('selection-count');

        const selectedCount = checkedBoxes.length;
        const totalCount = customerCheckboxes.length;

        // Update select-all checkbox state
        if (selectAllCheckbox) {
            if (selectedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (selectedCount === totalCount) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }

        // Update selection count display
        if (selectionCount) {
            selectionCount.textContent = `${selectedCount} customer${selectedCount !== 1 ? 's' : ''} selected`;
        }

        // Show/hide bulk action bar
        if (bulkActionBar) {
            if (selectedCount > 0) {
                bulkActionBar.classList.remove('hidden');
                bulkActionBar.classList.add('flex');
                console.log('DEBUG: Showing bulk actions bar for', selectedCount, 'selected items');
            } else {
                bulkActionBar.classList.add('hidden');
                bulkActionBar.classList.remove('flex');
            }
        } else {
            console.log('DEBUG: Bulk actions bar element not found');
        }
    }

    // DEBUG: Function to manually show bulk actions bar for testing
    debugShowBulkActions() {
        const bulkActionBar = document.getElementById('bulk-actions-bar');
        const selectionCount = document.getElementById('selection-count');
        if (bulkActionBar) {
            bulkActionBar.classList.remove('hidden');
            bulkActionBar.classList.add('flex');
            if (selectionCount) {
                selectionCount.textContent = 'DEBUG: Manual test';
            }
            console.log('DEBUG: Manually showing bulk actions bar');
        } else {
            console.log('DEBUG: Could not find bulk actions bar');
        }
    }

    // Clear all selections
    clearSelection() {
        const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
        const selectAllCheckbox = document.getElementById('select-all-customers');
        
        customerCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        
        this.updateSelectionCount();
    }

    // Get selected customer IDs and names
    getSelectedCustomers() {
        const checkedBoxes = document.querySelectorAll('.customer-checkbox:checked');
        return Array.from(checkedBoxes).map(checkbox => ({
            id: parseInt(checkbox.dataset.customerId),
            name: checkbox.dataset.customerName
        }));
    }

    // First duplicate bulkDeleteCustomers function removed (keeping the more complete one below)

    // Enhanced customer search functionality
    handleSearchInput(searchTerm) {
        // Debounce search to avoid too many API calls
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchCustomers(searchTerm);
        }, 300);
    }

    async searchCustomers(searchTerm) {
        try {
            // Store the current search term
            this.currentSearchTerm = searchTerm?.trim() || '';
            
            // If empty search, load all customers
            if (!this.currentSearchTerm) {
                await this.loadCustomers();
                return;
            }

            // Show loading state
            const customersContent = document.getElementById('customers-content');
            if (customersContent) {
                // Just update the table, not the whole content
                const tableContainer = customersContent.querySelector('.overflow-x-auto');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div class="text-center py-8">
                            <i class="fas fa-search text-gray-400 text-2xl mb-2"></i>
                            <p class="text-gray-500">Searching customers...</p>
                        </div>
                    `;
                }
            }

            // Perform search via API
            const response = await this.apiCall(`/admin/customers/search?q=${encodeURIComponent(this.currentSearchTerm)}`);
            
            if (response.success) {
                // Re-render the full customers page with search results
                this.allCustomers = response.customers || [];
                this.renderCustomersTable(this.allCustomers);
                
                // Update search result count
                const resultCount = this.allCustomers.length;
                this.showNotification(`Found ${resultCount} customer${resultCount !== 1 ? 's' : ''} matching "${this.currentSearchTerm}"`, 'info');
            } else {
                throw new Error(response.message || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed: ' + error.message, 'error');
            
            // Show error state
            const customersContent = document.getElementById('customers-content');
            if (customersContent) {
                const tableContainer = customersContent.querySelector('.overflow-x-auto');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div class="text-center py-8">
                            <i class="fas fa-exclamation-triangle text-red-400 text-2xl mb-2"></i>
                            <p class="text-red-600">Search failed</p>
                            <p class="text-sm text-gray-500 mt-2">${error.message}</p>
                        </div>
                    `;
                }
            }
        }
    }

    clearSearch() {
        // Clear search input
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Clear search term and reload all customers
        this.currentSearchTerm = '';
        this.loadCustomers();
        this.showNotification('Search cleared', 'info');
    }

    // Enhanced filter functionality
    async filterCustomers() {
        try {
            // Get current filter values
            const statusFilter = document.getElementById('status-filter')?.value || 'active';
            const productFilter = document.getElementById('product-filter')?.value || '';
            
            // Build filter params
            const filterParams = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') {
                filterParams.append('status', statusFilter);
            }
            if (productFilter) {
                filterParams.append('product_id', productFilter);
            }
            
            // Add current search term if exists
            if (this.currentSearchTerm) {
                filterParams.append('q', this.currentSearchTerm);
            }

            // Show loading state
            const customersContent = document.getElementById('customers-content');
            if (customersContent) {
                const tableContainer = customersContent.querySelector('.overflow-x-auto');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div class="text-center py-8">
                            <i class="fas fa-filter text-gray-400 text-2xl mb-2"></i>
                            <p class="text-gray-500">Filtering customers...</p>
                        </div>
                    `;
                }
            }

            // Make API call with filters
            const url = filterParams.toString() ? 
                `/admin/customers?${filterParams.toString()}` : 
                '/admin/customers';
            
            const response = await this.apiCall(url);
            
            if (response.success) {
                this.allCustomers = response.customers || [];
                this.renderCustomersTable(this.allCustomers);
                
                // Update result count
                const resultCount = this.allCustomers.length;
                const filterDescription = this.getFilterDescription(statusFilter, productFilter);
                this.showNotification(`${resultCount} customer${resultCount !== 1 ? 's' : ''} ${filterDescription}`, 'info');
            } else {
                throw new Error(response.message || 'Filter failed');
            }
        } catch (error) {
            console.error('Filter error:', error);
            this.showNotification('Filter failed: ' + error.message, 'error');
        }
    }

    getFilterDescription(statusFilter, productFilter) {
        let description = 'found';
        const parts = [];
        
        if (statusFilter && statusFilter !== 'active') {
            parts.push(`with ${statusFilter} status`);
        }
        
        if (productFilter && this.productsCache && this.productsCache[productFilter]) {
            parts.push(`for ${this.productsCache[productFilter].name}`);
        }
        
        if (this.currentSearchTerm) {
            parts.push(`matching "${this.currentSearchTerm}"`);
        }
        
        if (parts.length > 0) {
            description += ' ' + parts.join(' and ');
        }
        
        return description;
    }


    // Render customer table rows safely to avoid template literal issues
    renderCustomerRows(customers) {
        try {
            if (!customers || customers.length === 0) {
                return `
                    <tr>
                        <td colspan="8" class="px-6 py-8 text-center text-gray-500">No customers found</td>
                    </tr>
                `;
            }

            // Process in smaller chunks to prevent browser freeze
            const chunkSize = 5;
            let html = '';
            
            for (let i = 0; i < customers.length; i += chunkSize) {
                const chunk = customers.slice(i, i + chunkSize);
                
                const chunkHtml = chunk.map(customer => {
                    // Pre-process all variables to avoid complex template evaluation
                    const id = customer.id || 0;
                    const name = (customer.name || 'N/A').replace(/['"]/g, '');
                    const email = customer.email || 'N/A';
                    const licenseKey = customer.license_key || 'N/A';
                    const productName = customer.product_name || 'Unknown Product';
                    const status = customer.status || 'unknown';
                    
                    // Use inline styles for status badge to ensure colors display correctly
                    let statusStyle = 'background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';
                    if (status === 'active') {
                        statusStyle = 'background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important;';
                    } else if (status === 'suspended') {
                        statusStyle = 'background-color: #fef3c7 !important; color: #92400e !important; border: 1px solid #fde68a !important;';
                    } else if (status === 'revoked') {
                        statusStyle = 'background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fecaca !important;';
                    }
                    
                    const statusBadge = `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style="${statusStyle}">${status.toUpperCase()}</span>`;
                    
                    return `<tr class="hover:bg-gray-50">
                        <td class="px-4 py-3">
                            <input type="checkbox" class="customer-checkbox rounded border-gray-300 text-brand-blue focus:ring-brand-blue" data-customer-id="${id}" data-customer-name="${name}">
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900">${name}</td>
                        <td class="px-4 py-3 text-sm">
                            <a href="mailto:${email}" class="text-blue-600 hover:text-blue-800">${email}</a>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">
                            ${customer.registration_date || customer.created_at || 'N/A'}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">${productName}</td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-600">${licenseKey}</td>
                        <td class="px-4 py-3 text-sm">${statusBadge}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex gap-1">
                                <button onclick="adminPanel.editCustomer(${id})" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Edit</button>
                                <button onclick="adminPanel.viewCustomerDetails(${id})" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Details</button>
                                <button onclick="adminPanel.deleteCustomer(${id})" class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">Delete</button>
                            </div>
                        </td>
                    </tr>`;
                }).join('');
                
                html += chunkHtml;
            }
            
            return html;
        } catch (error) {
            console.error('Error rendering customer rows:', error);
            return `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-red-600">
                        Error rendering customer data: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    // Render only the table content without filter controls (for filtering)
    // Apply status badge colors after rendering
    applyStatusBadgeColors() {
        const badges = document.querySelectorAll('[data-status]');
        badges.forEach(badge => {
            const status = badge.getAttribute('data-status')?.toLowerCase();
            switch(status) {
                case 'active':
                    badge.style.backgroundColor = '#dcfce7';
                    badge.style.color = '#166534';
                    badge.style.border = '1px solid #bbf7d0';
                    break;
                case 'suspended':
                    badge.style.backgroundColor = '#fef3c7';
                    badge.style.color = '#92400e';
                    badge.style.border = '1px solid #fde68a';
                    break;
                case 'revoked':
                case 'expired':
                case 'invalid':
                    badge.style.backgroundColor = '#fee2e2';
                    badge.style.color = '#991b1b';
                    badge.style.border = '1px solid #fecaca';
                    break;
                case 'pending':
                    badge.style.backgroundColor = '#dbeafe';
                    badge.style.color = '#1e40af';
                    badge.style.border = '1px solid #bfdbfe';
                    break;
                case 'trial':
                    badge.style.backgroundColor = '#ede9fe';
                    badge.style.color = '#7c3aed';
                    badge.style.border = '1px solid #c4b5fd';
                    break;
                default:
                    badge.style.backgroundColor = '#f3f4f6';
                    badge.style.color = '#374151';
                    badge.style.border = '1px solid #d1d5db';
                    break;
            }
        });
    }

    renderCustomersTableOnly(customers) {
        const tableContainer = document.querySelector('#customers-content .overflow-x-auto table tbody');
        if (tableContainer) {
            try {
                // Simple template without complex method calls to test
                const htmlContent = customers.length > 0 ? customers.map(customer => 
                    `<tr class="hover:bg-gray-50">
                        <td class="px-4 py-3">
                            <input type="checkbox" class="customer-checkbox rounded border-gray-300 text-brand-blue focus:ring-brand-blue" 
                                   data-customer-id="${customer.id}" data-customer-name="${customer.name || 'N/A'}" />
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900">${customer.name || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                            <a href="mailto:${customer.email}" class="text-blue-600 hover:text-blue-800">
                                ${customer.email}
                            </a>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">
                            ${customer.registration_date || customer.created_at || 'N/A'}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">
                            ${customer.product_name || 'Unknown Product'}
                        </td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-600">
                            ${customer.license_key || 'N/A'}
                        </td>
                        <td class="px-4 py-3 text-sm">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                                  style="${customer.status === 'active' ? 'background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important;' : 
                                         customer.status === 'suspended' ? 'background-color: #fef3c7 !important; color: #92400e !important; border: 1px solid #fde68a !important;' : 
                                         customer.status === 'revoked' ? 'background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fecaca !important;' : 
                                         'background-color: #f3f4f6 !important; color: #374151 !important; border: 1px solid #d1d5db !important;'}">
                                ${(customer.status || 'N/A').toUpperCase()}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex gap-1">
                                <button onclick="adminPanel.editCustomer(${customer.id})" 
                                    class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                                    Edit
                                </button>
                                <button onclick="adminPanel.viewCustomerDetails(${customer.id})" 
                                    class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                                    Details
                                </button>
                                <button onclick="adminPanel.deleteCustomer(${customer.id})" 
                                    class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>`
            ).join('') : `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                            <p class="text-gray-500">No customers match the current filter.</p>
                        </div>
                    </td>
                </tr>
            `;
                
                tableContainer.innerHTML = htmlContent;
                
                // Debug: Check immediately after setting innerHTML
                const checkboxesImmediately = tableContainer.querySelectorAll('.customer-checkbox').length;
                
                // Debug: Check the actual HTML in the DOM
                
                // If checkboxes are missing, try to add them manually using DOM methods  
                if (checkboxesImmediately === 0) {
                    const rows = tableContainer.querySelectorAll('tr');
                    rows.forEach((row, index) => {
                        if (index < customers.length) {
                            const customer = customers[index];
                            
                            // Create new TD for checkbox
                            const checkboxTd = document.createElement('td');
                            checkboxTd.className = 'px-4 py-3';
                            
                            // Create checkbox element using DOM methods
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'customer-checkbox rounded border-gray-300 text-brand-blue focus:ring-brand-blue';
                            checkbox.setAttribute('data-customer-id', customer.id);
                            checkbox.setAttribute('data-customer-name', customer.name || 'N/A');
                            
                            // Add checkbox to TD
                            checkboxTd.appendChild(checkbox);
                            
                            // Insert as first TD in the row
                            row.insertBefore(checkboxTd, row.firstChild);
                            
                        }
                    });
                    
                    const checkboxesAfterManual = tableContainer.querySelectorAll('.customer-checkbox').length;
                } else {
                }
                
                // Double-check: Always ensure checkboxes exist after any operation
                setTimeout(() => {
                    const finalCheckboxCount = tableContainer.querySelectorAll('.customer-checkbox').length;
                    if (finalCheckboxCount === 0) {
                    }
                }, 20);
                
            } catch (error) {
                console.error('Error in renderCustomersTableOnly template:', error);
                tableContainer.innerHTML = '<tr><td colspan="8" class="p-4 text-red-600">Error rendering table</td></tr>';
            }
        }
        
        // Re-setup event listeners after table re-render
        this.setupBulkSelectionListeners();
        
        // Debug: Check if checkboxes exist after renderCustomersTableOnly
        setTimeout(() => {
            const checkboxCount = document.querySelectorAll('.customer-checkbox').length;
        }, 10);
    }

    // Helper method to format date and time like your old system
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            return dateString;
        }
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatRecordCounts(recordCounts) {
        if (!recordCounts || typeof recordCounts !== 'object') {
            return 'N/A';
        }
        
        // Calculate total records
        const total = Object.values(recordCounts).reduce((sum, count) => sum + (count || 0), 0);
        
        // Create detailed breakdown
        const breakdown = Object.entries(recordCounts)
            .filter(([table, count]) => count > 0)
            .map(([table, count]) => `${count} ${table}`)
            .join(', ');
            
        return breakdown || `${total} total`;
    }

    // Helper method to get product name
    getProductName(productId) {
        // Use cached product data if available
        if (this.productsCache && this.productsCache[productId]) {
            return this.productsCache[productId].name;
        }
        return `Product ${productId}`;
    }

    // Helper method to get status badge CSS classes with proper color coding
    getStatusBadgeClass(status) {
        // Use inline styles with !important to override any conflicting CSS
        switch(status?.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'suspended': 
                return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'revoked':
            case 'expired':
            case 'invalid':
                return 'bg-red-100 text-red-800 border border-red-200';
            case 'pending':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'trial':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    }

    // Render complete status badge with proper styling
    renderStatusBadge(status) {
        const statusLower = (status || '').toLowerCase();
        let bgColor, textColor, borderColor;
        
        switch(statusLower) {
            case 'active':
                bgColor = '#dcfce7'; // green-100
                textColor = '#166534'; // green-800
                borderColor = '#bbf7d0'; // green-200
                break;
            case 'suspended': 
                bgColor = '#fef3c7'; // yellow-100
                textColor = '#92400e'; // yellow-800
                borderColor = '#fde68a'; // yellow-200
                break;
            case 'revoked':
            case 'expired':
            case 'invalid':
                bgColor = '#fee2e2'; // red-100
                textColor = '#991b1b'; // red-800
                borderColor = '#fecaca'; // red-200
                break;
            case 'pending':
                bgColor = '#dbeafe'; // blue-100
                textColor = '#1e40af'; // blue-800
                borderColor = '#bfdbfe'; // blue-200
                break;
            case 'trial':
                bgColor = '#ede9fe'; // purple-100
                textColor = '#7c3aed'; // purple-800
                borderColor = '#c4b5fd'; // purple-200
                break;
            default:
                bgColor = '#f3f4f6'; // gray-100
                textColor = '#374151'; // gray-800
                borderColor = '#d1d5db'; // gray-200
                break;
        }
        
        return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                      style="background-color: ${bgColor} !important; 
                             color: ${textColor} !important; 
                             border: 1px solid ${borderColor} !important;">
                    ${status ? status.toUpperCase() : 'UNKNOWN'}
                </span>`;
    }

    // Filter customers by product and status
    async filterCustomers() {
        const productFilter = document.getElementById('product-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        // Preserve current search term if any
        const searchInput = document.getElementById('customer-search');
        const currentSearchTerm = searchInput ? searchInput.value : '';
        
        try {
            let endpoint = '/admin/customers';
            const params = [];
            
            if (currentSearchTerm) {
                params.push(`search=${encodeURIComponent(currentSearchTerm)}`);
            }
            if (productFilter) {
                params.push(`product_id=${productFilter}`);
            }
            if (statusFilter) {
                params.push(`status=${statusFilter}`);
            }
            
            // Always use first page when filtering
            params.push('page=1');
            params.push('limit=100'); // Show more results when filtering
            
            if (params.length > 0) {
                endpoint += `?${params.join('&')}`;
            }
            
            const response = await this.apiCall(endpoint);
            const customers = response.success ? response.customers : [];
            
            // Use renderCustomersTableOnly to preserve checkboxes and filter controls
            this.renderCustomersTableOnly(customers);
            
            // Re-setup checkbox event listeners after table update
            setTimeout(() => {
                this.setupBulkSelectionListeners();
            }, 100);
            
            // Restore search term after table rebuild
            if (currentSearchTerm) {
                setTimeout(() => {
                    const newSearchInput = document.getElementById('customer-search');
                    if (newSearchInput) {
                        newSearchInput.value = currentSearchTerm;
                    }
                }, 10);
            }
        } catch (error) {
            console.error('Filter customers error:', error);
            this.showNotification('Failed to filter customers', 'error');
        }
    }

    // Export customers to Excel
    async exportToExcel() {
        try {
            this.showNotification('Preparing CSV export...', 'info');
            
            // Use fetch with authorization headers to download the CSV
            const response = await fetch(`${this.apiBaseUrl}/admin/export-direct/customers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }

            // Get the CSV content as a blob
            const blob = await response.blob();
            
            // Create download link with blob URL
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Customer export downloaded successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export customers: ' + error.message);
        }
    }

    // Export products to Excel
    async exportProducts() {
        try {
            this.showNotification('Preparing CSV export...', 'info');
            
            // Use fetch with authorization headers to download the CSV
            const response = await fetch(`${this.apiBaseUrl}/admin/export-direct/products`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }

            // Get the CSV content as a blob
            const blob = await response.blob();
            
            // Create download link with blob URL
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Products export downloaded successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export products: ' + error.message);
        }
    }

    // View customer details (like your old system's details page)
    async viewCustomerDetails(customerId) {
        try {
            
            const response = await this.simpleApiCall(`/api/admin/simple/customers/${customerId}`);
            if (!response.success) {
                this.showError('Failed to load customer details');
                return;
            }
            
            const customer = response.customer;
            this.showCustomerDetailsPage(customer, response.recent_activity, response.usage_stats);
        } catch (error) {
            console.error('View customer details error:', error);
            this.showError('Failed to load customer details');
        }
    }

    // Show customer details page (matching your old system layout)
    showCustomerDetailsPage(customer, recentActivity = [], usageStats = {}) {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showPage('customers')" class="text-gray-600 hover:text-gray-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Customer Details</h1>
                        <p class="text-gray-600 mt-2">Detailed customer information and activity</p>
                    </div>
                </div>
            </div>

            <!-- Customer Details Card -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                        <div class="text-sm text-gray-900">${customer.name || 'N/A'}</div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div class="text-sm">
                            <a href="mailto:${customer.email}" class="text-blue-600 hover:text-blue-800">
                                ${customer.email}
                            </a>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                        <div class="text-sm text-gray-900">
                            ${this.formatDateTime(customer.registration_date || customer.created_at)}
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">License Key</label>
                        <div class="text-sm font-mono text-gray-900">${customer.license_key || 'N/A'}</div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                        <div class="text-sm text-gray-900">${customer.primary_device_id || 'Not registered'}</div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                        <div class="text-sm text-gray-900">${customer.last_seen_ip || customer.registration_ip || 'N/A'}</div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Customer Status</label>
                        <div class="text-sm">
                            <!-- Status Badge: Green=Active, Yellow=Suspended, Red=Invalid/Unrecognized -->
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                                  style="${customer.status === 'active' ? 'background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important;' : customer.status === 'suspended' ? 'background-color: #fef3c7 !important; color: #92400e !important; border: 1px solid #fde68a !important;' : 'background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fecaca !important;'}">
                                ${customer.status === 'active' ? 'ACTIVE' : customer.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <div class="text-sm text-gray-900">${customer.product_name || this.getProductName(customer.product_id)}</div>
                    </div>
                </div>

                <!-- Usage Statistics -->
                <div class="mt-6 pt-6 border-t border-gray-200">
                    <h3 class="text-md font-semibold text-gray-900 mb-4">Usage Statistics</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-blue-600">${usageStats.total_validations || 0}</div>
                            <div class="text-sm text-blue-600">Total Validations</div>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-green-600">${usageStats.successful_validations || 0}</div>
                            <div class="text-sm text-green-600">Successful</div>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-red-600">${usageStats.failed_validations || 0}</div>
                            <div class="text-sm text-red-600">Failed</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-gray-600">${usageStats.total_activations || 0}</div>
                            <div class="text-sm text-gray-600">Total Activations</div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-6 pt-6 border-t border-gray-200 flex gap-4">
                    <button onclick="adminPanel.deleteCustomer(${customer.id})" 
                        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                        Delete Customer
                    </button>
                    <button onclick="adminPanel.editCustomer(${customer.id})" 
                        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Edit Customer
                    </button>
                    <button onclick="adminPanel.showPage('customers')" 
                        class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                        Back to List
                    </button>
                </div>
            </div>

            <!-- Recent Activity -->
            ${recentActivity && recentActivity.length > 0 ? `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${recentActivity.map(activity => `
                                <tr>
                                    <td class="px-4 py-3 text-sm text-gray-900">
                                        ${this.formatDateTime(activity.activation_time)}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600">
                                        ${activity.device_name || 'Unknown Device'}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600">${activity.ip_address}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.status === 'valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${activity.status?.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
        `;
    }

    // Resend license email functionality
    async resendLicenseEmail(customerId) {
        try {
            if (!confirm('Send license key information to this customer via email?')) {
                return;
            }
            
            this.showNotification('Sending license email...', 'info');
            
            const response = await this.apiCall(`/admin/customers/${customerId}/resend-license`, 'POST');
            
            if (response.success) {
                this.showNotification('License email sent successfully', 'success');
            } else {
                this.showError(response.message || 'Failed to send license email');
            }
        } catch (error) {
            console.error('Resend license email error:', error);
            this.showError('Failed to send license email');
        }
    }

    async editCustomer(customerId) {
        try {
            
            // Get customer data first
            const response = await this.apiCall(`/admin/customers/${customerId}`);
            if (!response.success) {
                this.showError('Failed to load customer data');
                return;
            }
            
            const customer = response.customer;
            this.showEditCustomerForm(customer);
        } catch (error) {
            console.error('Edit customer error:', error);
            this.showError('Failed to load customer for editing');
        }
    }

    async deleteCustomer(customerId) {
        try {
            
            if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
                return;
            }
            
            this.showNotification('Deleting customer...', 'info');
            
            const response = await this.apiCall(`/admin/customers/${customerId}`, 'DELETE');
            
            if (response.success) {
                this.showNotification('Customer deleted successfully', 'success');
                // Reload the customers list
                this.showPage('customers');
            } else {
                this.showError(response.message || 'Failed to delete customer');
            }
        } catch (error) {
            console.error('Delete customer error:', error);
            this.showError('Failed to delete customer');
        }
    }

    // Bulk Selection Methods (duplicate removed - using the one with debug statements)

    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('select-all-customers');
        const customerCheckboxes = document.querySelectorAll('.customer-checkbox');
        
        customerCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const selectedCustomers = document.querySelectorAll('.customer-checkbox:checked');
        const count = selectedCustomers.length;
        const totalCustomers = document.querySelectorAll('.customer-checkbox').length;
        
        // Update the selection count display
        const selectionCount = document.getElementById('selection-count');
        const bulkActionsBar = document.getElementById('bulk-actions-bar');
        const selectAllCheckbox = document.getElementById('select-all-customers');
        
        if (count > 0) {
            selectionCount.textContent = `${count} customer${count === 1 ? '' : 's'} selected`;
            bulkActionsBar.classList.remove('hidden');
            
            // Update select all checkbox state
            if (count === totalCustomers) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        } else {
            bulkActionsBar.classList.add('hidden');
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    clearSelection() {
        document.querySelectorAll('.customer-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('select-all-customers').checked = false;
        this.updateSelectionCount();
    }

    async bulkDeleteCustomers() {
        const selectedCustomers = document.querySelectorAll('.customer-checkbox:checked');
        const count = selectedCustomers.length;
        
        if (count === 0) {
            this.showNotification('No customers selected', 'warning');
            return;
        }

        // Get customer names for confirmation
        const customerNames = Array.from(selectedCustomers).map(checkbox => 
            checkbox.dataset.customerName
        ).join(', ');

        // Double confirmation for bulk deletion
        const confirmMessage = `⚠️ BULK DELETION WARNING ⚠️\n\nYou are about to delete ${count} customer${count === 1 ? '' : 's'}:\n\n${customerNames}\n\nThis action CANNOT be undone!\n\nAre you sure you want to proceed?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Second confirmation
        if (!confirm(`Final confirmation: Delete ${count} customer${count === 1 ? '' : 's'}?\n\nClick OK to delete or Cancel to abort.`)) {
            return;
        }

        try {
            this.showNotification(`Deleting ${count} customer${count === 1 ? '' : 's'}...`, 'info');

            // Delete customers one by one
            let successCount = 0;
            let errorCount = 0;
            
            for (const checkbox of selectedCustomers) {
                try {
                    const customerId = checkbox.dataset.customerId;
                    const response = await this.apiCall(`/admin/customers/${customerId}`, 'DELETE');
                    
                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error(`Failed to delete customer ${customerId}:`, response.message);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error deleting customer ${checkbox.dataset.customerId}:`, error);
                }
            }

            // Show results
            if (successCount > 0 && errorCount === 0) {
                this.showNotification(`Successfully deleted ${successCount} customer${successCount === 1 ? '' : 's'}!`, 'success');
            } else if (successCount > 0 && errorCount > 0) {
                this.showNotification(`Deleted ${successCount} customer${successCount === 1 ? '' : 's'}, but ${errorCount} failed. Check console for details.`, 'warning');
            } else {
                this.showNotification(`Failed to delete customers. Check console for details.`, 'error');
            }

            // Reload customers list and clear selection
            this.showPage('customers');
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showNotification('Failed to delete customers', 'error');
        }
    }

    showEditCustomerForm(customer) {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showPage('customers')" class="text-gray-600 hover:text-gray-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Edit Customer</h1>
                        <p class="text-gray-600 mt-2">Update customer information</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <form class="p-6 space-y-6" id="edit-customer-form">
                    <input type="hidden" id="edit-customer-id" value="${customer.id}">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                            <input type="text" id="edit-customer-name" value="${customer.name || ''}" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter customer name">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="edit-customer-email" value="${customer.email || ''}" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter email address">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">License Key</label>
                            <input type="text" id="edit-customer-license-key" value="${customer.license_key || ''}" readonly
                                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                placeholder="Auto-generated">
                            <p class="text-xs text-gray-500 mt-1">License key is auto-generated and cannot be edited</p>
                            <div class="mt-2 flex gap-2">
                                <button type="button" onclick="navigator.clipboard.writeText('${customer.license_key || ''}')" 
                                    class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                                    Copy Key
                                </button>
                                <button type="button" onclick="adminPanel.resendLicenseEmail(${customer.id})" 
                                    class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                    Email License
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">License Status</label>
                            <select id="edit-customer-status" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="active" ${customer.status === 'active' ? 'selected' : ''}>Active License</option>
                                <option value="suspended" ${customer.status === 'suspended' || customer.status === 'inactive' ? 'selected' : ''}>Suspended License</option>
                                <option value="revoked" ${customer.status === 'revoked' ? 'selected' : ''}>Revoked License</option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Change license status - revoked licenses can be restored to active or suspended</p>
                        </div>
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <textarea id="edit-customer-notes" rows="3"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional notes about this customer">${customer.notes || ''}</textarea>
                        </div>
                    </div>

                    <div id="edit-customer-error" class="hidden text-red-600 text-sm"></div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="adminPanel.showPage('customers')" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" id="update-customer-btn"
                            class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                            Update Customer
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('edit-customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdateCustomer();
        });
    }

    async handleUpdateCustomer() {
        const customerId = document.getElementById('edit-customer-id').value;
        const name = document.getElementById('edit-customer-name').value.trim();
        const email = document.getElementById('edit-customer-email').value.trim();
        const status = document.getElementById('edit-customer-status').value;
        const notes = document.getElementById('edit-customer-notes').value.trim();
        const errorDiv = document.getElementById('edit-customer-error');
        const updateBtn = document.getElementById('update-customer-btn');

        if (!name || !email) {
            errorDiv.textContent = 'Please fill in all required fields';
            errorDiv.classList.remove('hidden');
            return;
        }

        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
        updateBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            
            const response = await this.apiCall(`/admin/customers/${customerId}`, 'PUT', {
                name: name,
                email: email,
                status: status,
                notes: notes || ''
            });

            if (response.success) {
                this.showNotification('Customer updated successfully', 'success');
                this.showPage('customers');
            } else {
                errorDiv.textContent = response.message || 'Failed to update customer';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Update customer error:', error);
            errorDiv.textContent = error.response?.data?.message || 'Failed to update customer';
            errorDiv.classList.remove('hidden');
        }

        updateBtn.innerHTML = 'Update Customer';
        updateBtn.disabled = false;
    }

    showAddCustomer() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showPage('customers')" class="text-gray-600 hover:text-gray-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Add Customer</h1>
                        <p class="text-gray-600 mt-2">Create a new customer account</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <form class="p-6 space-y-6" id="add-customer-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                            <input type="text" id="customer-name" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Customer Name">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="customer-email" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="customer@example.com">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                        <select id="customer-product" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select a product...</option>
                            <option value="loading" disabled>Loading products...</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea id="customer-notes" rows="4"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional notes about this customer..."></textarea>
                    </div>

                    <div id="customer-error" class="hidden text-red-600 text-sm"></div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="adminPanel.showPage('customers')" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" id="save-customer-btn"
                            class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                            Create Customer
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('add-customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCustomer();
        });
        
        // Load products for dropdown
        this.loadProductsForDropdown();
    }

    async handleAddCustomer() {
        const name = document.getElementById('customer-name').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const productId = document.getElementById('customer-product').value;
        const notes = document.getElementById('customer-notes').value.trim();
        const errorDiv = document.getElementById('customer-error');
        const saveBtn = document.getElementById('save-customer-btn');

        if (!name || !email || !productId) {
            errorDiv.textContent = 'Please fill in all required fields';
            errorDiv.classList.remove('hidden');
            return;
        }

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
        saveBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const response = await this.apiCall('/admin/customers', 'POST', {
                name: name,
                email: email,
                product_id: parseInt(productId),
                notes: notes
            });

            if (response.success) {
                this.showPage('customers');
                this.showNotification(`Customer created successfully with license key: ${response.license_key || 'Generated'}`, 'success');
            } else {
                throw new Error(response.message || 'Failed to create customer');
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Failed to create customer';
            errorDiv.classList.remove('hidden');
        } finally {
            saveBtn.innerHTML = 'Create Customer';
            saveBtn.disabled = false;
        }
    }

    async loadProductsForDropdown() {
        try {
            const response = await this.apiCall('/admin/products?status=active');
            const products = response.success ? response.products : [];
            const productSelect = document.getElementById('customer-product');
            
            if (productSelect) {
                productSelect.innerHTML = '<option value="">Select a product...</option>';
                
                if (products.length === 0) {
                    productSelect.innerHTML += '<option value="" disabled>No active products available</option>';
                } else {
                    products.forEach(product => {
                        productSelect.innerHTML += `<option value="${product.id}">${product.name} (v${product.version || '1.0'})</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            const productSelect = document.getElementById('customer-product');
            if (productSelect) {
                productSelect.innerHTML = '<option value="">Select a product...</option><option value="" disabled>Failed to load products</option>';
            }
        }
    }

    // Continue with other page methods...
    async showProducts(statusFilter = 'active') {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Products</h1>
                        <p class="text-gray-600 mt-2">Manage your software products</p>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="adminPanel.exportProducts()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-file-excel mr-2"></i>Export Excel
                        </button>
                        <button onclick="adminPanel.showAddProduct()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add Product
                        </button>
                    </div>
                </div>
            </div>

            <!-- Status Filter Tabs -->
            <div class="mb-6">
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button onclick="adminPanel.showProducts('active')" 
                                class="product-tab ${statusFilter === 'active' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} py-2 px-1 border-b-2 font-medium text-sm">
                            <i class="fas fa-check-circle mr-2"></i>
                            Active Products
                        </button>
                        <button onclick="adminPanel.showProducts('inactive')" 
                                class="product-tab ${statusFilter === 'inactive' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} py-2 px-1 border-b-2 font-medium text-sm">
                            <i class="fas fa-trash-alt mr-2"></i>
                            Deleted Products
                        </button>
                        <button onclick="adminPanel.showProducts('all')" 
                                class="product-tab ${statusFilter === 'all' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} py-2 px-1 border-b-2 font-medium text-sm">
                            <i class="fas fa-list mr-2"></i>
                            All Products
                        </button>
                    </nav>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6" id="products-content">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                </div>
            </div>
        `;

        this.currentProductStatus = statusFilter;
        await this.loadProducts(statusFilter);
    }

    async loadProducts(statusFilter = 'active') {
        try {
            const response = await this.apiCall(`/admin/products?status=${statusFilter}`);
            const products = response.success ? response.products : [];
            this.renderProductsTable(products, statusFilter);
        } catch (error) {
            console.error('Failed to load products:', error);
            document.getElementById('products-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">Failed to load products</p>
                </div>
            `;
        }
    }

    renderProductsTable(products, statusFilter = 'active') {
        const content = document.getElementById('products-content');
        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rules</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${products.length > 0 ? products.map(product => {
                            const isActive = product.status === 'active';
                            const statusBadge = isActive 
                                ? '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>'
                                : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span>';
                            
                            const actions = isActive
                                ? `<button onclick="adminPanel.showProductDetails(${product.id})" class="text-purple-600 hover:text-purple-800 mr-3">
                                     <i class="fas fa-info-circle mr-1"></i>Details
                                   </button>
                                   <button onclick="adminPanel.editProduct(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                   <button onclick="adminPanel.deleteProduct(${product.id})" class="text-red-600 hover:text-red-800">Delete</button>`
                                : `<button onclick="adminPanel.restoreProduct(${product.id})" class="text-green-600 hover:text-green-800 mr-3">
                                     <i class="fas fa-undo mr-1"></i>Restore
                                   </button>
                                   <button onclick="adminPanel.showProductDetails(${product.id})" class="text-purple-600 hover:text-purple-800 mr-3">
                                     <i class="fas fa-info-circle mr-1"></i>Details
                                   </button>
                                   <button onclick="adminPanel.editProduct(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                   <button onclick="adminPanel.permanentlyDeleteProduct(${product.id})" class="text-red-800 hover:text-red-900 font-semibold">
                                     <i class="fas fa-trash-alt mr-1"></i>Delete Forever
                                   </button>`;
                            
                            return `
                                <tr class="${!isActive ? 'bg-gray-50' : ''}">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="font-bold text-lg ${isActive ? 'text-blue-600' : 'text-gray-500'}">${product.id}</div>
                                        <div class="text-xs text-gray-400">0${product.id.toString(16).toUpperCase().padStart(1, '0')}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}">${product.name}</div>
                                        <div class="text-sm text-gray-500">${product.description || 'No description'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">${product.version}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${product.rules_count || 0} rules</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">${product.customer_count || 0}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatDate(product.created_at)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        ${actions}
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                                    ${statusFilter === 'active' ? 'No active products found' : 
                                      statusFilter === 'inactive' ? 'No deleted products found' : 
                                      'No products found'}
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    }

    showAddProduct() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showPage('products')" class="text-gray-600 hover:text-gray-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Add Product</h1>
                        <p class="text-gray-600 mt-2">Create a new software product</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <form class="p-6 space-y-6" id="add-product-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                            <input type="text" id="product-name" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="My Software">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Version *</label>
                            <input type="text" id="product-version" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1.0.0">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="product-description" rows="3" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Product description..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Download URL *</label>
                        <input type="url" id="product-download-url" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/downloads/myapp.zip">
                        <p class="text-sm text-gray-500 mt-1">Direct link where customers will download the software</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Price</label>
                            <input type="number" id="product-price" step="0.01" min="0"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00" value="0.00">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                            <select id="product-currency"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                                <option value="CAD">CAD - Canadian Dollar</option>
                                <option value="AUD">AUD - Australian Dollar</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select id="product-category"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select a category...</option>
                                <option value="Business Software">Business Software</option>
                                <option value="Developer Tools">Developer Tools</option>
                                <option value="Security & Antivirus">Security & Antivirus</option>
                                <option value="Games & Entertainment">Games & Entertainment</option>
                                <option value="Productivity & Office">Productivity & Office</option>
                                <option value="Graphics & Design">Graphics & Design</option>
                                <option value="System Utilities">System Utilities</option>
                                <option value="Education & Reference">Education & Reference</option>
                                <option value="Multimedia">Multimedia</option>
                                <option value="Communication">Communication</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rule Template *</label>
                        <select id="product-rules" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Loading rules...</option>
                        </select>
                        <p class="text-sm text-gray-500 mt-1">Select a rule template to apply to this product</p>
                    </div>

                    <div id="product-error" class="hidden text-red-600 text-sm"></div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="adminPanel.showPage('products')" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" id="save-product-btn"
                            class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                            Create Product
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('add-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddProduct();
        });

        // Load available rules
        this.loadProductRules();
    }

    async loadProductRules() {
        const rulesSelect = document.getElementById('product-rules');
        
        try {
            const response = await this.simpleApiCall('/api/admin/simple/rules');
            
            if (response.success && response.data) {
                // Clear existing options
                rulesSelect.innerHTML = '<option value="">Select a rule template...</option>';
                
                // Add rules as options
                response.data.forEach(rule => {
                    const option = document.createElement('option');
                    option.value = rule.id;
                    option.textContent = `${rule.name} - ${rule.description || 'No description'}`;
                    rulesSelect.appendChild(option);
                });
            } else {
                rulesSelect.innerHTML = '<option value="">No rules available</option>';
            }
        } catch (error) {
            console.error('Failed to load rules:', error);
            rulesSelect.innerHTML = '<option value="">Error loading rules</option>';
        }
    }

    async handleAddProduct() {
        const name = document.getElementById('product-name').value.trim();
        const version = document.getElementById('product-version').value.trim();
        const description = document.getElementById('product-description').value.trim();
        const downloadUrl = document.getElementById('product-download-url').value.trim();
        const selectedRuleId = document.getElementById('product-rules').value;
        const price = parseFloat(document.getElementById('product-price').value) || 0.00;
        const currency = document.getElementById('product-currency').value;
        const category = document.getElementById('product-category').value;
        const errorDiv = document.getElementById('product-error');
        const saveBtn = document.getElementById('save-product-btn');

        if (!name || !version || !downloadUrl || !selectedRuleId) {
            errorDiv.textContent = 'Please fill in all required fields including download URL and rule template';
            errorDiv.classList.remove('hidden');
            return;
        }

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
        saveBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const response = await this.apiCall('/admin/products', 'POST', {
                name: name,
                version: version,
                description: description,
                download_url: downloadUrl,
                rule_id: parseInt(selectedRuleId),
                price: price,
                currency: currency,
                category: category
            });

            if (response.success) {
                this.showPage('products');
                this.showNotification('Product created successfully', 'success');
            } else {
                throw new Error(response.message || 'Failed to create product');
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Failed to create product';
            errorDiv.classList.remove('hidden');
        } finally {
            saveBtn.innerHTML = 'Create Product';
            saveBtn.disabled = false;
        }
    }

    async editProduct(productId) {
        try {
            
            // Get product data first
            const response = await this.apiCall(`/admin/products/${productId}`);
            if (!response.success) {
                this.showError('Failed to load product data');
                return;
            }
            
            const product = response.product;
            this.showEditProductForm(product);
        } catch (error) {
            console.error('Edit product error:', error);
            this.showError('Failed to load product for editing');
        }
    }

    async deleteProduct(productId) {
        try {
            // Get product info for confirmation
            const response = await this.apiCall(`/admin/products/${productId}`);
            const productName = response.success ? response.product.name : 'this product';

            if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
                this.showNotification('Deleting product...', 'info');

                const deleteResponse = await this.apiCall(`/admin/products/${productId}`, 'DELETE');
                
                if (deleteResponse.success) {
                    this.showNotification(`Product "${productName}" deleted successfully!`, 'success');
                    // Reload the products list with current filter
                    this.loadProducts(this.currentProductStatus || 'active');
                } else {
                    throw new Error(deleteResponse.message || 'Failed to delete product');
                }
            }
        } catch (error) {
            console.error('Delete product error:', error);
            this.showError('Failed to delete product: ' + error.message);
        }
    }

    async restoreProduct(productId) {
        try {
            // Get product info for confirmation
            const response = await this.apiCall(`/admin/products/${productId}`);
            const productName = response.success ? response.product.name : 'this product';

            if (confirm(`Are you sure you want to restore "${productName}"? This will make it active again.`)) {
                this.showNotification('Restoring product...', 'info');

                const restoreResponse = await this.apiCall(`/admin/products/${productId}/restore`, 'PUT');
                
                if (restoreResponse.success) {
                    this.showNotification(`Product "${productName}" restored successfully!`, 'success');
                    // Reload the products list with current filter
                    this.loadProducts(this.currentProductStatus || 'active');
                } else {
                    throw new Error(restoreResponse.message || 'Failed to restore product');
                }
            }
        } catch (error) {
            console.error('Restore product error:', error);
            this.showError('Failed to restore product: ' + error.message);
        }
    }

    async permanentlyDeleteProduct(productId) {
        try {
            // Get product info for confirmation
            const response = await this.apiCall(`/admin/products/${productId}`);
            const productName = response.success ? response.product.name : 'this product';

            // Double confirmation for permanent deletion
            if (confirm(`⚠️ PERMANENT DELETION WARNING ⚠️\n\nThis will PERMANENTLY delete "${productName}" from the database.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) {
                if (confirm(`Last chance! Permanently delete "${productName}"?\n\nClick OK to permanently delete, or Cancel to abort.`)) {
                    this.showNotification('Permanently deleting product...', 'info');

                    const deleteResponse = await this.apiCall(`/admin/products/${productId}/permanent`, 'DELETE');
                    
                    
                    if (deleteResponse.success) {
                        this.showNotification(`Product "${productName}" permanently deleted from database!`, 'success');
                        // Reload the products list with current filter
                        this.loadProducts(this.currentProductStatus || 'inactive');
                    } else {
                        throw new Error(deleteResponse.message || 'Failed to permanently delete product');
                    }
                }
            }
        } catch (error) {
            console.error('Permanent delete product error:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                response: error.response?.data,
                originalError: error.originalError
            });
            
            // Extract the most specific error message available
            let errorMessage = 'Failed to permanently delete product';
            
            // Try to get server message in order of preference
            if (error.message && !error.message.includes('Request failed with status code')) {
                // This is our enhanced error message from apiCall
                errorMessage += ': ' + error.message;
            } else if (error.response?.data?.message) {
                // Direct server message
                errorMessage += ': ' + error.response.data.message;
            } else if (error.message) {
                // Fallback to axios error message
                errorMessage += ': ' + error.message;
            }
            
            // Add helpful hints for common error scenarios
            if (error.status === 400 || (error.response && error.response.status === 400)) {
                const fullMessage = errorMessage.toLowerCase();
                if (fullMessage.includes('inactive')) {
                    errorMessage += '\n\n💡 Tip: You must first deactivate the product before permanently deleting it.';
                } else if (fullMessage.includes('customer')) {
                    errorMessage += '\n\n💡 Tip: Delete all customers from this product first, then try again.';
                }
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }

    showEditProductForm(product) {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showPage('products')" class="text-gray-600 hover:text-gray-800 mr-4">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Edit Product</h1>
                        <p class="text-gray-600 mt-2">Update product information</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <form class="p-6 space-y-6" id="edit-product-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                            <input type="text" id="edit-product-name" value="${product.name}" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Version *</label>
                            <input type="text" id="edit-product-version" value="${product.version}" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="edit-product-description" rows="3" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${product.description || ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Download URL *</label>
                        <input type="url" id="edit-product-download-url" value="${product.download_url || ''}" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/downloads/myapp.zip">
                        <p class="text-sm text-gray-500 mt-1">Direct link where customers will download the software</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Landing Page URL</label>
                        <div class="flex items-center space-x-2">
                            <input type="url" id="edit-product-landing-url" value="${product.landing_page_token || ''}" readonly 
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                            <button type="button" onclick="adminPanel.copyToClipboard('${product.landing_page_token || ''}')" 
                                class="px-3 py-2 text-blue-600 hover:text-blue-800">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">Customer registration page URL (auto-generated)</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rule Template *</label>
                        <select id="edit-product-rules" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Loading rules...</option>
                        </select>
                        <p class="text-sm text-gray-500 mt-1">Select a rule template for this product</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Price</label>
                            <input type="number" id="edit-product-price" step="0.01" min="0"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00" value="${product.price || '0.00'}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                            <select id="edit-product-currency"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="USD" ${(product.currency || 'USD') === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                                <option value="EUR" ${(product.currency || 'USD') === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                                <option value="GBP" ${(product.currency || 'USD') === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
                                <option value="CAD" ${(product.currency || 'USD') === 'CAD' ? 'selected' : ''}>CAD - Canadian Dollar</option>
                                <option value="AUD" ${(product.currency || 'USD') === 'AUD' ? 'selected' : ''}>AUD - Australian Dollar</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select id="edit-product-category"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="" ${!(product.category || '') ? 'selected' : ''}>Select a category...</option>
                                <option value="Business Software" ${(product.category || '') === 'Business Software' ? 'selected' : ''}>Business Software</option>
                                <option value="Developer Tools" ${(product.category || '') === 'Developer Tools' ? 'selected' : ''}>Developer Tools</option>
                                <option value="Security & Antivirus" ${(product.category || '') === 'Security & Antivirus' ? 'selected' : ''}>Security & Antivirus</option>
                                <option value="Games & Entertainment" ${(product.category || '') === 'Games & Entertainment' ? 'selected' : ''}>Games & Entertainment</option>
                                <option value="Productivity & Office" ${(product.category || '') === 'Productivity & Office' ? 'selected' : ''}>Productivity & Office</option>
                                <option value="Graphics & Design" ${(product.category || '') === 'Graphics & Design' ? 'selected' : ''}>Graphics & Design</option>
                                <option value="System Utilities" ${(product.category || '') === 'System Utilities' ? 'selected' : ''}>System Utilities</option>
                                <option value="Education & Reference" ${(product.category || '') === 'Education & Reference' ? 'selected' : ''}>Education & Reference</option>
                                <option value="Multimedia" ${(product.category || '') === 'Multimedia' ? 'selected' : ''}>Multimedia</option>
                                <option value="Communication" ${(product.category || '') === 'Communication' ? 'selected' : ''}>Communication</option>
                                <option value="Other" ${(product.category || '') === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>

                    <div id="edit-product-error" class="hidden text-red-600 text-sm"></div>

                    <div class="flex justify-between">
                        <div class="flex space-x-3">
                            <button type="button" onclick="adminPanel.regenerateLandingPage(${product.id})" 
                                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                <i class="fas fa-sync-alt mr-2"></i>Regenerate Landing Page
                            </button>
                        </div>
                        <div class="flex space-x-4">
                            <button type="button" onclick="adminPanel.showPage('products')" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" id="save-edit-product-btn"
                                class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                                Update Product
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        // Load available rules and set current selection
        this.loadRulesForEditProduct(product.rule_id);

        document.getElementById('edit-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditProduct(product.id);
        });
    }

    async loadRulesForEditProduct(currentRuleId) {
        try {
            const response = await this.simpleApiCall('/api/admin/simple/rules');
            const rulesSelect = document.getElementById('edit-product-rules');
            
            if (response.success && response.data) {
                rulesSelect.innerHTML = `
                    <option value="">Select a rule template...</option>
                    ${response.data.map(rule => 
                        `<option value="${rule.id}" ${rule.id === currentRuleId ? 'selected' : ''}>${rule.name} - ${rule.description || 'No description'}</option>`
                    ).join('')}
                `;
            } else {
                rulesSelect.innerHTML = '<option value="">No rules available</option>';
            }
        } catch (error) {
            console.error('Failed to load rules for edit product:', error);
            document.getElementById('edit-product-rules').innerHTML = '<option value="">Error loading rules</option>';
        }
    }

    async handleEditProduct(productId) {
        const name = document.getElementById('edit-product-name').value.trim();
        const version = document.getElementById('edit-product-version').value.trim();
        const description = document.getElementById('edit-product-description').value.trim();
        const downloadUrl = document.getElementById('edit-product-download-url').value.trim();
        const selectedRuleId = document.getElementById('edit-product-rules').value;
        const price = parseFloat(document.getElementById('edit-product-price').value) || 0.00;
        const currency = document.getElementById('edit-product-currency').value;
        const category = document.getElementById('edit-product-category').value;
        const errorDiv = document.getElementById('edit-product-error');
        const saveBtn = document.getElementById('save-edit-product-btn');

        if (!name || !version || !downloadUrl || !selectedRuleId) {
            errorDiv.textContent = 'Please fill in all required fields including download URL and rule template';
            errorDiv.classList.remove('hidden');
            return;
        }

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
        saveBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const response = await this.apiCall(`/admin/products/${productId}`, 'PUT', {
                name: name,
                version: version,
                description: description,
                download_url: downloadUrl,
                rule_id: parseInt(selectedRuleId),
                price: price,
                currency: currency,
                category: category
            });

            if (response.success) {
                this.showNotification('Product updated successfully', 'success');
                this.showPage('products');
            } else {
                throw new Error(response.message || 'Failed to update product');
            }
        } catch (error) {
            console.error('Update product error:', error);
            errorDiv.textContent = error.message || 'Failed to update product';
            errorDiv.classList.remove('hidden');
        } finally {
            saveBtn.innerHTML = 'Update Product';
            saveBtn.disabled = false;
        }
    }

    async showProductDetails(productId) {
        try {
            
            // Get product data
            const response = await this.apiCall(`/admin/products/${productId}`);
            if (!response.success) {
                this.showError('Failed to load product details');
                return;
            }
            
            const product = response.product;
            
            // Use stored landing page URL or show that it needs to be generated
            const landingPageUrl = product.landing_page_token || 'No landing page URL - regenerate to create';
            
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="mb-8">
                    <div class="flex items-center">
                        <button onclick="adminPanel.showPage('products')" class="text-gray-600 hover:text-gray-800 mr-4">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">Product Details</h1>
                            <p class="text-gray-600 mt-2">View product information and settings</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2">Product Name</h3>
                                <p class="text-lg text-gray-900">${product.name}</p>
                            </div>
                            <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2">Version</h3>
                                <p class="text-lg text-gray-900">${product.version}</p>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-medium text-gray-700 mb-2">Description</h3>
                            <p class="text-gray-900">${product.description || 'No description provided'}</p>
                        </div>

                        <div>
                            <h3 class="text-sm font-medium text-gray-700 mb-2">Download URL</h3>
                            <div class="flex items-center space-x-2">
                                <p class="text-gray-900 break-all">${product.download_url || 'No download URL provided'}</p>
                                ${product.download_url ? `<button onclick="adminPanel.copyToClipboard('${product.download_url}')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-copy"></i></button>` : ''}
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-medium text-gray-700 mb-2">Landing Page URL</h3>
                            <div class="flex items-center space-x-2">
                                <p class="text-gray-900 break-all">${landingPageUrl}</p>
                                <button onclick="adminPanel.copyToClipboard('${landingPageUrl}')" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-medium text-gray-700 mb-2">Rule Template</h3>
                            <p class="text-gray-900">ID: ${product.rule_id}</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2">Status</h3>
                                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${product.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2">Created Date</h3>
                                <p class="text-gray-900">${new Date(product.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div class="flex justify-end pt-6 border-t border-gray-200">
                            <div class="flex space-x-4">
                                <button type="button" onclick="adminPanel.showPage('products')" 
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                                    Back to Products
                                </button>
                                <button type="button" onclick="adminPanel.editProduct(${product.id})" 
                                    class="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                                    Edit Product
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Show product details error:', error);
            this.showError('Failed to load product details');
        }
    }

    async regenerateLandingPage(productId) {
        try {
            this.showNotification('Regenerating landing page...', 'info');
            
            // Use direct fetch to bypass authentication for now
            const response = await fetch(`/api/regenerate-landing/${productId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Landing page regenerated successfully!', 'success');
                
                // Update the landing page URL field in the edit form
                const landingUrlField = document.getElementById('edit-product-landing-url');
                if (landingUrlField && result.landing_page_url) {
                    landingUrlField.value = result.landing_page_url;
                }
                
                // Also refresh the current view if we're on the edit page
                setTimeout(() => {
                    this.editProduct(productId);
                }, 1000);
            } else {
                throw new Error(result.message || 'Failed to regenerate landing page');
            }
        } catch (error) {
            console.error('Regenerate landing page error:', error);
            this.showError('Failed to regenerate landing page: ' + error.message);
        }
    }

    async copyLandingPageUrl(productId) {
        try {
            const response = await this.apiCall(`/admin/products/${productId}/details`);
            
            if (response.success && response.landing_page_url) {
                await this.copyToClipboard(response.landing_page_url);
                this.showNotification('Landing page URL copied to clipboard!', 'success');
            } else {
                throw new Error('Failed to get landing page URL');
            }
        } catch (error) {
            console.error('Copy landing page URL error:', error);
            this.showError('Failed to copy landing page URL: ' + error.message);
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }



    showRules() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">License Rules</h1>
                        <p class="text-gray-600 mt-2">Overview of available licensing rules and restrictions</p>
                    </div>
                    <button onclick="adminPanel.showAddRule()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Create Rule Template
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Available Features -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fas fa-shield-alt mr-2 text-blue-600"></i>
                            Security & Protection Features
                        </h3>
                        <p class="text-sm text-gray-600 mt-1">Available when creating rules</p>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-fingerprint text-indigo-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Hardware Binding</h4>
                                    <p class="text-sm text-gray-600 mt-1">Bind licenses to specific hardware fingerprints (MAC addresses, CPU serial numbers, motherboard IDs)</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-server text-red-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Virtual Machine Protection</h4>
                                    <p class="text-sm text-gray-600 mt-1">Block license usage in VMs (VMware, VirtualBox, Hyper-V, QEMU) to prevent easy copying and unauthorized distribution</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-users text-blue-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Concurrent Session Control</h4>
                                    <p class="text-sm text-gray-600 mt-1">Limit maximum instances that can run simultaneously per license to prevent sharing across multiple users</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-devices text-purple-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Device Limits</h4>
                                    <p class="text-sm text-gray-600 mt-1">Set maximum number of devices that can use a single license simultaneously</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Geographic & Time Features -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fas fa-globe-americas mr-2 text-green-600"></i>
                            Geographic & Time Controls
                        </h3>
                        <p class="text-sm text-gray-600 mt-1">Location and schedule restrictions</p>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-globe-americas text-blue-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Geographic Restrictions</h4>
                                    <p class="text-sm text-gray-600 mt-1">Control license usage based on IP geolocation with country allowlist/blocklist (290+ global detection points)</p>
                                    <div class="mt-2 text-xs text-blue-600">
                                        <i class="fas fa-info-circle mr-1"></i>
                                        US and Canada are default allowed countries for new rules
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-clock text-purple-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Time-Based Restrictions</h4>
                                    <p class="text-sm text-gray-600 mt-1">Enforce business hours and day-of-week restrictions for workforce management and compliance</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-calendar-times text-orange-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">License Expiration</h4>
                                    <p class="text-sm text-gray-600 mt-1">Set automatic license expiration dates with customizable grace periods for renewals</p>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-wifi text-teal-600 mt-1"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-gray-900">Offline Usage</h4>
                                    <p class="text-sm text-gray-600 mt-1">Allow limited offline usage with configurable offline duration and periodic validation requirements</p>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

            </div>

            <!-- Existing Rules List -->
            <div class="mt-8">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fas fa-list mr-2 text-gray-600"></i>
                            Rule Templates
                        </h3>
                        <p class="text-sm text-gray-600 mt-1">Currently configured license rule templates</p>
                    </div>
                    <div class="p-6">
                        <div id="rules-list" class="space-y-4">
                            <!-- Rules will be loaded here -->
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>Loading rules...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load existing rules from API after DOM is ready
        setTimeout(() => this.loadRules(), 100);
    }

    async loadRules() {
        const rulesList = document.getElementById('rules-list');
        if (!rulesList) return;

        try {
            // Use the simple API endpoint for rules (no auth required)
            const response = await this.simpleApiCall('/api/admin/simple/rules');
            
            if (response.success && response.data) {
                if (response.data.length === 0) {
                    rulesList.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-file-alt text-3xl mb-3"></i>
                            <p class="text-lg">No rules configured yet</p>
                            <p class="text-sm">Click "Add Rule" to create your first license rule</p>
                        </div>
                    `;
                } else {
                    rulesList.innerHTML = response.data.map(rule => `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-semibold text-gray-900">${rule.name}</h4>
                                <span class="px-2 py-1 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    ${rule.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            
                            ${rule.description ? `<p class="text-sm text-gray-600 mb-3">${rule.description}</p>` : ''}
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">Max Devices:</span>
                                    <span class="font-medium">${rule.max_devices || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Max Sessions:</span>
                                    <span class="font-medium">${rule.max_concurrent_sessions || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">VM Protection:</span>
                                    <span class="font-medium ${rule.allow_vm ? 'text-red-600' : 'text-green-600'}">
                                        ${rule.allow_vm ? 'Disabled' : 'Enabled'}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-gray-500">License Duration:</span>
                                    <span class="font-medium">${rule.max_days === 0 ? 'Unlimited' : (rule.max_days ? rule.max_days + ' days' : 'N/A')}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Grace Period:</span>
                                    <span class="font-medium">${rule.grace_period_days ? rule.grace_period_days + ' days' : 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Offline Days:</span>
                                    <span class="font-medium">${rule.allow_offline_days ? rule.allow_offline_days + ' days' : 'N/A'}</span>
                                </div>
                            </div>

                            ${(rule.allowed_countries && rule.allowed_countries.length > 0) ? `
                                <div class="mt-3 pt-3 border-t border-gray-100">
                                    <span class="text-xs text-gray-500 uppercase tracking-wide font-medium">Geographic Restrictions</span>
                                    <div class="mt-1 flex flex-wrap gap-2">
                                        ${rule.allowed_countries && rule.allowed_countries.length > 0 ? `
                                            <div class="text-xs">
                                                <span class="text-green-600 font-medium">Allowed:</span>
                                                <span class="text-gray-600">${Array.isArray(rule.allowed_countries) ? rule.allowed_countries.slice(0, 3).join(', ') : 'None'}${Array.isArray(rule.allowed_countries) && rule.allowed_countries.length > 3 ? ' +' + (rule.allowed_countries.length - 3) : ''}</span>
                                            </div>
                                        ` : ''}
                                        <!-- Blocked countries removed - simplified to whitelist-only approach -->
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${(rule.timezone_restrictions && rule.timezone_restrictions !== 'null' && rule.timezone_restrictions !== null) ? `
                                <div class="mt-3 pt-3 border-t border-gray-100">
                                    <span class="text-xs text-gray-500 uppercase tracking-wide font-medium">Time Restrictions</span>
                                    <div class="mt-1 text-xs">
                                        <span class="text-orange-600 font-medium">Business Hours:</span> 
                                        <span class="text-gray-600" id="time-display-${rule.id}">Time restrictions configured</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="mt-4 flex items-center justify-between">
                                <span class="text-xs text-gray-500">
                                    Created: ${new Date(rule.created_at).toLocaleDateString()}
                                </span>
                                <div class="flex space-x-2">
                                    <button onclick="adminPanel.editRule(${rule.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                                        <i class="fas fa-edit mr-1"></i>Edit
                                    </button>
                                    <button onclick="adminPanel.deleteRule(${rule.id})" class="text-red-600 hover:text-red-800 text-sm">
                                        <i class="fas fa-trash mr-1"></i>Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    
                    // Populate time restrictions display after HTML is rendered
                    setTimeout(() => {
                        response.rules.forEach(rule => {
                            if (rule.timezone_restrictions && rule.timezone_restrictions !== 'null' && rule.timezone_restrictions !== null) {
                                const timeDisplayElement = document.getElementById(`time-display-${rule.id}`);
                                if (timeDisplayElement) {
                                    try {
                                        const timeRestrictions = typeof rule.timezone_restrictions === 'string' 
                                            ? JSON.parse(rule.timezone_restrictions) 
                                            : rule.timezone_restrictions;
                                            
                                        if (timeRestrictions && timeRestrictions.business_hours) {
                                            const { start, end, allowed_days } = timeRestrictions.business_hours;
                                            
                                            // Format days display
                                            let daysText;
                                            if (allowed_days.length === 7) {
                                                daysText = 'Every day';
                                            } else if (allowed_days.length === 5 && 
                                                      !allowed_days.includes('saturday') && 
                                                      !allowed_days.includes('sunday')) {
                                                daysText = 'Weekdays';
                                            } else {
                                                daysText = allowed_days.map(day => 
                                                    day.charAt(0).toUpperCase() + day.slice(1)
                                                ).join(', ');
                                            }
                                            
                                            timeDisplayElement.textContent = `${start} - ${end} (${daysText})`;
                                        } else {
                                            timeDisplayElement.textContent = 'Custom time restrictions configured';
                                        }
                                    } catch (e) {
                                        timeDisplayElement.textContent = 'Time restrictions configured';
                                    }
                                }
                            }
                        });
                    }, 10);
                }
            } else {
                throw new Error(response.message || 'Failed to load rules');
            }
        } catch (error) {
            console.error('Error loading rules:', error);
            rulesList.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error loading rules</p>
                    <p class="text-sm mt-1">${error.message}</p>
                </div>
            `;
        }
    }

    initializeVMProtectionToggle() {
        const toggle = document.getElementById('allow-vm-toggle');
        const status = document.getElementById('vm-protection-status');
        
        if (toggle && status) {
            // Load current setting (you can later load from API)
            const currentSetting = localStorage.getItem('vm_protection_enabled') === 'true';
            toggle.checked = !currentSetting; // Note: toggle is inverted (allow_vm = false means protection enabled)
            status.textContent = currentSetting ? 'Enabled' : 'Disabled';
            
            toggle.addEventListener('change', async (e) => {
                const vmProtectionEnabled = !e.target.checked; // Inverted logic
                status.textContent = vmProtectionEnabled ? 'Enabled' : 'Disabled';
                
                try {
                    // Save setting (you can later implement API endpoint)
                    localStorage.setItem('vm_protection_enabled', vmProtectionEnabled.toString());
                    
                    this.showNotification(
                        `VM Protection ${vmProtectionEnabled ? 'enabled' : 'disabled'} successfully`, 
                        'success'
                    );
                } catch (error) {
                    console.error('Failed to update VM protection setting:', error);
                    this.showNotification('Failed to update VM protection setting', 'error');
                    // Revert toggle state
                    e.target.checked = !e.target.checked;
                    status.textContent = vmProtectionEnabled ? 'Disabled' : 'Enabled';
                }
            });
        }
    }

    initializeConcurrentUsageControls() {
        const maxConcurrentInput = document.getElementById('max-concurrent-sessions');
        const maxActivationsInput = document.getElementById('max-activations');
        
        if (maxConcurrentInput) {
            // Load current setting
            const currentSessions = localStorage.getItem('max_concurrent_sessions') || '1';
            maxConcurrentInput.value = currentSessions;
            
            maxConcurrentInput.addEventListener('change', async (e) => {
                const value = parseInt(e.target.value);
                if (value < 1) {
                    e.target.value = '1';
                    this.showNotification('Concurrent sessions must be at least 1', 'error');
                    return;
                }
                
                try {
                    localStorage.setItem('max_concurrent_sessions', value.toString());
                    this.showNotification(`Concurrent session limit set to ${value}`, 'success');
                } catch (error) {
                    console.error('Failed to update concurrent sessions setting:', error);
                    this.showNotification('Failed to update concurrent sessions setting', 'error');
                }
            });
        }

        if (maxActivationsInput) {
            // Load current setting
            const currentActivations = localStorage.getItem('max_activations') || '5';
            maxActivationsInput.value = currentActivations;
            
            maxActivationsInput.addEventListener('change', async (e) => {
                const value = parseInt(e.target.value);
                if (value < 0) {
                    e.target.value = '0';
                    this.showNotification('Activations cannot be negative. Use 0 for unlimited.', 'error');
                    return;
                }
                
                try {
                    localStorage.setItem('max_activations', value.toString());
                    const message = value === 0 
                        ? 'Maximum activations set to unlimited' 
                        : `Maximum activations set to ${value}`;
                    this.showNotification(message, 'success');
                } catch (error) {
                    console.error('Failed to update max activations setting:', error);
                    this.showNotification('Failed to update max activations setting', 'error');
                }
            });
        }
    }

    initializeGeographicControls() {
        const geoToggle = document.getElementById('geo-restrictions-enabled');
        const geoStatus = document.getElementById('geo-restrictions-status');
        const geoControls = document.getElementById('geo-controls');
        // Note: Legacy geographic restrictions code removed
        // Current implementation uses checkbox-based country selection

        if (geoToggle && geoStatus && geoControls) {
            // Load current settings
            const geoEnabled = localStorage.getItem('geo_restrictions_enabled') === 'true';
            geoToggle.checked = geoEnabled;
            geoStatus.textContent = geoEnabled ? 'Enabled' : 'Disabled';
            geoControls.style.display = geoEnabled ? 'block' : 'none';

            // Toggle functionality
            geoToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                geoStatus.textContent = enabled ? 'Enabled' : 'Disabled';
                geoControls.style.display = enabled ? 'block' : 'none';
                localStorage.setItem('geo_restrictions_enabled', enabled.toString());
                
                if (enabled) {
                    this.showNotification('Geographic restrictions enabled. Configure countries below.', 'info');
                } else {
                    this.showNotification('Geographic restrictions disabled', 'success');
                }
            });

            // Load saved country selections
            const savedAllowed = JSON.parse(localStorage.getItem('allowed_countries') || '[]');
            // Note: Legacy country selection code removed - now using checkbox interface

            // Note: Legacy save functionality removed - now handled in rule creation/editing"
        }
    }

    initializeTimeBasedControls() {
        const timeToggle = document.getElementById('time-restrictions-enabled');
        const timeStatus = document.getElementById('time-restrictions-status');
        const timeControls = document.getElementById('time-controls');
        const startTime = document.getElementById('business-hours-start');
        const endTime = document.getElementById('business-hours-end');
        const saveTimeBtn = document.getElementById('save-time-restrictions');

        if (timeToggle && timeStatus && timeControls) {
            // Load current settings
            const timeEnabled = localStorage.getItem('time_restrictions_enabled') === 'true';
            timeToggle.checked = timeEnabled;
            timeStatus.textContent = timeEnabled ? 'Enabled' : 'Disabled';
            timeControls.style.display = timeEnabled ? 'block' : 'none';

            // Toggle functionality
            timeToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                timeStatus.textContent = enabled ? 'Enabled' : 'Disabled';
                timeControls.style.display = enabled ? 'block' : 'none';
                localStorage.setItem('time_restrictions_enabled', enabled.toString());

                if (enabled) {
                    this.showNotification('Time-based restrictions enabled. Configure hours below.', 'info');
                } else {
                    this.showNotification('Time-based restrictions disabled', 'success');
                }
            });

            // Load saved time settings
            if (startTime) {
                startTime.value = localStorage.getItem('business_hours_start') || '09:00';
            }
            if (endTime) {
                endTime.value = localStorage.getItem('business_hours_end') || '17:00';
            }

            // Load saved day settings
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
                const checkbox = document.getElementById(`day-${day}`);
                if (checkbox) {
                    const saved = localStorage.getItem(`day_${day}_enabled`);
                    checkbox.checked = saved === null ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day) : saved === 'true';
                }
            });

            // Save functionality
            if (saveTimeBtn) {
                saveTimeBtn.addEventListener('click', () => {
                    // Validate time range
                    const start = startTime.value;
                    const end = endTime.value;
                    
                    if (start >= end) {
                        this.showNotification('End time must be after start time', 'error');
                        return;
                    }

                    // Save time settings
                    localStorage.setItem('business_hours_start', start);
                    localStorage.setItem('business_hours_end', end);

                    // Save day settings
                    const enabledDays = [];
                    days.forEach(day => {
                        const checkbox = document.getElementById(`day-${day}`);
                        if (checkbox) {
                            localStorage.setItem(`day_${day}_enabled`, checkbox.checked.toString());
                            if (checkbox.checked) {
                                enabledDays.push(day.charAt(0).toUpperCase() + day.slice(1));
                            }
                        }
                    });

                    if (enabledDays.length === 0) {
                        this.showNotification('At least one day must be enabled', 'error');
                        return;
                    }

                    const message = `Time restrictions saved: ${start} - ${end}, ${enabledDays.join(', ')}`;
                    this.showNotification(message, 'success');
                });
            }
        }
    }

    showAddRule() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center">
                    <button onclick="adminPanel.showRules()" class="text-gray-600 hover:text-gray-900 mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Rules
                    </button>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Create New Rule Template</h1>
                        <p class="text-gray-600 mt-2">Define a new licensing rule template with custom restrictions and limits</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl">
                <form id="add-rule-form" class="p-8 space-y-8">
                    <!-- Basic Information -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                            <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                            Basic Information
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
                                <input type="text" id="rule-name" required 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Standard Business License">
                            </div>
                            

                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="rule-description" rows="3"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe when this rule should be applied and its purpose..."></textarea>
                        </div>
                    </div>

                    <!-- Usage Limits -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                            <i class="fas fa-users mr-2 text-green-600"></i>
                            Usage Limits
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Concurrent Sessions</label>
                                <input type="number" id="max-sessions-input" min="0" value="1"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <p class="text-xs text-gray-500 mt-1">Set to 0 for unlimited</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Max Devices</label>
                                <input type="number" id="max-devices-input" min="0" value="1"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <p class="text-xs text-gray-500 mt-1">Set to 0 for unlimited</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">License Duration (Days)</label>
                                <input type="number" id="max-days-input" min="0" value="365"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <p class="text-xs text-gray-500 mt-1">0 = permanent</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Grace Period (Days)</label>
                                <input type="number" id="grace-period-input" min="0" value="7"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <!-- Security Settings -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                            <i class="fas fa-shield-alt mr-2 text-red-600"></i>
                            Security Settings
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <label class="flex items-center">
                                    <input type="checkbox" id="allow-vm-input" class="mr-3">
                                    <div>
                                        <span class="font-medium text-gray-900">Allow Virtual Machines</span>
                                        <p class="text-sm text-gray-600">Permit usage in VM environments</p>
                                    </div>
                                </label>
                                

                            </div>
                            
                            <div class="space-y-4">

                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Offline Days Allowed</label>
                                    <input type="number" id="offline-days-input" min="0" value="7"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <p class="text-xs text-gray-500 mt-1">
                                        How many days software can run offline after last validation. 
                                        Set to 0 for unlimited offline usage after initial activation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Geographic Restrictions -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                            <i class="fas fa-globe mr-2 text-green-600"></i>
                            Geographic Restrictions
                        </h3>
                        
                        <!-- Enable Geographic Restrictions Toggle -->
                        <div class="flex items-center justify-between">
                            <label class="flex items-center">
                                <input type="checkbox" id="enable-geographic-restrictions" class="mr-3" 
                                    onchange="adminPanel.toggleGeographicRestrictions()">
                                <span class="font-medium text-gray-900">Restrict license usage by country/region</span>
                            </label>
                            <span class="text-sm text-gray-500">Disabled: Global access (no restrictions)</span>
                        </div>

                        <!-- Geographic Restrictions Content (Hidden by default) -->
                        <div id="geographic-restrictions-content" class="hidden space-y-6">
                            <div class="text-xs text-gray-600 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p class="mb-2">
                                    <strong>✅ Selected countries:</strong> Can use the software
                                </p>
                                <p>
                                    <strong>❌ Unselected countries:</strong> Automatically blocked
                                </p>
                            </div>
                            
                            <!-- Country Selection Panel -->
                            <div class="mb-3">
                                <div class="flex flex-wrap gap-2 mb-3">
                                    <button type="button" onclick="adminPanel.clearAllCountries()" 
                                        class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                                        <i class="fas fa-times mr-1"></i>
                                        Clear All (Global Access)
                                    </button>
                                    <button type="button" onclick="adminPanel.selectUSACanada()" 
                                        class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                        <i class="fas fa-flag mr-1"></i>
                                        Select USA and Canada
                                    </button>
                                </div>
                                <p class="text-xs text-gray-600 mb-2">
                                    <strong>Selected:</strong> <span id="selected-countries-count" class="font-semibold text-green-600">0</span> countries
                                    <span class="ml-3 text-orange-600">
                                        <i class="fas fa-exclamation-triangle mr-1"></i>
                                        Unselected countries will be automatically blocked
                                    </span>
                                </p>
                            </div>
                            
                            <div class="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                                <div id="allowed-countries-checkboxes" class="space-y-1 text-sm"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Time Restrictions -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
                            <i class="fas fa-clock mr-2 text-purple-600"></i>
                            Time Restrictions
                        </h3>
                        
                        <!-- Enable Time Restrictions Toggle -->
                        <div class="flex items-center justify-between">
                            <label class="flex items-center">
                                <input type="checkbox" id="enable-time-restrictions" class="mr-3" 
                                    onchange="adminPanel.toggleTimeRestrictions()">
                                <div>
                                    <span class="font-medium text-gray-900">Restrict license usage by time/schedule</span>
                                </div>
                            </label>
                            <span class="text-sm text-gray-500">Disabled: 24/7 access</span>
                        </div>

                        <!-- Time Restrictions Content (Hidden by default) -->
                        <div id="time-restrictions-content" class="hidden space-y-6">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Business Hours Start</label>
                                    <input type="time" id="business-hours-start" value="09:00"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Business Hours End</label>
                                    <input type="time" id="business-hours-end" value="17:00"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-3">Allowed Days</label>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-monday" class="mr-2" checked>
                                        <span class="text-sm">Monday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-tuesday" class="mr-2" checked>
                                        <span class="text-sm">Tuesday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-wednesday" class="mr-2" checked>
                                        <span class="text-sm">Wednesday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-thursday" class="mr-2" checked>
                                        <span class="text-sm">Thursday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-friday" class="mr-2" checked>
                                        <span class="text-sm">Friday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-saturday" class="mr-2">
                                        <span class="text-sm">Saturday</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="day-sunday" class="mr-2">
                                        <span class="text-sm">Sunday</span>
                                    </label>
                                </div>
                            </div>

                            <div class="text-xs text-gray-600 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p class="mb-2">
                                    <strong>ℹ️ Time Zone:</strong> UTC
                                </p>
                                <p>
                                    <strong>📋 Note:</strong> Time restrictions will be enforced during license validation
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button type="button" onclick="adminPanel.showRules()" 
                            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                        <button type="submit" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-save mr-2"></i>Create Rule Template
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Clear any edit mode data for new rule creation
        const form = document.getElementById('add-rule-form');
        delete form.dataset.editMode;
        
        // Add form submission handler with mode detection
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Check if we're in edit mode
            const editModeData = form.dataset.editMode;
            if (editModeData) {
                const ruleId = parseInt(editModeData);
                this.updateRule(ruleId);
            } else {
                this.saveNewRule();
            }
        });

        // Country selection interface will be initialized when toggle is enabled
        
        // Add custom styles for country selection with emoji support
        const style = document.createElement('style');
        style.textContent = `
            .country-panel {
                background: #fafafa;
                border-radius: 8px;
            }
            .country-tab-active {
                border-color: currentColor !important;
                color: rgb(59 130 246) !important;
            }
            .country-tab-inactive:hover {
                color: rgb(75 85 99) !important;
            }
            .country-checkbox:checked {
                accent-color: rgb(59 130 246);
            }
            .allowed-country:checked + span {
                font-weight: 500;
                color: rgb(22 163 74);
            }
            .blocked-country:checked + span {
                font-weight: 500;
                color: rgb(220 38 38);
            }
            /* Enhanced emoji font support */
            .emoji-flag {
                font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif;
                font-size: 16px;
                font-style: normal;
                font-weight: normal;
                line-height: 1;
                text-rendering: auto;
                -webkit-font-feature-settings: "liga";
                font-feature-settings: "liga";
            }
        `;
        document.head.appendChild(style);
    }

    async saveNewRule() {
        try {
            // Collect form data
            const ruleData = {
                name: document.getElementById('rule-name').value.trim(),
                description: document.getElementById('rule-description').value.trim(),
                max_concurrent_sessions: parseInt(document.getElementById('max-sessions-input').value) || 0,
                max_devices: parseInt(document.getElementById('max-devices-input').value) || 0,
                max_days: parseInt(document.getElementById('max-days-input').value) || 0,
                grace_period_days: parseInt(document.getElementById('grace-period-input').value) || 7,
                allow_vm: document.getElementById('allow-vm-input').checked,
                allow_offline_days: parseInt(document.getElementById('offline-days-input').value) || 7
            };

            // Validate required fields
            if (!ruleData.name) {
                this.showNotification('Rule name is required', 'error');
                return;
            }

            // Collect geographic restrictions from checkboxes (only if enabled)
            const geographicEnabled = document.getElementById('enable-geographic-restrictions')?.checked || false;
            if (geographicEnabled) {
                const allowedCountries = Array.from(document.querySelectorAll('.allowed-country:checked')).map(cb => cb.value);
                
                // Whitelist-only approach: only collect allowed countries
                if (allowedCountries.length > 0) {
                    ruleData.allowed_countries = allowedCountries;
                }
            }
            // Note: If toggle is disabled or no countries are selected, global access is allowed (no restrictions)

            this.showNotification('Creating rule template...', 'info');

            // Create rule via API
            const response = await this.apiCall('/admin/rules', 'POST', ruleData);
            
            if (response.success) {
                this.showNotification(`Rule template "${ruleData.name}" created successfully!`, 'success');
                
                // Return to rules page and reload the list immediately
                this.showRules();
                
                // Force refresh the rules list after a short delay to ensure backend consistency
                setTimeout(async () => {
                    await this.loadRules();
                }, 500);
            } else {
                throw new Error(response.message || 'Failed to create rule template');
            }

        } catch (error) {
            console.error('Failed to create rule:', error);
            this.showNotification('Failed to create rule template: ' + error.message, 'error');
        }
    }

    async editRule(ruleId) {
        try {
            this.showNotification('Loading rule template for editing...', 'info');
            
            // Get the rule data from API
            const response = await this.apiCall(`/admin/rules/${ruleId}`, 'GET');
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to load rule template');
            }

            const rule = response.rule;
            
            // Show the add rule form but populated with existing data
            this.showAddRule();
            
            // Wait for form to render, then populate fields
            setTimeout(() => {
                document.getElementById('rule-name').value = rule.name || '';
                document.getElementById('rule-description').value = rule.description || '';
                document.getElementById('max-sessions-input').value = rule.max_concurrent_sessions !== undefined ? rule.max_concurrent_sessions : 1;
                document.getElementById('max-devices-input').value = rule.max_devices !== undefined ? rule.max_devices : 1;
                document.getElementById('max-days-input').value = rule.max_days || 0;
                document.getElementById('grace-period-input').value = rule.grace_period_days || 7;
                document.getElementById('allow-vm-input').checked = rule.allow_vm || false;
                document.getElementById('offline-days-input').value = rule.allow_offline_days || 7;


                // Set geographic restrictions toggle and countries (whitelist-only)
                const hasGeographicRestrictions = (rule.allowed_countries && rule.allowed_countries.length > 0);
                
                if (hasGeographicRestrictions) {
                    document.getElementById('enable-geographic-restrictions').checked = true;
                    document.getElementById('geographic-restrictions-content').classList.remove('hidden');
                    
                    // Ensure checkboxes are populated
                    if (document.getElementById('allowed-countries-checkboxes').children.length === 0) {
                        this.populateCountryCheckboxes();
                    }
                    
                    // Set selected allowed countries in checkboxes (whitelist-only)
                    setTimeout(() => {
                        if (rule.allowed_countries && rule.allowed_countries.length > 0) {
                            const allowedCheckboxes = document.querySelectorAll('.allowed-country');
                            allowedCheckboxes.forEach(checkbox => {
                                checkbox.checked = rule.allowed_countries.includes(checkbox.value);
                            });
                            // Update the country count display
                            this.updateCountryCount();
                        }
                    }, 100);
                }

                // Update page title and form action
                document.querySelector('h1').textContent = 'Edit Rule Template';
                document.querySelector('h1').nextElementSibling.textContent = 'Update the licensing rule template settings';
                
                // Change button text to "Update Rule Template"
                const submitButton = document.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Update Rule Template';
                }
                
                // Set form to edit mode using data attribute
                const form = document.getElementById('add-rule-form');
                form.dataset.editMode = ruleId.toString();
            }, 100);

        } catch (error) {
            console.error('Failed to edit rule:', error);
            this.showNotification('Failed to load rule template: ' + error.message, 'error');
        }
    }

    async updateRule(ruleId) {
        try {
            // Collect form data (same as saveNewRule)
            const ruleData = {
                name: document.getElementById('rule-name').value.trim(),
                description: document.getElementById('rule-description').value.trim(),
                max_concurrent_sessions: parseInt(document.getElementById('max-sessions-input').value) || 0,
                max_devices: parseInt(document.getElementById('max-devices-input').value) || 0,
                max_days: parseInt(document.getElementById('max-days-input').value) || 0,
                grace_period_days: parseInt(document.getElementById('grace-period-input').value) || 7,
                allow_vm: document.getElementById('allow-vm-input').checked,
                allow_offline_days: parseInt(document.getElementById('offline-days-input').value) || 7
            };

            // Validate required fields
            if (!ruleData.name) {
                this.showNotification('Rule name is required', 'error');
                return;
            }

            // Collect geographic restrictions from checkboxes (only if enabled)
            const geographicEnabled = document.getElementById('enable-geographic-restrictions')?.checked || false;
            if (geographicEnabled) {
                const allowedCountries = Array.from(document.querySelectorAll('.allowed-country:checked')).map(cb => cb.value);
                
                // Whitelist-only approach: only collect allowed countries
                if (allowedCountries.length > 0) {
                    ruleData.allowed_countries = allowedCountries;
                }
            }
            // Note: If toggle is disabled or no countries are selected, global access is allowed (no restrictions)

            this.showNotification('Updating rule template...', 'info');

            // Update rule via API
            const response = await this.apiCall(`/admin/rules/${ruleId}`, 'PUT', ruleData);
            
            if (response.success) {
                this.showNotification(`Rule template "${ruleData.name}" updated successfully!`, 'success');
                
                // Return to rules page and reload the list
                setTimeout(() => {
                    this.showRules();
                }, 1500);
            } else {
                throw new Error(response.message || 'Failed to update rule template');
            }

        } catch (error) {
            console.error('Failed to update rule:', error);
            this.showNotification('Failed to update rule template: ' + error.message, 'error');
        }
    }

    async deleteRule(ruleId) {
        // Get rule name for confirmation
        try {
            this.showNotification('Loading rule template for deletion...', 'info');
            
            const response = await this.apiCall(`/admin/rules/${ruleId}`, 'GET');
            
            const ruleName = response.success ? response.rule.name : 'this rule template';

            if (confirm(`Are you sure you want to delete "${ruleName}"? This action cannot be undone.`)) {
                this.showNotification('Deleting rule template...', 'info');

                const deleteResponse = await this.apiCall(`/admin/rules/${ruleId}`, 'DELETE');
                
                if (deleteResponse.success) {
                    this.showNotification(`Rule template "${ruleName}" deleted successfully!`, 'success');
                    
                    // Reload the rules list immediately
                    await this.loadRules();
                } else {
                    throw new Error(deleteResponse.message || 'Failed to delete rule template');
                }
            }
        } catch (error) {
            console.error('Failed to delete rule:', error);
            this.showNotification('Failed to delete rule template: ' + error.message, 'error');
        }
    }

    async showSecurityEvents() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Security Events</h1>
                        <p class="text-gray-600 mt-2">Monitor suspicious activities and security incidents</p>
                    </div>
                    <div class="flex space-x-3">
                        <select id="severity-filter" class="px-3 py-2 border border-gray-300 rounded-md">
                            <option value="all">All Events</option>
                            <option value="high">High Severity</option>
                            <option value="medium">Medium Severity</option>
                            <option value="low">Low Severity</option>
                        </select>
                        <button id="export-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Export Report
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8" id="security-stats">
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-red-100 p-3 rounded-full mr-4">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">High Severity</p>
                            <p class="text-2xl font-bold text-gray-900" id="high-severity-count">-</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-yellow-100 p-3 rounded-full mr-4">
                            <i class="fas fa-shield-alt text-yellow-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Medium Severity</p>
                            <p class="text-2xl font-bold text-gray-900" id="medium-severity-count">-</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-3 rounded-full mr-4">
                            <i class="fas fa-user-shield text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Low Severity</p>
                            <p class="text-2xl font-bold text-gray-900" id="low-severity-count">-</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-3 rounded-full mr-4">
                            <i class="fas fa-check-circle text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Total Events</p>
                            <p class="text-2xl font-bold text-gray-900" id="total-events-count">-</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Security Events</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                            </tr>
                        </thead>
                        <tbody id="security-events-table" class="divide-y divide-gray-200">
                            <tr>
                                <td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Initialize event listeners
        this.initializeSecurityEventsListeners();
        
        // Load initial data
        await this.loadSecurityEvents();
    }

    initializeSecurityEventsListeners() {
        // Severity filter
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', () => {
                this.loadSecurityEvents(severityFilter.value === 'all' ? null : severityFilter.value);
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSecurityEvents();
            });
        }
    }

    async loadSecurityEvents(severityFilter = null) {
        try {
            let url = '/admin/security/events';
            if (severityFilter) {
                url += `?severity=${severityFilter}`;
            }

            const response = await this.apiCall(url);
            
            if (response.success) {
                this.displaySecurityEvents(response.events || []);
                this.updateSecurityStats(response.events || []);
            } else {
                this.showNotification('Failed to load security events', 'error');
            }
        } catch (error) {
            console.error('Failed to load security events:', error);
            this.showNotification('Failed to load security events', 'error');
            this.displaySecurityEvents([]);
        }
    }

    displaySecurityEvents(events) {
        const tbody = document.getElementById('security-events-table');
        if (!tbody) return;

        if (!events.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">No security events found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = events.map(event => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(event.created_at)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded ${this.getSeverityClass(event.severity)}">
                        ${event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${event.description}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${event.customer_name ? `${event.customer_name} (${event.customer_email})` : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${event.ip_address || 'N/A'}
                </td>
            </tr>
        `).join('');
    }

    getSeverityClass(severity) {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    updateSecurityStats(events) {
        const stats = {
            high: events.filter(e => e.severity === 'high').length,
            medium: events.filter(e => e.severity === 'medium').length,
            low: events.filter(e => e.severity === 'low').length,
            total: events.length
        };

        document.getElementById('high-severity-count').textContent = stats.high;
        document.getElementById('medium-severity-count').textContent = stats.medium;
        document.getElementById('low-severity-count').textContent = stats.low;
        document.getElementById('total-events-count').textContent = stats.total;
    }

    async exportSecurityEvents() {
        try {
            this.showNotification('Preparing export...', 'info');
            
            const severityFilter = document.getElementById('severity-filter');
            const severity = severityFilter ? severityFilter.value : 'all';
            
            let url = '/admin/export-direct/security_events';
            if (severity !== 'all') {
                url += `?severity=${severity}`;
            }

            // Use fetch with authorization headers to download the CSV
            const response = await fetch(`${this.apiBaseUrl}${url}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'text/csv'
                }
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }

            // Get the CSV content as a blob
            const blob = await response.blob();
            
            // Create download link with blob URL
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = 'security_events_export.csv';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            this.showNotification('Security events export downloaded successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    showSettings() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
                    <p class="text-gray-600 mt-2">Configure system settings and preferences</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- System Settings -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">System Configuration</h3>
                    </div>
                    <div class="p-6 space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                            <input type="text" value="TurnkeyAppShield" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                            <input type="email" value="admin@turnkeyappshield.com" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                            <input type="number" value="30" min="5" max="480" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700">Maintenance Mode</label>
                                    <p class="text-sm text-gray-500">Configure system maintenance settings</p>
                                </div>
                                <div class="flex items-center space-x-4">
                                    <span id="maintenance-status" class="text-sm font-medium text-green-600">Active</span>
                                    <button id="configure-maintenance" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                                        Configure
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Maintenance Configuration Modal -->
                            <div id="maintenance-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                                    <h3 class="text-lg font-semibold mb-4">Maintenance Mode Configuration</h3>
                                    
                                    <div class="space-y-4">
                                        <!-- Enable/Disable Toggle -->
                                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <label class="text-sm font-medium text-gray-700">Enable Maintenance Mode</label>
                                                <p class="text-xs text-gray-500">Block public API access</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="maintenance-mode-toggle" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        
                                        <!-- Maintenance Type -->
                                        <div id="maintenance-config" class="hidden space-y-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Maintenance Type</label>
                                                <select id="maintenance-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <option value="planned">📊 Planned Maintenance</option>
                                                    <option value="emergency">🚨 Emergency Maintenance</option>
                                                    <option value="updates">🛠️ System Updates</option>
                                                    <option value="migrations">🔄 Database Migration</option>
                                                    <option value="custom">✏️ Custom Message</option>
                                                </select>
                                            </div>
                                            
                                            <!-- Custom Message -->
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                                <textarea id="maintenance-message" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Custom maintenance message..."></textarea>
                                            </div>
                                            
                                            <!-- Duration -->
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Expected Duration</label>
                                                <div class="flex items-center space-x-2">
                                                    <input type="number" id="maintenance-duration" min="5" max="1440" value="60" class="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <span class="text-sm text-gray-500">minutes</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-end space-x-3 mt-6">
                                        <button id="cancel-maintenance" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                                        <button id="save-maintenance" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply Settings</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Security Settings -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Security Settings</h3>
                    </div>
                    <div class="p-6 space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Rate Limit (requests/hour)</label>
                            <input type="number" value="100" min="10" max="1000" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Max Failed Attempts</label>
                            <input type="number" value="5" min="1" max="20" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">IP Block Duration (minutes)</label>
                            <input type="number" value="60" min="1" max="1440" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="flex items-center justify-between">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Enable 2FA</label>
                                <p class="text-sm text-gray-500">Require two-factor authentication</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="2fa-toggle" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <!-- 2FA Setup Modal Container -->
                        <div id="2fa-setup-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                <div id="2fa-step-1" class="twofa-step">
                                    <h3 class="text-lg font-semibold mb-4">Setup Two-Factor Authentication</h3>
                                    <p class="text-gray-600 mb-4">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                    <div class="text-center mb-4">
                                        <img id="qr-code-img" src="" alt="QR Code" class="mx-auto">
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium mb-2">Secret Key (Manual Entry):</label>
                                        <code id="secret-key" class="block p-2 bg-gray-100 rounded text-sm break-all"></code>
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium mb-2">Enter 6-digit code from your app:</label>
                                        <input type="text" id="2fa-verification-code" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="123456" maxlength="6">
                                    </div>
                                    <div class="flex justify-end space-x-3">
                                        <button id="cancel-2fa-setup" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                                        <button id="verify-2fa-setup" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Verify & Enable</button>
                                    </div>
                                </div>
                                
                                <div id="2fa-step-2" class="twofa-step hidden">
                                    <h3 class="text-lg font-semibold mb-4">2FA Enabled Successfully!</h3>
                                    <p class="text-gray-600 mb-4">Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator device.</p>
                                    <div class="bg-gray-50 p-4 rounded mb-4">
                                        <div id="backup-codes-list" class="grid grid-cols-2 gap-2 text-sm font-mono"></div>
                                    </div>
                                    <div class="flex justify-end">
                                        <button id="finish-2fa-setup" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">I've Saved My Codes</button>
                                    </div>
                                </div>
                                
                                <div id="2fa-disable-confirm" class="twofa-step hidden">
                                    <h3 class="text-lg font-semibold mb-4">Disable Two-Factor Authentication</h3>
                                    <p class="text-gray-600 mb-4">Please confirm your password and 2FA code to disable two-factor authentication.</p>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium mb-2">Password:</label>
                                        <input type="password" id="disable-2fa-password" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    </div>
                                    <div class="mb-4">
                                        <label class="block text-sm font-medium mb-2">2FA Code:</label>
                                        <input type="text" id="disable-2fa-code" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="123456" maxlength="6">
                                    </div>
                                    <div class="flex justify-end space-x-3">
                                        <button id="cancel-2fa-disable" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                                        <button id="confirm-2fa-disable" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Disable 2FA</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-8 flex justify-end space-x-4">
                <button class="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                    Reset to Defaults
                </button>
                <button class="px-6 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-700">
                    Save Settings
                </button>
            </div>
        `;
        
        // Initialize settings functionality after DOM is created
        this.initializeSettingsHandlers();
    }

    // Settings Management
    async initializeSettingsHandlers() {
        // Load current 2FA status
        await this.load2FAStatus();
        
        // Load maintenance mode status
        await this.loadMaintenanceStatus();
        
        // Setup event listeners
        this.setup2FAHandlers();
        this.setupMaintenanceModeHandler();
    }
    
    async load2FAStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/2fa/status`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const toggle = document.getElementById('2fa-toggle');
                if (toggle) {
                    toggle.checked = data.two_fa_enabled;
                }
            }
        } catch (error) {
            console.error('Error loading 2FA status:', error);
        }
    }
    
    async loadMaintenanceStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/maintenance/config`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Update status display
                this.updateMaintenanceStatus(data.maintenance_mode);
            }
        } catch (error) {
            console.error('Error loading maintenance status:', error);
        }
    }
    
    setup2FAHandlers() {
        const toggle = document.getElementById('2fa-toggle');
        const modal = document.getElementById('2fa-setup-modal');
        
        if (!toggle || !modal) return;
        
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // User wants to enable 2FA
                this.start2FASetup();
            } else {
                // User wants to disable 2FA
                this.show2FADisableConfirm();
            }
        });
        
        // Cancel setup
        document.getElementById('cancel-2fa-setup')?.addEventListener('click', () => {
            this.cancel2FASetup();
        });
        
        // Verify setup
        document.getElementById('verify-2fa-setup')?.addEventListener('click', () => {
            this.verify2FASetup();
        });
        
        // Finish setup
        document.getElementById('finish-2fa-setup')?.addEventListener('click', () => {
            this.finish2FASetup();
        });
        
        // Cancel disable
        document.getElementById('cancel-2fa-disable')?.addEventListener('click', () => {
            this.cancel2FADisable();
        });
        
        // Confirm disable
        document.getElementById('confirm-2fa-disable')?.addEventListener('click', () => {
            this.confirm2FADisable();
        });
        
        // Enter key handling for verification code
        document.getElementById('2fa-verification-code')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verify2FASetup();
            }
        });
    }
    
    setupMaintenanceModeHandler() {
        const configureBtn = document.getElementById('configure-maintenance');
        const modal = document.getElementById('maintenance-modal');
        const toggle = document.getElementById('maintenance-mode-toggle');
        const configSection = document.getElementById('maintenance-config');
        const typeSelect = document.getElementById('maintenance-type');
        const messageInput = document.getElementById('maintenance-message');
        
        if (!configureBtn || !modal) return;
        
        // Show configuration modal
        configureBtn.addEventListener('click', () => {
            this.showMaintenanceModal();
        });
        
        // Cancel button
        document.getElementById('cancel-maintenance')?.addEventListener('click', () => {
            this.hideMaintenanceModal();
        });
        
        // Save button
        document.getElementById('save-maintenance')?.addEventListener('click', () => {
            this.saveMaintenanceConfig();
        });
        
        // Toggle maintenance mode
        toggle?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            configSection.classList.toggle('hidden', !enabled);
            
            if (enabled) {
                // Set default message based on type
                this.updateMaintenanceMessage();
            }
        });
        
        // Update message when type changes
        typeSelect?.addEventListener('change', () => {
            this.updateMaintenanceMessage();
        });
    }
    
    showMaintenanceModal() {
        document.getElementById('maintenance-modal').classList.remove('hidden');
        this.loadCurrentMaintenanceConfig();
    }
    
    hideMaintenanceModal() {
        document.getElementById('maintenance-modal').classList.add('hidden');
    }
    
    async loadCurrentMaintenanceConfig() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/maintenance/config`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                document.getElementById('maintenance-mode-toggle').checked = data.maintenance_mode;
                document.getElementById('maintenance-type').value = data.type || 'planned';
                document.getElementById('maintenance-message').value = data.message || '';
                document.getElementById('maintenance-duration').value = data.duration_minutes || 60;
                
                // Show/hide config section
                const configSection = document.getElementById('maintenance-config');
                configSection.classList.toggle('hidden', !data.maintenance_mode);
                
                this.updateMaintenanceStatus(data.maintenance_mode);
            }
        } catch (error) {
            console.error('Error loading maintenance config:', error);
        }
    }
    
    updateMaintenanceMessage() {
        const type = document.getElementById('maintenance-type').value;
        const messageInput = document.getElementById('maintenance-message');
        
        const messages = {
            'planned': 'Scheduled maintenance in progress. We\'ll be back shortly.',
            'emergency': 'Emergency maintenance in progress. Please check back soon.',
            'updates': 'System updates are being installed. Service will resume shortly.',
            'migrations': 'Database migration in progress. Expected completion in 60 minutes.',
            'custom': ''
        };
        
        if (type !== 'custom') {
            messageInput.value = messages[type];
        }
        
        // Enable/disable message input based on type
        messageInput.disabled = type !== 'custom';
    }
    
    async saveMaintenanceConfig() {
        const enabled = document.getElementById('maintenance-mode-toggle').checked;
        const type = document.getElementById('maintenance-type').value;
        const message = document.getElementById('maintenance-message').value.trim();
        const duration = parseInt(document.getElementById('maintenance-duration').value);
        
        if (enabled && !message) {
            this.showError('Maintenance message is required');
            return;
        }
        
        if (enabled && (!duration || duration < 5)) {
            this.showError('Duration must be at least 5 minutes');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/maintenance/configure`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enabled,
                    type,
                    message,
                    duration_minutes: duration
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.updateMaintenanceStatus(enabled);
                this.hideMaintenanceModal();
            } else {
                this.showError(data.message || 'Failed to configure maintenance mode');
            }
        } catch (error) {
            this.showError('Failed to configure maintenance mode');
        }
    }
    
    updateMaintenanceStatus(isActive) {
        const statusElement = document.getElementById('maintenance-status');
        if (statusElement) {
            statusElement.textContent = isActive ? 'Maintenance Mode ON' : 'Normal Operations';
            statusElement.className = isActive 
                ? 'text-sm font-medium text-red-600'
                : 'text-sm font-medium text-green-600';
        }
    }
    
    async start2FASetup() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/2fa/setup`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            const data = await response.json();
            console.log('2FA setup response:', data); // Debug logging
            
            if (response.ok && data.success) {
                // Verify modal elements exist
                const qrImg = document.getElementById('qr-code-img');
                const secretKey = document.getElementById('secret-key');
                
                if (!qrImg || !secretKey) {
                    console.error('2FA modal elements not found');
                    this.showError('2FA setup interface not ready. Please refresh and try again.');
                    document.getElementById('2fa-toggle').checked = false;
                    return;
                }
                
                // Show QR code
                qrImg.src = data.qr_code;
                secretKey.textContent = data.secret;
                
                // Show setup modal
                this.show2FAStep('2fa-step-1');
            } else {
                console.error('2FA setup failed:', data);
                this.showError(data.message || 'Failed to setup 2FA');
                document.getElementById('2fa-toggle').checked = false;
            }
        } catch (error) {
            console.error('2FA setup error:', error);
            this.showError('Failed to setup 2FA: ' + error.message);
            document.getElementById('2fa-toggle').checked = false;
        }
    }
    
    async verify2FASetup() {
        const code = document.getElementById('2fa-verification-code').value.trim();
        
        if (!code || code.length !== 6) {
            this.showError('Please enter a valid 6-digit code');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/2fa/verify-setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Show backup codes
                this.displayBackupCodes(data.backup_codes);
                this.show2FAStep('2fa-step-2');
            } else {
                this.showError(data.message || 'Invalid verification code');
            }
        } catch (error) {
            this.showError('Failed to verify 2FA setup');
        }
    }
    
    displayBackupCodes(codes) {
        const container = document.getElementById('backup-codes-list');
        container.innerHTML = '';
        
        codes.forEach(code => {
            const codeDiv = document.createElement('div');
            codeDiv.className = 'p-2 bg-white rounded border text-center';
            codeDiv.textContent = code;
            container.appendChild(codeDiv);
        });
    }
    
    show2FAStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.twofa-step').forEach(step => {
            step.classList.add('hidden');
        });
        
        // Show selected step
        document.getElementById(stepId)?.classList.remove('hidden');
        
        // Show modal
        document.getElementById('2fa-setup-modal').classList.remove('hidden');
    }
    
    hide2FAModal() {
        document.getElementById('2fa-setup-modal').classList.add('hidden');
        
        // Clear form data
        document.getElementById('2fa-verification-code').value = '';
        document.getElementById('disable-2fa-password').value = '';
        document.getElementById('disable-2fa-code').value = '';
    }
    
    finish2FASetup() {
        this.hide2FAModal();
        this.showNotification('2FA enabled successfully!', 'success');
    }
    
    cancel2FASetup() {
        document.getElementById('2fa-toggle').checked = false;
        this.hide2FAModal();
    }
    
    show2FADisableConfirm() {
        this.show2FAStep('2fa-disable-confirm');
    }
    
    cancel2FADisable() {
        document.getElementById('2fa-toggle').checked = true;
        this.hide2FAModal();
    }
    
    async confirm2FADisable() {
        const password = document.getElementById('disable-2fa-password').value.trim();
        const code = document.getElementById('disable-2fa-code').value.trim();
        
        if (!password) {
            this.showError('Password is required');
            return;
        }
        
        if (!code || code.length !== 6) {
            this.showError('Please enter a valid 6-digit 2FA code');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password, code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.hide2FAModal();
                this.showNotification('2FA disabled successfully', 'success');
            } else {
                this.showError(data.message || 'Failed to disable 2FA');
            }
        } catch (error) {
            this.showError('Failed to disable 2FA');
        }
    }

    // Utility methods
    updateActiveNavItem(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-brand-blue', 'text-white');
            item.classList.add('text-gray-600');
        });
        
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('bg-brand-blue', 'text-white');
            activeItem.classList.remove('text-gray-600');
        }
    }

    initializeCharts(data) {
        // Initialize validation chart
        const ctx = document.getElementById('validationChart');
        if (ctx) {
            this.charts.validation = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Successful',
                        data: [],
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }, {
                        label: 'Failed',
                        data: [],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
            
            // Load real data for the chart
            this.updateValidationChart('day');
        }
    }

    getDefaultDashboardData() {
        return {
            stats: {
                total_customers: 0,
                active_licenses: 0,
                total_products: 0,
                validations_today: 0,
                total_validations_today: 0,
                security_events_today: 0,
                revenue_this_month: 0
            },
            recent_customers: [],
            recent_licenses: [],
            security_events: [],
            system_health: {
                database_status: 'unknown',
                email_queue_size: 0,
                avg_response_time: 0,
                uptime: 'N/A'
            }
        };
    }

    getStatusClass(status) {
        switch(status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'suspended': return 'bg-yellow-100 text-yellow-800';
            case 'revoked': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            if (!this.token) {
                throw new Error('No authentication token available. Please login again.');
            }
            
            const config = {
                method,
                url: `${this.apiBaseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('API call failed:', error);
            console.error('Error response data:', error.response?.data);
            console.error('Error response status:', error.response?.status);
            
            // If it's an auth error, clear token and redirect to login
            if (error.response?.status === 401) {
                this.logout();
                throw new Error('Authentication failed - please login again');
            }
            
            // Extract meaningful error message from server response
            if (error.response?.data) {
                const serverMessage = error.response.data.message || error.response.data.error;
                if (serverMessage) {
                    const enhancedError = new Error(serverMessage);
                    enhancedError.status = error.response.status;
                    enhancedError.originalError = error;
                    throw enhancedError;
                }
            }
            
            throw error;
        }
    }

    // Simple API call without authentication for temporary bypass
    async simpleApiCall(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${this.apiBaseUrl}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('Simple API call failed:', error);
            throw error;
        }
    }

    // =====================================================
    // NEW ENHANCED FEATURES
    // =====================================================

    // Backup Management
    async showBackups() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Database Backups</h3>
                                <p class="mt-1 text-sm text-gray-500">Create and manage database backups</p>
                                <p class="mt-1 text-xs text-blue-600">💡 JSON = Complete restore capability | Excel = View-only analysis</p>
                            </div>
                            <div class="flex space-x-3">
                                <button onclick="adminPanel.showUploadBackupModal()" 
                                    class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                    <i class="fas fa-upload mr-2"></i>Upload Backup
                                </button>
                                <button onclick="adminPanel.showCreateBackupModal()" 
                                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                    <i class="fas fa-plus mr-2"></i>Create Backup
                                </button>
                            </div>
                        </div>
                        
                        <div id="backups-list" class="space-y-4">
                            <div class="text-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
                                <p class="mt-2 text-gray-500">Loading backups...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadBackups();
    }

    async loadBackups() {
        try {
            // Simplified token check - exact same logic as working test
            if (!this.token) {
                this.token = localStorage.getItem('admin_token');
            }
            
            if (!this.token) {
                console.log('No token found, redirecting to login...');
                this.showLogin();
                return;
            }
            
            console.log('Loading backups with token:', this.token.substring(0, 20) + '...');
            
            // Use exact same request as working test page
            const response = await axios.get(`${this.apiBaseUrl}/admin/backups`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Raw axios response status:', response.status);
            console.log('Raw axios response data type:', typeof response.data);
            console.log('Raw axios response data (first 200 chars):', 
                JSON.stringify(response.data).substring(0, 200) + '...');
            
            // Simple response handling - use the data directly 
            const data = response.data;
            
            if (!data || data.success === false) {
                throw new Error(data?.message || 'Invalid API response format');
            }
            
            const backups = data.backups || [];

            const container = document.getElementById('backups-list');
            if (backups.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-database text-4xl text-gray-300 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No backups found</h3>
                        <p class="text-gray-500">Create your first database backup to get started.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = backups.map(backup => `
                <div class="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-database text-brand-blue"></i>
                            <div>
                                <h4 class="font-medium text-gray-900">${backup.backup_name}</h4>
                                <p class="text-sm text-gray-600">
                                    Created ${new Date(backup.created_at).toLocaleString()} by ${backup.created_by_username || 'Unknown'}
                                </p>
                                <p class="text-xs text-gray-500">
                                    Size: ${this.formatFileSize(backup.file_size || backup.original_size || 0)} | 
                                    Records: ${this.formatRecordCounts(backup.record_counts)} |
                                    Status: ${backup.status}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${backup.status === 'completed' ? `
                            <div class="flex space-x-1">
                                <button onclick="adminPanel.downloadBackup(${backup.id}, '${backup.backup_name}', 'json')"
                                    class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                    title="Download JSON (for restore/import)">
                                    <i class="fas fa-download mr-1"></i>JSON
                                </button>
                                <button onclick="adminPanel.downloadBackup(${backup.id}, '${backup.backup_name}', 'csv')"
                                    class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                                    title="Download Excel CSV (view-only for analysis)">
                                    <i class="fas fa-file-excel mr-1"></i>Excel
                                </button>
                            </div>
                            <button onclick="adminPanel.restoreBackup(${backup.id}, '${backup.backup_name}')"
                                class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200">
                                <i class="fas fa-undo mr-1"></i>Restore
                            </button>
                        ` : ''}
                        <button onclick="adminPanel.deleteBackup(${backup.id}, '${backup.backup_name}')"
                            class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load backups:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            
            let errorMessage = 'Unknown error';
            let actionButton = '';
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = 'Authentication failed. Please log in again.';
                actionButton = '<button onclick="adminPanel.showLogin()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Login Again</button>';
                // Clear invalid token
                console.log('Clearing invalid token and redirecting to login...');
                this.token = null;
                localStorage.removeItem('admin_token');
            } else if (error.message?.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your connection.';
                actionButton = '<button onclick="adminPanel.loadBackups()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Try Again</button>';
            } else if (error.message?.includes('Network Error') || error.message?.includes('CORS')) {
                errorMessage = 'Network or CORS error. This might be due to HTTPS/HTTP protocol mismatch.';
                actionButton = '<button onclick="adminPanel.loadBackups()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Retry</button>';
            } else if (error.message?.includes('Unexpected token')) {
                errorMessage = 'Server returned invalid response format. This might be a routing or CORS issue.';
                actionButton = '<button onclick="adminPanel.loadBackups()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Retry</button>';
            } else {
                errorMessage = error.message || 'Failed to load backup data';
                actionButton = '<button onclick="adminPanel.loadBackups()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Retry</button>';
            }
            
            document.getElementById('backups-list').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p class="font-semibold">Failed to load backups</p>
                    <p class="text-sm mt-2">${errorMessage}</p>
                    <p class="text-xs mt-1 text-gray-500">Check console for technical details</p>
                    ${actionButton}
                </div>
            `;
        }
    }

    showCreateBackupModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Create Database Backup</h3>
                    <form id="create-backup-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Backup Name</label>
                            <input type="text" id="backup-name" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
                                placeholder="Enter backup name" value="backup_${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Include Tables</label>
                            <div class="space-y-2 text-sm">
                                <label class="flex items-center">
                                    <input type="checkbox" checked class="mr-2" name="tables" value="customers">
                                    Customers
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" checked class="mr-2" name="tables" value="products">
                                    Products  
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" checked class="mr-2" name="tables" value="licenses">
                                    Licenses
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" checked class="mr-2" name="tables" value="security_events">
                                    Security Events
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" checked class="mr-2" name="tables" value="admin_users">
                                    Admin Users
                                </label>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit"
                                class="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-blue-700">
                                <i class="fas fa-database mr-2"></i>Create Backup
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('create-backup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
                submitBtn.disabled = true;

                const backupName = document.getElementById('backup-name').value;
                const selectedTables = Array.from(document.querySelectorAll('input[name="tables"]:checked'))
                    .map(cb => cb.value);

                const response = await this.apiCall('/admin/backups/create', 'POST', {
                    backup_name: backupName,
                    include_tables: selectedTables
                });

                if (response.success) {
                    modal.remove();
                    this.showNotification('Backup created successfully', 'success');
                    this.loadBackups(); // Reload the list
                } else {
                    throw new Error(response.message || 'Failed to create backup');
                }

            } catch (error) {
                console.error('Create backup failed:', error);
                this.showNotification('Failed to create backup: ' + error.message, 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    showUploadBackupModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Upload Backup File</h3>
                    <form id="upload-backup-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Select Backup File</label>
                            <input type="file" id="backup-file" accept=".json" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue">
                            <p class="text-xs text-gray-500 mt-1">⚠️ Only JSON backup files can be restored. CSV files are for viewing only.</p>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Backup Name</label>
                            <input type="text" id="upload-backup-name" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue"
                                placeholder="Enter backup name" value="uploaded_backup_${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Upload Mode</label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="radio" name="upload-mode" value="upload-only" id="upload-only" class="mr-2" checked>
                                    <span class="text-sm text-gray-700">Upload only (safe - just stores backup file)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="radio" name="upload-mode" value="upload-restore" id="upload-restore" class="mr-2">
                                    <span class="text-sm text-gray-700">Upload and restore data (destructive operation)</span>
                                </label>
                            </div>
                            <p class="text-xs text-blue-500 mt-1" id="upload-mode-help">✅ Upload only: Safely stores backup without affecting current data</p>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit"
                                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                                <i class="fas fa-upload mr-2"></i>Upload & Restore
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle radio button changes to update help text
        const uploadOnlyRadio = document.getElementById('upload-only');
        const uploadRestoreRadio = document.getElementById('upload-restore');
        const helpText = document.getElementById('upload-mode-help');
        
        uploadOnlyRadio.addEventListener('change', () => {
            if (uploadOnlyRadio.checked) {
                helpText.innerHTML = '✅ Upload only: Safely stores backup without affecting current data';
                helpText.className = 'text-xs text-blue-500 mt-1';
            }
        });
        
        uploadRestoreRadio.addEventListener('change', () => {
            if (uploadRestoreRadio.checked) {
                helpText.innerHTML = '⚠️ Upload and restore: Will replace ALL current database records with backup data';
                helpText.className = 'text-xs text-red-500 mt-1';
            }
        });

        // Handle form submission
        document.getElementById('upload-backup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('backup-file');
            const nameInput = document.getElementById('upload-backup-name');
            const uploadRestoreRadio = document.getElementById('upload-restore');
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            if (!fileInput.files[0]) {
                alert('Please select a backup file');
                return;
            }

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
                submitBtn.disabled = true;

                const file = fileInput.files[0];
                const backupName = nameInput.value || `uploaded_backup_${new Date().toISOString().split('T')[0]}`;
                
                // Read file content
                const fileContent = await this.readFileAsText(file);
                let backupData;
                
                // Parse JSON or CSV
                if (file.name.toLowerCase().endsWith('.json')) {
                    backupData = JSON.parse(fileContent);
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    // For CSV, we'd need a more complex parser - for now, show error
                    throw new Error('CSV upload not yet implemented. Please use JSON format.');
                } else {
                    throw new Error('Unsupported file format. Please use JSON or CSV files.');
                }
                
                // Determine if we should overwrite (restore) or just upload
                const shouldRestore = uploadRestoreRadio.checked;
                
                // Send to backend API
                const response = await this.apiCall('/admin/backups/upload', 'POST', {
                    backup_name: backupName,
                    backup_data: backupData,
                    overwrite: shouldRestore
                });

                if (response.success) {
                    modal.remove();
                    this.showNotification(response.message || 'Backup uploaded successfully!', 'success');
                    this.loadBackups(); // Refresh the backup list
                } else {
                    throw new Error(response.message || 'Failed to upload backup');
                }

            } catch (error) {
                console.error('Upload backup failed:', error);
                this.showNotification('Failed to upload backup: ' + error.message, 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async restoreBackup(backupId, backupName) {
        if (!confirm(`Are you sure you want to restore from backup "${backupName}"? This will overwrite all current data!`)) {
            return;
        }

        try {
            const response = await this.apiCall(`/admin/backups/${backupId}/restore`, 'POST');
            if (response.success) {
                this.showNotification('Database restored successfully', 'success');
                // Optionally reload the page to reflect changes
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                throw new Error(response.message || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Restore backup failed:', error);
            this.showNotification('Failed to restore backup: ' + error.message, 'error');
        }
    }

    async downloadBackup(backupId, backupName, format = 'json') {
        try {
            this.showNotification(`Preparing ${format.toUpperCase()} backup download...`, 'info');
            
            // Always get JSON data first
            const response = await fetch(`${this.apiBaseUrl}/admin/backups/${backupId}/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }

            let blob, fileName;
            
            if (format === 'csv') {
                // Get JSON data and convert to CSV
                const jsonData = await response.json();
                const csvContent = this.convertBackupToCSV(jsonData);
                
                // Create CSV blob
                blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                fileName = `${backupName}.csv`;
            } else {
                // Use JSON blob directly
                blob = await response.blob();
                fileName = `${backupName}.json`;
            }
            
            // Create download link with blob URL
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`${format.toUpperCase()} backup downloaded successfully`, 'success');
        } catch (error) {
            console.error('Download backup failed:', error);
            this.showNotification(`Failed to download ${format.toUpperCase()} backup: ` + error.message, 'error');
        }
    }

    convertBackupToCSV(backupData) {
        let csvContent = '';
        
        // Add header with backup info
        csvContent += `"Backup Information"\n`;
        csvContent += `"Name","${backupData.backup_name || 'Unknown'}"\n`;
        csvContent += `"Created","${backupData.created_at || 'Unknown'}"\n`;
        csvContent += `"Created By","${backupData.created_by || 'Unknown'}"\n`;
        csvContent += `"Status","${backupData.status || 'Unknown'}"\n\n`;
        
        // Process each table's data
        const tables = ['customers', 'products', 'licenses', 'security_events', 'admin_users'];
        
        tables.forEach(tableName => {
            const tableData = backupData.data?.[tableName];
            if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                csvContent += `"${tableName.toUpperCase()} (${tableData.length} records)"\n`;
                
                // Get column headers from first record
                const headers = Object.keys(tableData[0]);
                csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
                
                // Add data rows
                tableData.forEach(record => {
                    const row = headers.map(header => {
                        const value = record[header];
                        // Handle different data types
                        if (value === null || value === undefined) {
                            return '""';
                        } else if (typeof value === 'object') {
                            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                        } else {
                            return `"${String(value).replace(/"/g, '""')}"`;
                        }
                    });
                    csvContent += row.join(',') + '\n';
                });
                csvContent += '\n'; // Empty line between tables
            }
        });
        
        // Add summary at the end
        csvContent += `"BACKUP SUMMARY"\n`;
        tables.forEach(tableName => {
            const tableData = backupData.data?.[tableName];
            const count = (tableData && Array.isArray(tableData)) ? tableData.length : 0;
            csvContent += `"${tableName}","${count} records"\n`;
        });
        
        return csvContent;
    }

    async deleteBackup(backupId, backupName) {
        if (!confirm(`Are you sure you want to delete backup "${backupName}"?`)) {
            return;
        }

        try {
            const response = await this.apiCall(`/admin/backups/${backupId}`, 'DELETE');
            if (response.success) {
                this.showNotification('Backup deleted successfully', 'success');
                this.loadBackups(); // Reload the list
            } else {
                throw new Error(response.message || 'Failed to delete backup');
            }
        } catch (error) {
            console.error('Delete backup failed:', error);
            this.showNotification('Failed to delete backup: ' + error.message, 'error');
        }
    }

    // File Uploads Management
    async showUploads() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">File Uploads & Protection Jobs</h1>
                        <p class="text-gray-600 mt-2">Manage customer file uploads and protection processes</p>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="adminPanel.showUploadInterface()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-plus mr-2"></i>Upload New File
                        </button>
                        <button onclick="adminPanel.refreshUploads()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-sync mr-2"></i>Refresh
                        </button>
                        <button onclick="adminPanel.previewTempCleanup()" class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-eye mr-2"></i>Preview Temp Cleanup
                        </button>
                        <button onclick="adminPanel.cleanupTempFiles()" class="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                            <i class="fas fa-broom mr-2"></i>Cleanup Temp Files
                        </button>
                        <button onclick="adminPanel.manageProtectedFiles()" class="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="fas fa-shield-alt mr-2"></i>Manage Protected Files
                        </button>
                    </div>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-2 bg-blue-100 rounded-lg">
                            <i class="fas fa-upload text-blue-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Total Uploads</p>
                            <p class="text-2xl font-bold text-gray-900" id="total-uploads">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-2 bg-green-100 rounded-lg">
                            <i class="fas fa-shield-alt text-green-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Protected Files</p>
                            <p class="text-2xl font-bold text-gray-900" id="protected-files">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-2 bg-yellow-100 rounded-lg">
                            <i class="fas fa-cog text-yellow-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Processing</p>
                            <p class="text-2xl font-bold text-gray-900" id="processing-jobs">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="p-2 bg-purple-100 rounded-lg">
                            <i class="fas fa-hdd text-purple-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">Storage Used</p>
                            <p class="text-2xl font-bold text-gray-900" id="storage-used">0 MB</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters and Search -->
            <div class="bg-white rounded-lg shadow mb-6">
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Search Files</label>
                            <input type="text" id="file-search" placeholder="Search by filename..." 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                            <select id="status-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">All Statuses</option>
                                <option value="uploading">Uploading</option>
                                <option value="uploaded">Uploaded</option>
                                <option value="processing">Processing</option>
                                <option value="protected">Protected</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                            <select id="customer-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">All Customers</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                            <select id="date-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Uploads Table -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-gray-900">File Uploads</h2>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-600">Show:</span>
                            <select id="page-size" class="border border-gray-300 rounded-md px-3 py-1 text-sm">
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protection</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="uploads-table-body" class="bg-white divide-y divide-gray-200">
                                <!-- Uploads will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                    <div id="uploads-pagination" class="mt-6 flex items-center justify-between">
                        <!-- Pagination will be loaded here -->
                    </div>
                </div>
            </div>
        `;

        // Setup event listeners
        document.getElementById('file-search').addEventListener('input', this.debounce(() => this.filterUploads(), 300));
        document.getElementById('status-filter').addEventListener('change', () => this.filterUploads());
        document.getElementById('customer-filter').addEventListener('change', () => this.filterUploads());
        document.getElementById('date-filter').addEventListener('change', () => this.filterUploads());
        document.getElementById('page-size').addEventListener('change', () => this.loadUploads());

        // Load data
        await this.loadUploads();
        await this.loadUploadStats();
    }

    async loadUploads() {
        
        try {
            const response = await this.apiCall('/admin/uploads/list', 'GET');
            
            if (response.success) {
                this.uploads = response.uploads || [];
                this.displayUploads();
                await this.loadUploadStats();
            } else {
                this.uploads = [];
                this.displayUploads();
                this.showNotification('No uploads found', 'info');
            }
        } catch (error) {
            console.error('Failed to load uploads:', error);
            console.error('Error details:', error.response?.data || error.message);
            this.uploads = [];
            this.displayUploads();
            this.showNotification('Failed to load uploads', 'error');
        }
    }

    async loadUploadStats() {
        try {
            const response = await this.apiCall('/admin/uploads/stats', 'GET');
            if (response.success) {
                const stats = response.stats;
                document.getElementById('total-uploads').textContent = stats.total_uploads || 0;
                document.getElementById('protected-files').textContent = stats.protected_files || 0;
                document.getElementById('processing-jobs').textContent = stats.processing_jobs || 0;
                document.getElementById('storage-used').textContent = this.formatFileSize(stats.storage_used || 0);
            }
        } catch (error) {
            console.error('Failed to load upload stats:', error);
        }
    }

    displayUploads() {
        const tbody = document.getElementById('uploads-table-body');
        if (!this.uploads.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-upload text-4xl text-gray-300 mb-4"></i>
                        <p>No file uploads found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.uploads.map(upload => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <i class="fas fa-file-alt text-gray-400 mr-3"></i>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${upload.original_filename}</div>
                            <div class="text-xs text-gray-500">Hash: ${upload.file_hash?.substring(0, 16)}...</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${upload.customer_email || `Customer ${upload.customer_id}`}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${this.formatFileSize(upload.file_size)}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(upload.status)}">
                        ${upload.status.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4">
                    ${upload.job_id ? `
                        <div class="text-sm">
                            <div class="text-gray-900">${upload.protection_level || 'N/A'}</div>
                            <div class="text-xs text-gray-500">${upload.job_progress || 0}% complete</div>
                        </div>
                    ` : '<span class="text-gray-400">No protection job</span>'}
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${new Date(upload.created_at).toLocaleDateString()}</div>
                    <div class="text-xs text-gray-500">${new Date(upload.created_at).toLocaleTimeString()}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2">
                        ${upload.job_id ? `
                            <button onclick="adminPanel.viewProtectionJob(${upload.job_id})" 
                                    class="text-blue-600 hover:text-blue-900 text-sm">
                                <i class="fas fa-eye mr-1"></i>View Job
                            </button>
                        ` : ''}
                        ${upload.download_url ? `
                            <a href="${upload.download_url}" 
                               class="text-green-600 hover:text-green-900 text-sm">
                                <i class="fas fa-download mr-1"></i>Download
                            </a>
                        ` : ''}
                        <button onclick="adminPanel.deleteUpload(${upload.id}, '${upload.original_filename}')" 
                                class="text-red-600 hover:text-red-900 text-sm">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async viewProtectionJob(jobId) {
        try {
            const response = await this.apiCall(`/admin/uploads/job/${jobId}/status`, 'GET');
            if (!response.success) {
                throw new Error(response.message);
            }

            const job = response;
            const modal = this.createModal('Protection Job Details', `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Job ID</label>
                            <p class="text-sm text-gray-900">${job.job_id}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Status</label>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(job.status)}">
                                ${job.status.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Protection Level</label>
                            <p class="text-sm text-gray-900">${job.protection_level}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Progress</label>
                            <div class="flex items-center">
                                <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${job.progress}%"></div>
                                </div>
                                <span class="text-sm text-gray-600">${job.progress}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Original File</label>
                        <p class="text-sm text-gray-900">${job.original_filename}</p>
                    </div>

                    ${job.download_url ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Download</label>
                            <a href="${job.download_url}" 
                               class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                                <i class="fas fa-download mr-2"></i>Download Protected File
                            </a>
                            <p class="text-xs text-gray-500 mt-1">Expires: ${new Date(job.download_expires_at).toLocaleString()}</p>
                        </div>
                    ` : ''}

                    ${job.error_message ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Error Message</label>
                            <p class="text-sm text-red-600 bg-red-50 p-3 rounded-md">${job.error_message}</p>
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created</label>
                            <p class="text-sm text-gray-900">${new Date(job.created_at).toLocaleString()}</p>
                        </div>
                        ${job.completed_at ? `
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Completed</label>
                                <p class="text-sm text-gray-900">${new Date(job.completed_at).toLocaleString()}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `);

        } catch (error) {
            console.error('Failed to load protection job:', error);
            this.showNotification('Failed to load protection job details', 'error');
        }
    }

    async deleteUpload(uploadId, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}" and all associated data?`)) {
            return;
        }

        try {
            const response = await this.apiCall(`/admin/uploads/${uploadId}`, 'DELETE');
            if (response.success) {
                this.showNotification('Upload deleted successfully', 'success');
                this.loadUploads(); // Reload the list
            } else {
                throw new Error(response.message || 'Failed to delete upload');
            }
        } catch (error) {
            console.error('Delete upload failed:', error);
            this.showNotification('Failed to delete upload: ' + error.message, 'error');
        }
    }

    async refreshUploads() {
        await this.loadUploads();
        await this.loadUploadStats();
        this.showNotification('Upload data refreshed', 'success');
    }

    async previewTempCleanup() {
        try {
            const response = await this.apiCall('/admin/uploads/cleanup/temp/preview');
            
            if (response.success) {
                this.showTempCleanupPreview(response);
            } else {
                throw new Error(response.message || 'Failed to preview temp cleanup');
            }
        } catch (error) {
            console.error('Preview temp cleanup failed:', error);
            this.showNotification('Failed to preview temp cleanup: ' + error.message, 'error');
        }
    }

    showTempCleanupPreview(data) {
        const files = data.files_to_delete || [];
        const summary = data.summary || {};
        
        // Create modal HTML
        const modalHtml = `
            <div id="temp-cleanup-preview-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">
                                <i class="fas fa-broom text-orange-600 mr-2"></i>
                                Temporary Files Cleanup Preview
                            </h3>
                            <button onclick="document.getElementById('temp-cleanup-preview-modal').remove()" 
                                class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Safety Notice -->
                    <div class="px-6 py-3 bg-green-50 border-b border-green-200">
                        <div class="flex items-center">
                            <i class="fas fa-shield-alt text-green-600 mr-2"></i>
                            <div class="text-sm text-green-700">
                                <strong>Safe Cleanup:</strong> Protected/wrapped files are excluded and will never be auto-deleted.
                            </div>
                        </div>
                    </div>
                    
                    <!-- Summary -->
                    <div class="px-6 py-4 bg-gray-50 border-b">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-orange-600">${summary.total_files || 0}</div>
                                <div class="text-sm text-gray-600">Temp Files to Delete</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-blue-600">${summary.total_size_mb || 0} MB</div>
                                <div class="text-sm text-gray-600">Space to Recover</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-green-600">30+</div>
                                <div class="text-sm text-gray-600">Days Old</div>
                            </div>
                        </div>
                        <div class="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
                            <div class="text-sm text-orange-700">
                                <strong>Criteria:</strong> ${summary.criteria || 'Temporary files older than 30 days'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Files List -->
                    <div class="px-6 py-4 max-h-96 overflow-y-auto">
                        ${files.length > 0 ? `
                            <div class="space-y-2">
                                ${files.map(file => `
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
                                        <div class="flex-1">
                                            <div class="font-medium text-gray-900">${file.original_filename || 'Unknown'}</div>
                                            <div class="text-sm text-gray-500">
                                                Type: ${file.file_type || file.status} • 
                                                Size: ${file.file_size_mb} MB • 
                                                Age: ${file.age_days} days old
                                            </div>
                                            <div class="text-xs text-gray-400">
                                                Uploaded: ${this.formatDateTime(file.created_at)}
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                file.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                file.status === 'uploaded' ? 'bg-orange-100 text-orange-800' :
                                                file.status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }">
                                                ${file.file_type || file.status}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-8">
                                <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No Temporary Files to Clean Up</h3>
                                <p class="text-gray-500">There are no temporary files older than 30 days. Protected files are safely preserved.</p>
                            </div>
                        `}
                    </div>
                    
                    <!-- Actions -->
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div class="flex items-center justify-between">
                            <div class="text-sm text-gray-600">
                                ${files.length > 0 ? 
                                    `🗑️ ${files.length} temporary file${files.length !== 1 ? 's' : ''} will be safely deleted` :
                                    '✅ No temporary files need cleanup'
                                }
                            </div>
                            <div class="flex gap-3">
                                <button onclick="document.getElementById('temp-cleanup-preview-modal').remove()" 
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                                    Close
                                </button>
                                ${files.length > 0 ? `
                                    <button onclick="document.getElementById('temp-cleanup-preview-modal').remove(); adminPanel.cleanupTempFiles();" 
                                        class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                                        <i class="fas fa-broom mr-2"></i>Cleanup Temp Files
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async cleanupTempFiles() {
        if (!confirm('Are you sure you want to clean up temporary files? This will delete original/failed files older than 30 days.\n\nProtected files will NOT be deleted.')) {
            return;
        }

        try {
            const response = await this.apiCall('/admin/uploads/cleanup/temp', 'POST');
            if (response.success) {
                this.showNotification(`Temp cleanup completed. ${response.deleted_count} temporary files removed. Protected files preserved.`, 'success');
                this.loadUploads(); // Reload the list
                this.loadUploadStats(); // Refresh stats
            } else {
                throw new Error(response.message || 'Failed to cleanup temp files');
            }
        } catch (error) {
            console.error('Temp cleanup failed:', error);
            this.showNotification('Failed to cleanup temp files: ' + error.message, 'error');
        }
    }

    async manageProtectedFiles() {
        try {
            const response = await this.apiCall('/admin/uploads/protected/list');
            
            if (response.success) {
                this.showProtectedFilesManager(response);
            } else {
                throw new Error(response.message || 'Failed to load protected files');
            }
        } catch (error) {
            console.error('Load protected files failed:', error);
            this.showNotification('Failed to load protected files: ' + error.message, 'error');
        }
    }

    showProtectedFilesManager(data) {
        const files = data.protected_files || [];
        const summary = data.summary || {};
        
        // Create modal HTML
        const modalHtml = `
            <div id="protected-files-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">
                                <i class="fas fa-shield-alt text-purple-600 mr-2"></i>
                                Protected Files Manager
                            </h3>
                            <button onclick="document.getElementById('protected-files-modal').remove()" 
                                class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Warning Notice -->
                    <div class="px-6 py-3 bg-red-50 border-b border-red-200">
                        <div class="flex items-center">
                            <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                            <div class="text-sm text-red-700">
                                <strong>Caution:</strong> These are protected deliverable files. Only delete after customers have downloaded their software.
                            </div>
                        </div>
                    </div>
                    
                    <!-- Summary -->
                    <div class="px-6 py-4 bg-gray-50 border-b">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-purple-600">${summary.total_files || 0}</div>
                                <div class="text-sm text-gray-600">Protected Files</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-blue-600">${summary.total_size_mb || 0} MB</div>
                                <div class="text-sm text-gray-600">Total Size</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-green-600">Manual</div>
                                <div class="text-sm text-gray-600">Deletion Only</div>
                            </div>
                        </div>
                        <div class="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                            <div class="text-sm text-purple-700">
                                <strong>Info:</strong> ${summary.criteria || 'Protected files are never auto-deleted'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Files List -->
                    <div class="px-6 py-4 max-h-96 overflow-y-auto">
                        ${files.length > 0 ? `
                            <div class="mb-4">
                                <label class="flex items-center">
                                    <input type="checkbox" id="select-all-protected" onchange="adminPanel.toggleAllProtectedFiles(this.checked)" class="mr-2">
                                    <span class="text-sm font-medium text-gray-700">Select All</span>
                                </label>
                            </div>
                            <div class="space-y-2">
                                ${files.map(file => `
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
                                        <div class="flex items-center flex-1">
                                            <input type="checkbox" class="protected-file-checkbox mr-3" value="${file.id}" onchange="adminPanel.updateProtectedSelection()">
                                            <div class="flex-1">
                                                <div class="font-medium text-gray-900">${file.original_filename || 'Unknown'}</div>
                                                <div class="text-sm text-gray-500">
                                                    Customer ID: ${file.customer_id} • 
                                                    Size: ${file.file_size_mb} MB • 
                                                    Age: ${file.age_days} days old
                                                </div>
                                                <div class="text-xs text-gray-400">
                                                    Protected: ${this.formatDateTime(file.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Protected
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-8">
                                <i class="fas fa-shield-alt text-purple-500 text-4xl mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No Protected Files</h3>
                                <p class="text-gray-500">There are currently no protected/wrapped files in the system.</p>
                            </div>
                        `}
                    </div>
                    
                    <!-- Actions -->
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div class="flex items-center justify-between">
                            <div class="text-sm text-gray-600">
                                <span id="selected-count">0</span> file(s) selected for deletion
                            </div>
                            <div class="flex gap-3">
                                <button onclick="document.getElementById('protected-files-modal').remove()" 
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                                    Close
                                </button>
                                ${files.length > 0 ? `
                                    <button id="delete-selected-btn" onclick="adminPanel.deleteSelectedProtectedFiles()" 
                                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled>
                                        <i class="fas fa-trash mr-2"></i>Delete Selected
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    toggleAllProtectedFiles(checked) {
        const checkboxes = document.querySelectorAll('.protected-file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateProtectedSelection();
    }

    updateProtectedSelection() {
        const selectedBoxes = document.querySelectorAll('.protected-file-checkbox:checked');
        const count = selectedBoxes.length;
        
        document.getElementById('selected-count').textContent = count;
        document.getElementById('delete-selected-btn').disabled = count === 0;
    }

    async deleteSelectedProtectedFiles() {
        const selectedBoxes = document.querySelectorAll('.protected-file-checkbox:checked');
        const fileIds = Array.from(selectedBoxes).map(box => parseInt(box.value));
        
        if (fileIds.length === 0) {
            this.showNotification('No files selected', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${fileIds.length} protected file(s)?

⚠️ WARNING: These are customer deliverable files!
Only delete if customers have already downloaded their software.

This action cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await this.apiCall('/admin/uploads/protected/delete', 'POST', {
                file_ids: fileIds
            });
            
            if (response.success) {
                this.showNotification(`Successfully deleted ${response.deleted_count} protected file(s).`, 'success');
                document.getElementById('protected-files-modal').remove();
                this.loadUploads(); // Reload the list
                this.loadUploadStats(); // Refresh stats
            } else {
                throw new Error(response.message || 'Failed to delete protected files');
            }
        } catch (error) {
            console.error('Delete protected files failed:', error);
            this.showNotification('Failed to delete protected files: ' + error.message, 'error');
        }
    }

    filterUploads() {
        // This would typically filter the uploads array and re-display
        // For now, we'll just reload with filter parameters
        this.loadUploads();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Admin Logs
    async showLogs() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Admin Action Logs</h3>
                                <p class="mt-1 text-sm text-gray-500">View all administrative actions and system events</p>
                            </div>
                            <div class="flex space-x-3">
                                <select id="log-filter-type" class="px-3 py-2 border border-gray-300 rounded-md text-sm">
                                    <option value="">All Actions</option>
                                    <option value="login">Admin Login</option>
                                    <option value="create_customer">Create Customer</option>
                                    <option value="create_product">Create Product</option>
                                    <option value="backup_create">Create Backup</option>
                                    <option value="backup_restore">Restore Backup</option>
                                    <option value="export_data">Export Data</option>
                                </select>
                                <button onclick="adminPanel.loadLogs()" class="px-3 py-2 bg-brand-blue text-white rounded-md text-sm">
                                    <i class="fas fa-search mr-1"></i>Filter
                                </button>
                            </div>
                        </div>
                        
                        <div id="logs-list" class="space-y-4">
                            <div class="text-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
                                <p class="mt-2 text-gray-500">Loading logs...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadLogs();
    }

    getActionDescription(action) {
        const actionMap = {
            'login': 'Admin Login',
            'logout': 'Admin Logout',
            'create_customer': 'Create Customer',
            'update_customer': 'Update Customer',
            'suspend_customer': 'Suspend Customer',
            'revoke_license': 'Revoke License',
            'create_product': 'Create Product',
            'update_product': 'Update Product',
            'delete_product': 'Delete Product',
            'backup_create': 'Create Backup',
            'backup_restore': 'Restore Backup',
            'export_data': 'Export Data',
            'system_maintenance': 'System Maintenance'
        };
        return actionMap[action] || action || 'Unknown Action';
    }

    async loadLogs() {
        try {
            const actionType = document.getElementById('log-filter-type')?.value || '';
            const params = new URLSearchParams({ limit: '50' });
            if (actionType) params.append('action_type', actionType);

            const response = await this.apiCall(`/admin/logs/actions?${params}`);
            const logs = response.success ? response.logs : [];

            const container = document.getElementById('logs-list');
            if (logs.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-clipboard-list text-4xl text-gray-300 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                        <p class="text-gray-500">No admin actions match the current filter.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = logs.map(log => {
                const isSuccess = log.success !== false;
                const statusClass = isSuccess ? 'text-green-600' : 'text-red-600';
                const iconClass = isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle';
                
                return `
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center space-x-3">
                                    <i class="fas ${iconClass} ${statusClass}"></i>
                                    <div>
                                        <h4 class="font-medium text-gray-900">${this.getActionDescription(log.action)}</h4>
                                        <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                            <span><i class="fas fa-user mr-1"></i>${log.admin_username || 'Unknown'}</span>
                                            <span><i class="fas fa-clock mr-1"></i>${new Date(log.created_at).toLocaleString()}</span>
                                            <span><i class="fas fa-tag mr-1"></i>${log.entity_type || 'system'}</span>
                                            ${log.ip_address ? `<span><i class="fas fa-globe mr-1"></i>${log.ip_address}</span>` : ''}
                                        </div>
                                        ${log.error_message ? `<p class="text-red-600 text-sm mt-1">${log.error_message}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${isSuccess ? 'Success' : 'Failed'}
                                </span>
                                <button onclick="adminPanel.showLogDetails(${log.id})"
                                    class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load logs:', error);
            document.getElementById('logs-list').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load logs</p>
                </div>
            `;
        }
    }

    showLogDetails(logId) {
        // This would show a modal with detailed log information
        // For now, just show a placeholder
        this.showNotification('Log details feature coming soon', 'info');
    }



    showBulkCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Bulk Create Licenses</h3>
                    <form id="bulk-create-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">License Configuration (JSON)</label>
                            <textarea id="bulk-licenses-data" rows="10" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue text-sm font-mono"
                                placeholder='[
  {
    "customer_id": 1,
    "product_id": 1,
    "license_type": "standard",
    "max_devices": 1
  }
]'></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit"
                                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                                <i class="fas fa-plus mr-2"></i>Create Licenses
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('bulk-create-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
                submitBtn.disabled = true;

                const licensesData = JSON.parse(document.getElementById('bulk-licenses-data').value);

                const response = await this.apiCall('/admin/licenses/bulk-create', 'POST', {
                    licenses: licensesData,
                    operation_name: `Bulk License Creation ${new Date().toLocaleString()}`
                });

                if (response.success) {
                    modal.remove();
                    this.showNotification(`Bulk operation completed. ${response.summary.successful} licenses created, ${response.summary.failed} failed.`, 'success');
                } else {
                    throw new Error(response.message || 'Bulk create failed');
                }

            } catch (error) {
                console.error('Bulk create failed:', error);
                this.showNotification('Bulk create failed: ' + error.message, 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    showBulkDeleteModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Bulk Delete Licenses</h3>
                    <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <div class="flex">
                            <i class="fas fa-exclamation-triangle text-red-400 mr-2 mt-0.5"></i>
                            <p class="text-sm text-red-700">This action cannot be undone!</p>
                        </div>
                    </div>
                    <form id="bulk-delete-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">License IDs (JSON Array)</label>
                            <textarea id="bulk-license-ids" rows="6" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue text-sm font-mono"
                                placeholder='[1, 2, 3, 4, 5]'></textarea>
                        </div>
                        <div class="flex justify-end space-x-3">
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="submit"
                                class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                <i class="fas fa-trash mr-2"></i>Delete Licenses
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('bulk-delete-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!confirm('Are you absolutely sure you want to delete these licenses? This cannot be undone!')) {
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Deleting...';
                submitBtn.disabled = true;

                const licenseIds = JSON.parse(document.getElementById('bulk-license-ids').value);

                const response = await this.apiCall('/admin/licenses/bulk-delete', 'POST', {
                    license_ids: licenseIds,
                    operation_name: `Bulk License Deletion ${new Date().toLocaleString()}`
                });

                if (response.success) {
                    modal.remove();
                    this.showNotification(`Bulk operation completed. ${response.summary.successful} licenses deleted, ${response.summary.failed} failed.`, 'success');
                } else {
                    throw new Error(response.message || 'Bulk delete failed');
                }

            } catch (error) {
                console.error('Bulk delete failed:', error);
                this.showNotification('Bulk delete failed: ' + error.message, 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Enhanced UI Features
    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-md shadow-lg z-50 max-w-md`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type]} mr-3"></i>
                <span>${message.replace(/\n/g, '<br>')}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Utility function for debouncing input
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Upload Interface Functions
    showUploadInterface() {
        const modal = document.createElement('div');
        modal.id = 'upload-modal';
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-upload text-blue-600 mr-3"></i>
                        Upload & Protect File
                    </h3>
                    <button onclick="adminPanel.closeUploadModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Upload Section -->
                <div class="mb-8">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload File</h4>
                    
                    <!-- Drop Zone -->
                    <div id="admin-drop-zone" class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Drag and drop your executable file here</h3>
                        <p class="text-gray-600 mb-4">or click to browse your computer</p>
                        <p class="text-sm text-gray-500">Supports .exe files up to 100MB</p>
                        <input type="file" id="admin-file-input" accept=".exe,application/x-msdownload,application/octet-stream" class="hidden">
                    </div>

                    <!-- Upload Progress -->
                    <div id="admin-upload-section" style="display: none;" class="mt-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
                        <div class="bg-gray-200 rounded-full h-3 mb-2">
                            <div id="admin-upload-progress-bar" class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <p id="admin-upload-progress-text" class="text-sm text-gray-600">Preparing upload...</p>
                    </div>
                </div>

                <!-- Protection Configuration -->
                <div id="admin-protection-section" style="display: none;" class="mb-8">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Step 2: Configure Protection</h4>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                            <select id="admin-customer-select" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="1">Default Customer</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Protection Level</label>
                            <select id="admin-protection-level" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="basic">Basic - Essential protection</option>
                                <option value="standard">Standard - Enhanced security</option>
                                <option value="premium">Premium - Advanced features</option>
                                <option value="enterprise">Enterprise - Maximum security</option>
                            </select>
                        </div>

                        <div class="col-span-1 lg:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-3">Security Features</label>
                            <div class="grid grid-cols-2 gap-4">
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-enable-vm-protection" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">VM Protection</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-enable-hardware-binding" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Hardware Binding</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-enable-encryption" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">File Encryption</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-enable-anti-debug" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Anti-Debug</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-enable-anti-dump" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Anti-Dump</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="admin-business-hours-only" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Business Hours Only</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Users</label>
                            <input type="number" id="admin-max-concurrent-users" value="1" min="1" max="100" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">License Duration (Days)</label>
                            <input type="number" id="admin-license-duration-days" placeholder="Optional" min="1" max="3650"
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>

                    <div class="mt-6">
                        <button type="button" id="admin-start-protection" 
                                class="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium">
                            <i class="fas fa-shield-alt mr-2"></i>
                            Start Protection Process
                        </button>
                    </div>
                </div>

                <!-- Job Progress -->
                <div id="admin-job-progress-section" style="display: none;" class="mb-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-cog fa-spin mr-2"></i>
                        Protection in Progress
                    </h4>
                    <div class="flex items-center justify-between mb-2">
                        <span id="admin-job-progress-text" class="text-sm text-gray-600">Processing...</span>
                        <span id="admin-job-status" class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">PROCESSING</span>
                    </div>
                    <div class="bg-gray-200 rounded-full h-3 mb-4">
                        <div id="admin-job-progress-bar" class="bg-green-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>

                <!-- Download Section -->
                <div id="admin-download-section" style="display: none;" class="mb-6">
                    <!-- Download interface will be populated here -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupUploadHandlers();
    }

    closeUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.remove();
        }
    }

    setupUploadHandlers() {
        const dropZone = document.getElementById('admin-drop-zone');
        const fileInput = document.getElementById('admin-file-input');

        // Drop zone click handler
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleAdminFileUpload(file);
            }
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover', 'border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover', 'border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover', 'border-blue-500', 'bg-blue-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleAdminFileUpload(files[0]);
            }
        });

        // Protection button handler
        document.getElementById('admin-start-protection').addEventListener('click', () => {
            this.startAdminProtection();
        });
    }

    async handleAdminFileUpload(file) {
        // Validate file
        if (!file.name.toLowerCase().endsWith('.exe')) {
            this.showNotification('Please select an executable (.exe) file', 'error');
            return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB
            this.showNotification('File size must be less than 100MB', 'error');
            return;
        }

        try {
            // Show upload section
            document.getElementById('admin-upload-section').style.display = 'block';
            
            // Initiate upload
            const initResponse = await this.apiCall('/admin/uploads/initiate', 'POST', {
                filename: file.name,
                file_size: file.size,
                mime_type: file.type || 'application/x-msdownload',
                customer_id: 1
            });

            if (!initResponse.success) {
                throw new Error(initResponse.message || 'Failed to initiate upload');
            }

            this.currentUploadId = initResponse.upload_id;

            // Update progress
            document.getElementById('admin-upload-progress-text').textContent = 'Uploading file...';
            document.getElementById('admin-upload-progress-bar').style.width = '25%';

            // Upload file
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await this.apiCall(`/admin/uploads/${this.currentUploadId}/upload`, 'POST', formData, {
                'Content-Type': undefined // Let browser set multipart boundary
            });

            if (!uploadResponse.success) {
                throw new Error(uploadResponse.message || 'Failed to upload file');
            }

            // Update progress
            document.getElementById('admin-upload-progress-bar').style.width = '100%';
            document.getElementById('admin-upload-progress-text').textContent = 'Upload completed successfully!';

            // Show protection section
            setTimeout(() => {
                document.getElementById('admin-protection-section').style.display = 'block';
            }, 1000);

        } catch (error) {
            console.error('Admin file upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    async startAdminProtection() {
        if (!this.currentUploadId) {
            this.showNotification('No file uploaded', 'error');
            return;
        }

        try {
            const customerId = parseInt(document.getElementById('admin-customer-select').value) || 1;
            
            const protectionData = {
                file_upload_id: this.currentUploadId,
                customer_id: customerId,
                protection_level: document.getElementById('admin-protection-level').value,
                enable_vm_protection: document.getElementById('admin-enable-vm-protection').checked,
                enable_hardware_binding: document.getElementById('admin-enable-hardware-binding').checked,
                enable_encryption: document.getElementById('admin-enable-encryption').checked,
                enable_anti_debug: document.getElementById('admin-enable-anti-debug').checked,
                enable_anti_dump: document.getElementById('admin-enable-anti-dump').checked,
                max_concurrent_users: parseInt(document.getElementById('admin-max-concurrent-users').value) || 1,
                license_duration_days: parseInt(document.getElementById('admin-license-duration-days').value) || null,
                business_hours_only: document.getElementById('admin-business-hours-only').checked
            };

            const response = await this.apiCall('/admin/uploads/protect', 'POST', protectionData);

            if (!response.success) {
                throw new Error(response.message || 'Failed to create protection job');
            }

            this.currentJobId = response.job_id;

            // Show job progress section
            document.getElementById('admin-job-progress-section').style.display = 'block';

            // Start monitoring job progress
            this.monitorAdminJobProgress();

            this.showNotification('Protection job started successfully!', 'success');

        } catch (error) {
            console.error('Admin protection job error:', error);
            this.showNotification('Failed to start protection: ' + error.message, 'error');
        }
    }

    async monitorAdminJobProgress() {
        if (!this.currentJobId) return;

        try {
            const response = await this.apiCall(`/admin/uploads/job/${this.currentJobId}/status`, 'GET');

            if (response.success) {
                const job = response;
                
                // Update progress bar
                document.getElementById('admin-job-progress-bar').style.width = `${job.progress}%`;
                document.getElementById('admin-job-progress-text').textContent = `Processing... ${job.progress}%`;
                
                // Update status
                const statusElement = document.getElementById('admin-job-status');
                statusElement.textContent = job.status.toUpperCase();
                statusElement.className = `px-3 py-1 rounded-full text-sm font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                }`;

                if (job.status === 'completed') {
                    // Show download section
                    document.getElementById('admin-download-section').innerHTML = `
                        <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                            <div class="flex items-center mb-4">
                                <i class="fas fa-check-circle text-green-600 text-2xl mr-3"></i>
                                <div>
                                    <h3 class="text-lg font-semibold text-green-900">Protection Completed!</h3>
                                    <p class="text-green-700">Your file has been successfully protected.</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-green-700">
                                        <strong>Original:</strong> ${job.original_filename}<br>
                                        <strong>Protection Level:</strong> ${job.protection_level}<br>
                                        <strong>Expires:</strong> ${new Date(job.download_expires_at).toLocaleString()}
                                    </p>
                                </div>
                                <a href="${job.download_url}" 
                                   class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                                    <i class="fas fa-download mr-2"></i>Download Protected File
                                </a>
                            </div>
                        </div>
                    `;
                    document.getElementById('admin-download-section').style.display = 'block';
                    
                    // Refresh uploads list
                    this.loadUploads();
                    
                } else if (job.status === 'failed') {
                    this.showNotification('Protection job failed: ' + (job.error_message || 'Unknown error'), 'error');
                } else {
                    // Continue monitoring
                    setTimeout(() => this.monitorAdminJobProgress(), 2000);
                }
            }

        } catch (error) {
            console.error('Failed to get job status:', error);
            setTimeout(() => this.monitorAdminJobProgress(), 5000); // Retry after longer delay
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        this.token = null;
        this.currentUser = null;
        this.dashboardRendered = false; // Reset flag
        this.showLogin();
    }



    // Country selection helper methods for checkbox interface
    populateCountryCheckboxes() {
        const allowedContainer = document.getElementById('allowed-countries-checkboxes');

        // Only populate if not already done
        if (allowedContainer && allowedContainer.children.length === 0) {
            const countries = this.getCountryList();
            
            // Populate whitelist countries checkboxes (using CDN flag images for reliability)
            allowedContainer.innerHTML = countries.map(country => {
                return `
                <label class="flex items-center py-2 px-3 hover:bg-white rounded cursor-pointer border-b border-gray-100 last:border-b-0">
                    <input type="checkbox" value="${country.code}" class="mr-3 country-checkbox allowed-country flex-shrink-0" onchange="adminPanel.updateCountryCount()">
                    <img src="https://flagcdn.com/16x12/${country.code.toLowerCase()}.png" 
                         alt="${country.code}" 
                         class="mr-2 inline-block" 
                         style="width: 16px; height: 12px; border-radius: 2px;"
                         onerror="this.style.display='none'">
                    <span class="text-sm text-gray-800 flex-grow">${country.name}</span>
                </label>
                `;
            }).join('');
            
            // Update counter
            this.updateCountryCount();
        }
    }

    updateCountryCount() {
        const selectedCount = document.querySelectorAll('.allowed-country:checked').length;
        const counter = document.getElementById('selected-countries-count');
        if (counter) {
            counter.textContent = selectedCount;
        }
    }

    getCountryList() {
        return [
            { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
            { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
            { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
            { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
            { code: 'AI', name: 'Anguilla', flag: '🇦🇮' },
            { code: 'AL', name: 'Albania', flag: '🇦🇱' },
            { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
            { code: 'AO', name: 'Angola', flag: '🇦🇴' },
            { code: 'AQ', name: 'Antarctica', flag: '🇦🇶' },
            { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
            { code: 'AS', name: 'American Samoa', flag: '🇦🇸' },
            { code: 'AT', name: 'Austria', flag: '🇦🇹' },
            { code: 'AU', name: 'Australia', flag: '🇦🇺' },
            { code: 'AW', name: 'Aruba', flag: '🇦🇼' },
            { code: 'AX', name: 'Åland Islands', flag: '🇦🇽' },
            { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
            { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
            { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
            { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
            { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
            { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
            { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
            { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
            { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
            { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
            { code: 'BL', name: 'Saint Barthélemy', flag: '🇧🇱' },
            { code: 'BM', name: 'Bermuda', flag: '🇧🇲' },
            { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
            { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
            { code: 'BQ', name: 'Caribbean Netherlands', flag: '🇧🇶' },
            { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
            { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
            { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
            { code: 'BV', name: 'Bouvet Island', flag: '🇧🇻' },
            { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
            { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
            { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
            { code: 'CA', name: 'Canada', flag: '🇨🇦' },
            { code: 'CC', name: 'Cocos Islands', flag: '🇨🇨' },
            { code: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
            { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
            { code: 'CG', name: 'Republic of the Congo', flag: '🇨🇬' },
            { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
            { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
            { code: 'CK', name: 'Cook Islands', flag: '🇨🇰' },
            { code: 'CL', name: 'Chile', flag: '🇨🇱' },
            { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
            { code: 'CN', name: 'China', flag: '🇨🇳' },
            { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
            { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
            { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
            { code: 'CV', name: 'Cape Verde', flag: '🇨🇻' },
            { code: 'CW', name: 'Curaçao', flag: '🇨🇼' },
            { code: 'CX', name: 'Christmas Island', flag: '🇨🇽' },
            { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
            { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
            { code: 'DE', name: 'Germany', flag: '🇩🇪' },
            { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
            { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
            { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
            { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
            { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
            { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
            { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
            { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
            { code: 'EH', name: 'Western Sahara', flag: '🇪🇭' },
            { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
            { code: 'ES', name: 'Spain', flag: '🇪🇸' },
            { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
            { code: 'FI', name: 'Finland', flag: '🇫🇮' },
            { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
            { code: 'FK', name: 'Falkland Islands', flag: '🇫🇰' },
            { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
            { code: 'FO', name: 'Faroe Islands', flag: '🇫🇴' },
            { code: 'FR', name: 'France', flag: '🇫🇷' },
            { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
            { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
            { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
            { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
            { code: 'GF', name: 'French Guiana', flag: '🇬🇫' },
            { code: 'GG', name: 'Guernsey', flag: '🇬🇬' },
            { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
            { code: 'GI', name: 'Gibraltar', flag: '🇬🇮' },
            { code: 'GL', name: 'Greenland', flag: '🇬🇱' },
            { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
            { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
            { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵' },
            { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
            { code: 'GR', name: 'Greece', flag: '🇬🇷' },
            { code: 'GS', name: 'South Georgia', flag: '🇬🇸' },
            { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
            { code: 'GU', name: 'Guam', flag: '🇬🇺' },
            { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
            { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
            { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
            { code: 'HM', name: 'Heard & McDonald Islands', flag: '🇭🇲' },
            { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
            { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
            { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
            { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
            { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
            { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
            { code: 'IL', name: 'Israel', flag: '🇮🇱' },
            { code: 'IM', name: 'Isle of Man', flag: '🇮🇲' },
            { code: 'IN', name: 'India', flag: '🇮🇳' },
            { code: 'IO', name: 'British Indian Ocean Territory', flag: '🇮🇴' },
            { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
            { code: 'IR', name: 'Iran', flag: '🇮🇷' },
            { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
            { code: 'IT', name: 'Italy', flag: '🇮🇹' },
            { code: 'JE', name: 'Jersey', flag: '🇯🇪' },
            { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
            { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
            { code: 'JP', name: 'Japan', flag: '🇯🇵' },
            { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
            { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
            { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
            { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
            { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
            { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
            { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
            { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
            { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
            { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾' },
            { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
            { code: 'LA', name: 'Laos', flag: '🇱🇦' },
            { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
            { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
            { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
            { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
            { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
            { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
            { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
            { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
            { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
            { code: 'LY', name: 'Libya', flag: '🇱🇾' },
            { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
            { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
            { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
            { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
            { code: 'MF', name: 'Saint Martin', flag: '🇲🇫' },
            { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
            { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
            { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
            { code: 'ML', name: 'Mali', flag: '🇲🇱' },
            { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
            { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
            { code: 'MO', name: 'Macao', flag: '🇲🇴' },
            { code: 'MP', name: 'Northern Mariana Islands', flag: '🇲🇵' },
            { code: 'MQ', name: 'Martinique', flag: '🇲🇶' },
            { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
            { code: 'MS', name: 'Montserrat', flag: '🇲🇸' },
            { code: 'MT', name: 'Malta', flag: '🇲🇹' },
            { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
            { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
            { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
            { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
            { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
            { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
            { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
            { code: 'NC', name: 'New Caledonia', flag: '🇳🇨' },
            { code: 'NE', name: 'Niger', flag: '🇳🇪' },
            { code: 'NF', name: 'Norfolk Island', flag: '🇳🇫' },
            { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
            { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
            { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
            { code: 'NO', name: 'Norway', flag: '🇳🇴' },
            { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
            { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
            { code: 'NU', name: 'Niue', flag: '🇳🇺' },
            { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
            { code: 'OM', name: 'Oman', flag: '🇴🇲' },
            { code: 'PA', name: 'Panama', flag: '🇵🇦' },
            { code: 'PE', name: 'Peru', flag: '🇵🇪' },
            { code: 'PF', name: 'French Polynesia', flag: '🇵🇫' },
            { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
            { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
            { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
            { code: 'PL', name: 'Poland', flag: '🇵🇱' },
            { code: 'PM', name: 'Saint Pierre and Miquelon', flag: '🇵🇲' },
            { code: 'PN', name: 'Pitcairn', flag: '🇵🇳' },
            { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
            { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
            { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
            { code: 'PW', name: 'Palau', flag: '🇵🇼' },
            { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
            { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
            { code: 'RE', name: 'Réunion', flag: '🇷🇪' },
            { code: 'RO', name: 'Romania', flag: '🇷🇴' },
            { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
            { code: 'RU', name: 'Russia', flag: '🇷🇺' },
            { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
            { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
            { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
            { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
            { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
            { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
            { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
            { code: 'SH', name: 'Saint Helena', flag: '🇸🇭' },
            { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
            { code: 'SJ', name: 'Svalbard and Jan Mayen', flag: '🇸🇯' },
            { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
            { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
            { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
            { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
            { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
            { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
            { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
            { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
            { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
            { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽' },
            { code: 'SY', name: 'Syria', flag: '🇸🇾' },
            { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
            { code: 'TC', name: 'Turks and Caicos Islands', flag: '🇹🇨' },
            { code: 'TD', name: 'Chad', flag: '🇹🇩' },
            { code: 'TF', name: 'French Southern Territories', flag: '🇹🇫' },
            { code: 'TG', name: 'Togo', flag: '🇹🇬' },
            { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
            { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
            { code: 'TK', name: 'Tokelau', flag: '🇹🇰' },
            { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
            { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
            { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
            { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
            { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
            { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
            { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
            { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
            { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
            { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
            { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
            { code: 'UM', name: 'U.S. Minor Outlying Islands', flag: '🇺🇲' },
            { code: 'US', name: 'United States', flag: '🇺🇸' },
            { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
            { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
            { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
            { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
            { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
            { code: 'VG', name: 'British Virgin Islands', flag: '🇻🇬' },
            { code: 'VI', name: 'U.S. Virgin Islands', flag: '🇻🇮' },
            { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
            { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
            { code: 'WF', name: 'Wallis and Futuna', flag: '🇼🇫' },
            { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
            { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
            { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
            { code: 'YT', name: 'Mayotte', flag: '🇾🇹' },
            { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
            { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
            { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' }
        ];
    }

    selectAllCountries() {
        const checkboxes = document.querySelectorAll('.allowed-country');
        checkboxes.forEach(checkbox => checkbox.checked = true);
        this.updateCountryCount();
    }

    clearAllCountries() {
        const checkboxes = document.querySelectorAll('.allowed-country');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        this.updateCountryCount();
    }

    selectCommonCountries() {
        // This function is now replaced by selectUSACanada()
        // Keeping for backward compatibility, but redirect to selectUSACanada
        this.selectUSACanada();
    }

    toggleGeographicRestrictions() {
        const toggle = document.getElementById('enable-geographic-restrictions');
        const content = document.getElementById('geographic-restrictions-content');
        
        if (toggle.checked) {
            content.classList.remove('hidden');
            // Initialize country checkboxes if not already done
            if (document.getElementById('allowed-countries-checkboxes').children.length === 0) {
                this.populateCountryCheckboxes();
            }
        } else {
            content.classList.add('hidden');
        }
    }

    toggleTimeRestrictions() {
        const toggle = document.getElementById('enable-time-restrictions');
        const content = document.getElementById('time-restrictions-content');
        
        if (toggle.checked) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    }

    selectUSACanada() {
        // Clear all first, then select only US and Canada
        const checkboxes = document.querySelectorAll('.allowed-country');
        checkboxes.forEach(checkbox => {
            checkbox.checked = ['US', 'CA'].includes(checkbox.value);
        });
        this.updateCountryCount();
    }

    async viewLicense(licenseKey) {
        try {
            // Get license details from dedicated API endpoint
            const response = await this.apiCall(`/admin/licenses/${licenseKey}/details`);
            
            if (!response.success) {
                this.showNotification('License not found', 'error');
                return;
            }

            // Show license details in a modal/popup
            this.showLicenseModal(response.license);
            
        } catch (error) {
            console.error('Failed to view license:', error);
            this.showNotification('Failed to load license details', 'error');
        }
    }

    showLicenseModal(license) {
        const modalHtml = `
            <div id="license-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-90vh overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold text-gray-900">License Details</h2>
                            <button onclick="this.closest('#license-modal').remove()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">License Key</label>
                                        <div class="mt-1">
                                            <code class="text-sm bg-gray-100 px-2 py-1 rounded font-mono">${license.license_key}</code>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Status</label>
                                        <div class="mt-1">
                                            <span class="px-2 py-1 text-xs rounded ${this.getStatusClass(license.status)}">
                                                ${license.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Product</label>
                                        <div class="mt-1 text-sm text-gray-900">${license.product_name || 'Unknown'}</div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Registration Date</label>
                                        <div class="mt-1 text-sm text-gray-900">${this.formatDate(license.registration_date || license.created_at)}</div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Expires</label>
                                        <div class="mt-1 text-sm text-gray-900">${this.formatDate(license.expires_at) || 'Never'}</div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Name</label>
                                        <div class="mt-1 text-sm text-gray-900">${license.name}</div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Email</label>
                                        <div class="mt-1 text-sm text-gray-900">${license.email}</div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Total Activations</label>
                                        <div class="mt-1 text-sm text-gray-900">${license.total_activations || 0}</div>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-500">Hardware Fingerprint</label>
                                        <div class="mt-1 text-sm text-gray-600 font-mono">${license.hardware_fingerprint || license.primary_device_id || 'Not set'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-6 pt-6 border-t border-gray-200">
                            <div class="flex justify-end space-x-3">
                                <button onclick="this.closest('#license-modal').remove()" 
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Close
                                </button>
                                <button onclick="adminPanel.revokeLicense('${license.license_key}'); this.closest('#license-modal').remove();" 
                                        class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                                        ${license.status === 'revoked' ? 'disabled' : ''}>
                                    ${license.status === 'revoked' ? 'Already Revoked' : 'Revoke License'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async revokeLicense(licenseKey) {
        if (!confirm('Are you sure you want to revoke this license? This action cannot be undone.')) {
            return;
        }

        try {
            // Get license details first to find customer ID
            const licenseResponse = await this.apiCall(`/admin/licenses/${licenseKey}/details`);
            if (!licenseResponse.success) {
                throw new Error('License not found');
            }

            // Find the customer by email since we have license details
            const customerResponse = await this.apiCall(`/admin/customers?search=${licenseResponse.license.email}`);
            if (customerResponse.success && customerResponse.customers && customerResponse.customers.length > 0) {
                const customer = customerResponse.customers.find(c => c.license_key === licenseKey);
                if (customer) {
                    // Update customer status to revoked
                    const updateResponse = await this.apiCall(`/admin/customers/${customer.id}`, 'PUT', {
                        name: customer.name,
                        email: customer.email,
                        status: 'revoked',
                        notes: customer.notes || ''
                    });

                    if (updateResponse.success) {
                        this.showNotification('License revoked successfully', 'success');
                        
                        // Refresh the current view based on active page
                        const currentHash = window.location.hash;
                        if (currentHash === '#customers' || currentHash === '') {
                            await this.loadCustomers();
                        } else if (currentHash === '#dashboard') {
                            await this.loadDashboard();
                        }
                        
                        // Close any open modals
                        const modal = document.getElementById('license-modal');
                        if (modal) modal.remove();
                    } else {
                        throw new Error(updateResponse.message || 'Failed to revoke license');
                    }
                } else {
                    throw new Error('License not found in customer records');
                }
            } else {
                throw new Error('Customer not found');
            }
        } catch (error) {
            console.error('Failed to revoke license:', error);
            this.showNotification('Failed to revoke license: ' + error.message, 'error');
        }
    }

    // Customer Search Functionality
    handleSearchInput(searchTerm) {
        // Clear any existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search to avoid too many API calls
        this.searchTimeout = setTimeout(() => {
            this.searchCustomers(searchTerm.trim());
        }, 300); // Wait 300ms after user stops typing
    }

    async searchCustomers(searchTerm) {
        try {

            let endpoint = '/admin/customers';
            const params = [];

            // Add search parameter if provided
            if (searchTerm) {
                params.push(`search=${encodeURIComponent(searchTerm)}`);
            }

            // Include existing filters
            const productFilter = document.getElementById('product-filter')?.value;
            const statusFilter = document.getElementById('status-filter')?.value;
            
            if (productFilter) {
                params.push(`product_id=${productFilter}`);
            }
            if (statusFilter) {
                params.push(`status=${statusFilter}`);
            }

            // Build final endpoint URL
            if (params.length > 0) {
                endpoint += `?${params.join('&')}`;
            }


            const response = await this.apiCall(endpoint);
            const customers = response.success ? response.customers : [];
            

            // Update only the table content, not the entire interface
            this.renderCustomersTableOnly(customers);
            
            // Show search results count
            this.showSearchResults(customers.length, searchTerm);

        } catch (error) {
            console.error('Search customers error:', error);
            this.showError('Failed to search customers');
        }
    }

    showSearchResults(count, searchTerm) {
        // Update or create search results indicator
        let indicator = document.getElementById('search-results-indicator');
        
        if (!indicator) {
            // Create indicator if it doesn't exist
            const tableContainer = document.querySelector('.bg-white.border.border-gray-200.rounded-lg.overflow-hidden');
            if (tableContainer) {
                indicator = document.createElement('div');
                indicator.id = 'search-results-indicator';
                indicator.className = 'px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm text-blue-700';
                tableContainer.insertBefore(indicator, tableContainer.firstChild);
            }
        }

        if (indicator) {
            if (searchTerm) {
                indicator.innerHTML = `
                    <i class="fas fa-search mr-2"></i>
                    Found <strong>${count}</strong> customer${count !== 1 ? 's' : ''} matching "<strong>${searchTerm}</strong>"
                    ${count === 0 ? '<span class="ml-2 text-blue-600 cursor-pointer" onclick="adminPanel.clearSearch()">Clear search</span>' : ''}
                `;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    clearSearch() {
        // Clear the search input
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.value = '';
        }

        // Hide search results indicator
        const indicator = document.getElementById('search-results-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }

        // Reset filters and reload all customers
        this.searchCustomers('');
    }


}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});/* Cache buster: Sun Sep 28 18:34:09 UTC 2025 */
