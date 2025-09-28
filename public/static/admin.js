// TurnkeyAppShield Admin Panel - Fixed Version
// Comprehensive admin interface with all bug fixes and improvements

class AdminPanel {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('admin_token');
        this.charts = {};
        this.currentPage = 'dashboard';
        this.dashboardRendered = false; // Fix for infinite scroll issue
        this.uploads = []; // Initialize uploads array
        
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
            const response = await axios.get(`${this.apiBaseUrl}/admin/dashboard`, {
                headers: { Authorization: `Bearer ${this.token}` }
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
        const app = document.getElementById('admin-app');
        app.innerHTML = `
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
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                    placeholder="Password">
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
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
        loginBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            console.log('Attempting login...');
            const response = await axios.post(`${this.apiBaseUrl}/admin/auth`, {
                email: username,  // Send as email for compatibility
                password
            });
            console.log('Login response:', response.data);

            if (response.data.success) {
                console.log('Login successful, setting up user session...');
                this.token = response.data.token;
                this.currentUser = response.data.admin;
                localStorage.setItem('admin_token', this.token);
                
                console.log('Loading dashboard after successful login...');
                await this.loadDashboard();
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            errorDiv.textContent = error.response?.data?.message || 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }
    }

    async loadDashboard() {
        console.log('Loading dashboard...');
        this.dashboardRendered = false; // Reset flag before loading
        this.showLoading();
        
        try {
            console.log('Making API call to /admin/dashboard...');
            const response = await this.apiCall('/admin/dashboard');
            console.log('Dashboard API response:', response);
            
            if (response.success) {
                console.log('Rendering main layout...');
                this.renderMainLayout();
                console.log('Showing dashboard with data:', response.data);
                this.showDashboard(response.data);
            } else {
                throw new Error(response.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.dashboardRendered = false; // Reset flag on error
            this.showError('Failed to load dashboard data: ' + (error.message || error));
        }
    }

    showLoading() {
        const app = document.getElementById('admin-app');
        app.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
                    <h2 class="text-xl font-semibold text-gray-900">Loading Dashboard...</h2>
                </div>
            </div>
        `;
    }

    showError(message) {
        const app = document.getElementById('admin-app');
        app.innerHTML = `
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
        if (this.dashboardRendered) return; // Prevent multiple renders
        
        const app = document.getElementById('admin-app');
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
                            <button onclick="adminPanel.showPage('licenses')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="licenses">
                                <i class="fas fa-key mr-3"></i>Licenses
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
                            <button onclick="adminPanel.showPage('exports')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="exports">
                                <i class="fas fa-download mr-3"></i>Data Export
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

    showPage(page) {
        this.currentPage = page;
        this.updateActiveNavItem(page);
        
        switch(page) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'customers':
                this.showCustomers();
                break;
            case 'products':
                this.showProducts();
                break;
            case 'licenses':
                this.showLicenses();
                break;
            case 'rules':
                this.showRules();
                break;
            case 'uploads':
                this.showUploads();
                break;
            case 'security':
                this.showSecurityEvents();
                break;
            case 'backups':
                this.showBackups();
                break;
            case 'logs':
                this.showLogs();
                break;
            case 'exports':
                this.showExports();
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
        
        console.log('Rendering dashboard content with data:', data);
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
                            <p class="text-gray-600 text-sm">Active Licenses</p>
                            <p class="text-3xl font-bold text-gray-900">${data?.stats?.active_licenses || 0}</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-key text-green-600 text-xl"></i>
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
                                <span class="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">Operational</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Database Status</span>
                                <span class="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">Connected</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Response Time</span>
                                <span class="text-gray-900">${data?.system_health?.avg_response_time || 45}ms</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600">Uptime</span>
                                <span class="text-gray-900">99.9%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initializeCharts(data);
    }

    filterValidations(period) {
        // Update filter buttons
        document.querySelectorAll('.validation-filter').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-100', 'text-blue-800');
            btn.classList.add('bg-gray-100', 'text-gray-600');
        });
        
        const activeBtn = document.querySelector(`[data-period="${period}"]`);
        activeBtn.classList.add('active', 'bg-blue-100', 'text-blue-800');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-600');

        // Update chart data based on period
        this.updateValidationChart(period);
    }

    updateValidationChart(period) {
        // Mock data for different periods
        const chartData = {
            day: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                successful: [10, 15, 25, 30, 20, 12],
                failed: [2, 1, 3, 2, 1, 1]
            },
            week: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                successful: [120, 150, 180, 160, 140, 80, 90],
                failed: [5, 8, 12, 7, 6, 3, 4]
            },
            month: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                successful: [850, 920, 780, 650],
                failed: [25, 30, 18, 15]
            },
            year: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                successful: [3200, 3800, 3500, 2900],
                failed: [88, 95, 72, 58]
            }
        };

        const data = chartData[period];
        
        if (this.charts.validation) {
            this.charts.validation.data.labels = data.labels;
            this.charts.validation.data.datasets[0].data = data.successful;
            this.charts.validation.data.datasets[1].data = data.failed;
            this.charts.validation.update();
        }
    }

    async showCustomers() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Customers</h1>
                        <p class="text-gray-600 mt-2">Manage customer accounts and information</p>
                    </div>
                    <button onclick="adminPanel.showAddCustomer()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Customer
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6" id="customers-content">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                </div>
            </div>
        `;

        // Load both customers and products for the filter dropdown
        await Promise.all([
            this.loadCustomers(),
            this.loadProductsForFilter()
        ]);
    }

    async loadCustomers() {
        try {
            console.log('Loading customers...');
            console.log('Token available:', this.token ? 'Yes' : 'No');
            console.log('Token value:', this.token ? this.token.substring(0, 20) + '...' : 'None');
            
            const response = await this.apiCall('/admin/customers');
            console.log('Customers response:', response);
            
            const customers = response.success ? response.customers : [];
            console.log('Customers data:', customers);
            
            this.renderCustomersTable(customers);
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
            const response = await this.apiCall('/admin/products');
            if (response.success && response.products) {
                // Cache products for getProductName function
                this.productsCache = {};
                response.products.forEach(product => {
                    this.productsCache[product.id] = product;
                });

                // Update the product filter dropdown
                const productFilter = document.getElementById('product-filter');
                if (productFilter) {
                    // Keep "All Products" option and add real products
                    productFilter.innerHTML = `
                        <option value="">All Products</option>
                        ${response.products.map(product => 
                            `<option value="${product.id}">${product.name}</option>`
                        ).join('')}
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load products for filter:', error);
        }
    }

    renderCustomersTable(customers) {
        const content = document.getElementById('customers-content');
        content.innerHTML = `
            <!-- Filter and Export Controls -->
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium text-gray-700">Select Product</label>
                        <select id="product-filter" class="border border-gray-300 rounded px-3 py-1 text-sm bg-white">
                            <option value="">All Products</option>
                            <!-- Products loaded dynamically by loadProductsForFilter() -->
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
            
            <!-- Customer Table -->
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
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
                            ${customers.length > 0 ? customers.map(customer => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm text-gray-900">${customer.name || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <a href="mailto:${customer.email}" class="text-blue-600 hover:text-blue-800">
                                            ${customer.email}
                                        </a>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600">
                                        ${this.formatDateTime(customer.registration_date || customer.created_at)}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600">
                                        ${this.getProductName(customer.product_id)}
                                    </td>
                                    <td class="px-4 py-3 text-sm font-mono text-gray-600">
                                        ${customer.license_key || 'N/A'}
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <!-- Status Badge: Green=Active, Yellow=Suspended, Red=Invalid/Unrecognized -->
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.status === 'active' ? 'bg-green-100 text-green-800' : customer.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                                            ${customer.status === 'active' ? 'ACTIVE' : customer.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <div class="flex gap-1">
                                            <button onclick="adminPanel.editCustomer(${customer.id})" 
                                                class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" 
                                                title="Edit Customer">
                                                Edit
                                            </button>
                                            <button onclick="adminPanel.viewCustomerDetails(${customer.id})" 
                                                class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" 
                                                title="View Details">
                                                Details
                                            </button>
                                            <button onclick="adminPanel.deleteCustomer(${customer.id})" 
                                                class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700" 
                                                title="Delete Customer">
                                                Delete
                                            </button>
                                            <button onclick="adminPanel.resendLicenseEmail(${customer.id})" 
                                                class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700" 
                                                title="Email License Key">
                                                <i class="fas fa-envelope"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">No customers found</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Add event listener for product filter
        document.getElementById('product-filter').addEventListener('change', () => this.filterCustomers());
    }

    // Render only the table content without filter controls (for filtering)
    renderCustomersTableOnly(customers) {
        const tableContainer = document.querySelector('#customers-content .overflow-x-auto table tbody');
        if (tableContainer) {
            tableContainer.innerHTML = customers.length > 0 ? customers.map(customer => `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm text-gray-900">${customer.name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm">
                        <a href="mailto:${customer.email}" class="text-blue-600 hover:text-blue-800">
                            ${customer.email}
                        </a>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                        ${this.formatDateTime(customer.registration_date || customer.created_at)}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                        ${this.getProductName(customer.product_id)}
                    </td>
                    <td class="px-4 py-3 text-sm font-mono text-gray-600">
                        ${customer.license_key || 'N/A'}
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <!-- Status Badge: Green=Active, Yellow=Suspended, Red=Invalid/Unrecognized -->
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.status === 'active' ? 'bg-green-100 text-green-800' : customer.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                            ${customer.status === 'active' ? 'ACTIVE' : customer.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <div class="flex gap-1">
                            <button onclick="adminPanel.editCustomer(${customer.id})" 
                                class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" 
                                title="Edit Customer">
                                Edit
                            </button>
                            <button onclick="adminPanel.viewCustomerDetails(${customer.id})" 
                                class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700" 
                                title="View Details">
                                Details
                            </button>
                            <button onclick="adminPanel.deleteCustomer(${customer.id})" 
                                class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700" 
                                title="Delete Customer">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                            <p class="text-gray-500">No customers match the current filter.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
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

    // Helper method to get product name
    getProductName(productId) {
        // Use cached product data if available
        if (this.productsCache && this.productsCache[productId]) {
            return this.productsCache[productId].name;
        }
        return `Product ${productId}`;
    }

    // Filter customers by product
    async filterCustomers() {
        const productFilter = document.getElementById('product-filter').value;
        console.log('Filtering by product:', productFilter);
        
        try {
            let endpoint = '/admin/customers';
            if (productFilter) {
                endpoint += `?product_id=${productFilter}`;
            }
            
            const response = await this.apiCall(endpoint);
            const customers = response.success ? response.customers : [];
            
            // Only update the table content, not the filter dropdown
            this.renderCustomersTableOnly(customers);
        } catch (error) {
            console.error('Filter customers error:', error);
            this.showError('Failed to filter customers');
        }
    }

    // Export customers to Excel
    async exportToExcel() {
        try {
            this.showNotification('Preparing Excel export...', 'info');
            
            const response = await this.apiCall('/admin/export/customers');
            if (response.success) {
                // Create download link
                const downloadUrl = `${this.apiBaseUrl}/admin/export/customers/download?token=${this.token}`;
                window.open(downloadUrl, '_blank');
                this.showNotification('Excel export started', 'success');
            } else {
                this.showError('Failed to export data');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export data to Excel');
        }
    }

    // View customer details (like your old system's details page)
    async viewCustomerDetails(customerId) {
        try {
            console.log('Viewing customer details:', customerId);
            
            const response = await this.apiCall(`/admin/customers/${customerId}`);
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
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.status === 'active' ? 'bg-green-100 text-green-800' : customer.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                                ${customer.status === 'active' ? 'ACTIVE' : customer.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <div class="text-sm text-gray-900">${this.getProductName(customer.product_id)}</div>
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
            console.log('Editing customer:', customerId);
            
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
            console.log('Deleting customer:', customerId);
            
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
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="edit-customer-status" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="active" ${customer.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="suspended" ${customer.status === 'suspended' || customer.status === 'inactive' ? 'selected' : ''}>Suspended</option>
                            </select>
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
            console.log('Updating customer with data:', { name, email, status, notes: notes || null });
            
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
    }

    async handleAddCustomer() {
        const name = document.getElementById('customer-name').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const errorDiv = document.getElementById('customer-error');
        const saveBtn = document.getElementById('save-customer-btn');

        if (!name || !email) {
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
                email: email
            });

            if (response.success) {
                this.showPage('customers');
                this.showNotification('Customer created successfully', 'success');
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
                    <button onclick="adminPanel.showAddProduct()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Product
                    </button>
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
                                   <button onclick="adminPanel.editProduct(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>`;
                            
                            return `
                                <tr class="${!isActive ? 'bg-gray-50' : ''}">
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
                                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
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
            const response = await this.apiCall('/admin/rules');
            
            if (response.success && response.rules) {
                // Clear existing options
                rulesSelect.innerHTML = '<option value="">Select a rule template...</option>';
                
                // Add rules as options
                response.rules.forEach(rule => {
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
                rule_id: parseInt(selectedRuleId)
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
            console.log('Editing product:', productId);
            
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
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rule Template *</label>
                        <select id="edit-product-rules" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Loading rules...</option>
                        </select>
                        <p class="text-sm text-gray-500 mt-1">Select a rule template for this product</p>
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
            const response = await this.apiCall('/admin/rules');
            const rulesSelect = document.getElementById('edit-product-rules');
            
            if (response.success && response.rules) {
                rulesSelect.innerHTML = `
                    <option value="">Select a rule template...</option>
                    ${response.rules.map(rule => 
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
                rule_id: parseInt(selectedRuleId)
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
            console.log('Viewing product details:', productId);
            
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
            
            const response = await this.apiCall(`/admin/products/${productId}/regenerate-landing`, 'POST');
            
            if (response.success) {
                this.showNotification('Landing page regenerated successfully!', 'success');
                // Refresh the current view if we're on the edit page
                const currentUrl = window.location.hash;
                if (currentUrl.includes('edit')) {
                    this.editProduct(productId);
                }
            } else {
                throw new Error(response.message || 'Failed to regenerate landing page');
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

    async showLicenses() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Licenses</h1>
                        <p class="text-gray-600 mt-2">Manage software licenses and activations</p>
                    </div>
                    <button onclick="adminPanel.showAddLicense()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Generate License
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6" id="licenses-content">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadLicenses();
    }

    async loadLicenses() {
        try {
            const response = await this.apiCall('/admin/licenses');
            const licenses = response.success ? response.data : [];
            this.renderLicensesTable(licenses);
        } catch (error) {
            console.error('Failed to load licenses:', error);
            document.getElementById('licenses-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">Failed to load licenses</p>
                </div>
            `;
        }
    }

    renderLicensesTable(licenses) {
        const content = document.getElementById('licenses-content');
        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Key</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${licenses.length > 0 ? licenses.map(license => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <code class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">${license.license_key}</code>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${license.customer_name || 'Unknown'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${license.product_name || 'Unknown'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs rounded ${this.getStatusClass(license.status)}">
                                        ${license.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatDate(license.expires_at)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button onclick="adminPanel.viewLicense('${license.license_key}')" class="text-blue-600 hover:text-blue-800 mr-3">View</button>
                                    <button onclick="adminPanel.revokeLicense('${license.license_key}')" class="text-red-600 hover:text-red-800">Revoke</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="px-6 py-8 text-center text-gray-500">No licenses found</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
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
        
        // Load existing rules from API
        this.loadRules();
    }

    async loadRules() {
        const rulesList = document.getElementById('rules-list');
        if (!rulesList) return;

        try {
            console.log('Loading rules from API...');
            // Use the admin API endpoint for rules
            const response = await this.apiCall('/admin/rules', 'GET');
            console.log('Rules API response:', response);
            
            if (response.success && response.rules) {
                console.log('Found', response.rules.length, 'rules');
                if (response.rules.length === 0) {
                    rulesList.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-file-alt text-3xl mb-3"></i>
                            <p class="text-lg">No rules configured yet</p>
                            <p class="text-sm">Click "Add Rule" to create your first license rule</p>
                        </div>
                    `;
                } else {
                    rulesList.innerHTML = response.rules.map(rule => `
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
                                                <span class="text-gray-600">${rule.allowed_countries.slice(0, 3).join(', ')}${rule.allowed_countries.length > 3 ? ' +' + (rule.allowed_countries.length - 3) : ''}</span>
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
                    console.log('Force refreshing rules after rule creation...');
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
            console.log('Editing rule:', ruleId);
            this.showNotification('Loading rule template for editing...', 'info');
            
            // Get the rule data from API
            const response = await this.apiCall(`/admin/rules/${ruleId}`, 'GET');
            console.log('Edit rule API response:', response);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to load rule template');
            }

            const rule = response.rule;
            console.log('Rule data loaded:', rule);
            
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
            console.log('Deleting rule:', ruleId);
            this.showNotification('Loading rule template for deletion...', 'info');
            
            const response = await this.apiCall(`/admin/rules/${ruleId}`, 'GET');
            console.log('Delete rule - get rule response:', response);
            
            const ruleName = response.success ? response.rule.name : 'this rule template';

            if (confirm(`Are you sure you want to delete "${ruleName}"? This action cannot be undone.`)) {
                this.showNotification('Deleting rule template...', 'info');

                const deleteResponse = await this.apiCall(`/admin/rules/${ruleId}`, 'DELETE');
                console.log('Delete rule API response:', deleteResponse);
                
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

    showSecurityEvents() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Security Events</h1>
                        <p class="text-gray-600 mt-2">Monitor suspicious activities and security incidents</p>
                    </div>
                    <div class="flex space-x-3">
                        <select class="px-3 py-2 border border-gray-300 rounded-md">
                            <option value="all">All Events</option>
                            <option value="high">High Severity</option>
                            <option value="medium">Medium Severity</option>
                            <option value="low">Low Severity</option>
                        </select>
                        <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                            Export Report
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-red-100 p-3 rounded-full mr-4">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Critical Events</p>
                            <p class="text-2xl font-bold text-gray-900">3</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-yellow-100 p-3 rounded-full mr-4">
                            <i class="fas fa-shield-alt text-yellow-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Blocked IPs</p>
                            <p class="text-2xl font-bold text-gray-900">12</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-3 rounded-full mr-4">
                            <i class="fas fa-user-shield text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Failed Logins</p>
                            <p class="text-2xl font-bold text-gray-900">28</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-3 rounded-full mr-4">
                            <i class="fas fa-check-circle text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Resolved</p>
                            <p class="text-2xl font-bold text-gray-900">156</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Recent Security Events</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date().toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">License Tampering</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Critical</span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">Attempted license key modification detected</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">192.168.1.100</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Investigating</span>
                                </td>
                            </tr>
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(Date.now() - 3600000).toLocaleString()}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Brute Force Attack</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">High</span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">Multiple failed validation attempts</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">10.0.0.5</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Blocked</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
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

                        <div class="flex items-center justify-between">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Maintenance Mode</label>
                                <p class="text-sm text-gray-500">Disable public API access</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
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
                                <input type="checkbox" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
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
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [{
                        label: 'Successful',
                        data: [10, 15, 25, 30, 20, 12],
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }, {
                        label: 'Failed',
                        data: [2, 1, 3, 2, 1, 1],
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
                database_status: 'healthy',
                email_queue_size: 0,
                avg_response_time: 45,
                uptime: '99.9%'
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
                            </div>
                            <button onclick="adminPanel.showCreateBackupModal()" 
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
                                <i class="fas fa-plus mr-2"></i>Create Backup
                            </button>
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
            const response = await this.apiCall('/admin/backups');
            const backups = response.success ? response.backups : [];

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
                                    Size: ${(backup.original_size / 1024 / 1024).toFixed(2)} MB | 
                                    Tables: ${JSON.parse(backup.tables_included || '[]').length} |
                                    Status: ${backup.status}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${backup.status === 'completed' ? `
                            <button onclick="adminPanel.downloadBackup(${backup.id}, '${backup.backup_name}')"
                                class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200">
                                <i class="fas fa-download mr-1"></i>Download
                            </button>
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
            document.getElementById('backups-list').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load backups</p>
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

    async downloadBackup(backupId, backupName) {
        try {
            this.showNotification('Preparing backup download...', 'info');
            
            // Create a download link for the backup
            const downloadUrl = `${this.apiBaseUrl}/admin/backups/${backupId}/download`;
            
            // Create temporary download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${backupName}.json`;
            link.style.display = 'none';
            
            // Add authorization header by opening in new window
            window.open(`${downloadUrl}?token=${this.token}`, '_blank');
            
            this.showNotification('Backup download started', 'success');
        } catch (error) {
            console.error('Download backup failed:', error);
            this.showNotification('Failed to download backup: ' + error.message, 'error');
        }
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
                        <button onclick="adminPanel.cleanupUploads()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                            <i class="fas fa-trash mr-2"></i>Cleanup Old Files
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
                this.updateUploadStats();
            }
        } catch (error) {
            console.error('Failed to load uploads:', error);
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

    async cleanupUploads() {
        if (!confirm('Are you sure you want to clean up old uploads? This will delete files older than 30 days.')) {
            return;
        }

        try {
            const response = await this.apiCall('/admin/uploads/cleanup', 'POST');
            if (response.success) {
                this.showNotification(`Cleanup completed. ${response.deleted_count} files removed.`, 'success');
                this.loadUploads(); // Reload the list
                this.loadUploadStats(); // Refresh stats
            } else {
                throw new Error(response.message || 'Failed to cleanup uploads');
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
            this.showNotification('Failed to cleanup uploads: ' + error.message, 'error');
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
                                    <option value="create_customer">Create Customer</option>
                                    <option value="create_product">Create Product</option>
                                    <option value="create_license">Create License</option>
                                    <option value="create_backup">Create Backup</option>
                                    <option value="restore_backup">Restore Backup</option>
                                    <option value="bulk_create_licenses">Bulk Create Licenses</option>
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
                                        <h4 class="font-medium text-gray-900">${log.action_description}</h4>
                                        <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                            <span><i class="fas fa-user mr-1"></i>${log.admin_username || 'Unknown'}</span>
                                            <span><i class="fas fa-clock mr-1"></i>${new Date(log.created_at).toLocaleString()}</span>
                                            <span><i class="fas fa-tag mr-1"></i>${log.action_category}</span>
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

    // Data Export
    async showExports() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Export Customers -->
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-4 py-5 sm:p-6">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-users text-2xl text-blue-500"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Customers</dt>
                                        <dd class="text-lg font-medium text-gray-900">Export customer data</dd>
                                    </dl>
                                </div>
                            </div>
                            <div class="mt-5 flex justify-between">
                                <button onclick="adminPanel.exportData('customers', 'csv')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    <i class="fas fa-file-csv mr-2"></i>CSV
                                </button>
                                <button onclick="adminPanel.exportData('customers', 'json')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                    <i class="fas fa-file-code mr-2"></i>JSON
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Export Products -->
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-4 py-5 sm:p-6">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-box text-2xl text-purple-500"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Products</dt>
                                        <dd class="text-lg font-medium text-gray-900">Export product data</dd>
                                    </dl>
                                </div>
                            </div>
                            <div class="mt-5 flex justify-between">
                                <button onclick="adminPanel.exportData('products', 'csv')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    <i class="fas fa-file-csv mr-2"></i>CSV
                                </button>
                                <button onclick="adminPanel.exportData('products', 'json')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                    <i class="fas fa-file-code mr-2"></i>JSON
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Export Licenses -->
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-4 py-5 sm:p-6">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-key text-2xl text-yellow-500"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Licenses</dt>
                                        <dd class="text-lg font-medium text-gray-900">Export license data</dd>
                                    </dl>
                                </div>
                            </div>
                            <div class="mt-5 flex justify-between">
                                <button onclick="adminPanel.exportData('licenses', 'csv')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    <i class="fas fa-file-csv mr-2"></i>CSV
                                </button>
                                <button onclick="adminPanel.exportData('licenses', 'json')" 
                                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                    <i class="fas fa-file-code mr-2"></i>JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bulk License Operations -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-5 sm:p-6">
                        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Bulk License Operations</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Bulk Create -->
                            <div class="border border-gray-200 rounded-lg p-4">
                                <h4 class="font-medium text-gray-900 mb-3">
                                    <i class="fas fa-plus-circle mr-2 text-green-500"></i>Bulk Create Licenses
                                </h4>
                                <p class="text-sm text-gray-600 mb-4">Create multiple licenses at once from a template</p>
                                <button onclick="adminPanel.showBulkCreateModal()" 
                                    class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                    <i class="fas fa-plus mr-2"></i>Bulk Create
                                </button>
                            </div>

                            <!-- Bulk Delete -->
                            <div class="border border-gray-200 rounded-lg p-4">
                                <h4 class="font-medium text-gray-900 mb-3">
                                    <i class="fas fa-trash-alt mr-2 text-red-500"></i>Bulk Delete Licenses
                                </h4>
                                <p class="text-sm text-gray-600 mb-4">Delete multiple licenses by ID or criteria</p>
                                <button onclick="adminPanel.showBulkDeleteModal()" 
                                    class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                                    <i class="fas fa-trash mr-2"></i>Bulk Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async exportData(entity, format) {
        try {
            const exportName = `${entity}_export_${new Date().toISOString().split('T')[0]}`;
            const response = await this.apiCall(`/admin/export/${entity}`, 'POST', {
                format,
                export_name: exportName,
                filters: {},
                columns: [] // Empty means all columns
            });

            if (response.success) {
                this.showNotification(`Export started. Preparing ${response.record_count} records...`, 'success');
                
                // Download the file
                setTimeout(() => {
                    window.open(`${this.apiBaseUrl}/admin/export/${response.export_id}/download`, '_blank');
                }, 1000);
            } else {
                throw new Error(response.message || 'Export failed');
            }

        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed: ' + error.message, 'error');
        }
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
                <span>${message}</span>
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
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});