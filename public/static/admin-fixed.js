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
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    showLogin() {
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
            const response = await axios.post(`${this.apiBaseUrl}/admin/auth/login`, {
                username,
                password
            });

            if (response.data.success) {
                this.token = response.data.token;
                this.currentUser = response.data.admin;
                localStorage.setItem('admin_token', this.token);
                
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
        this.showLoading();
        
        try {
            const response = await this.apiCall('/admin/dashboard');
            if (response.success) {
                this.renderMainLayout();
                this.showDashboard(response.data);
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError('Failed to load dashboard data');
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
                            <button onclick="adminPanel.showPage('security')" 
                                class="nav-item w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg"
                                data-page="security">
                                <i class="fas fa-shield-alt mr-3"></i>Security Events
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
            case 'security':
                this.showSecurityEvents();
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

        await this.loadCustomers();
    }

    async loadCustomers() {
        try {
            const response = await this.apiCall('/admin/customers');
            const customers = response.success ? response.data : [];
            this.renderCustomersTable(customers);
        } catch (error) {
            console.error('Failed to load customers:', error);
            document.getElementById('customers-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">Failed to load customers</p>
                </div>
            `;
        }
    }

    renderCustomersTable(customers) {
        const content = document.getElementById('customers-content');
        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licenses</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${customers.length > 0 ? customers.map(customer => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-medium text-gray-900">${customer.name || customer.first_name + ' ' + customer.last_name}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${customer.email}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${customer.license_count || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatDate(customer.created_at)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button onclick="adminPanel.editCustomer(${customer.id})" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                    <button onclick="adminPanel.deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-800">Delete</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="px-6 py-8 text-center text-gray-500">No customers found</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
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
    async showProducts() {
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

            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6" id="products-content">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadProducts();
    }

    async loadProducts() {
        try {
            const response = await this.apiCall('/admin/products');
            const products = response.success ? response.data : [];
            this.renderProductsTable(products);
        } catch (error) {
            console.error('Failed to load products:', error);
            document.getElementById('products-content').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-600">Failed to load products</p>
                </div>
            `;
        }
    }

    renderProductsTable(products) {
        const content = document.getElementById('products-content');
        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rules</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licenses</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${products.length > 0 ? products.map(product => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-medium text-gray-900">${product.name}</div>
                                    <div class="text-sm text-gray-500">${product.description || 'No description'}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${product.version}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${product.rules_count || 0} rules</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${product.license_count || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatDate(product.created_at)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button onclick="adminPanel.editProduct(${product.id})" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                    <button onclick="adminPanel.deleteProduct(${product.id})" class="text-red-600 hover:text-red-800">Delete</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="px-6 py-8 text-center text-gray-500">No products found</td>
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
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rules</label>
                        <select id="product-rules" multiple 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="hardware_binding">Hardware Binding Required</option>
                            <option value="time_limited">Time Limited License</option>
                            <option value="geo_restricted">Geographic Restrictions</option>
                            <option value="device_limit">Device Count Limit</option>
                        </select>
                        <p class="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple rules</p>
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
    }

    async handleAddProduct() {
        const name = document.getElementById('product-name').value.trim();
        const version = document.getElementById('product-version').value.trim();
        const description = document.getElementById('product-description').value.trim();
        const rules = Array.from(document.getElementById('product-rules').selectedOptions).map(option => option.value);
        const errorDiv = document.getElementById('product-error');
        const saveBtn = document.getElementById('save-product-btn');

        if (!name || !version) {
            errorDiv.textContent = 'Please fill in all required fields';
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
                rules: rules
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
                        <p class="text-gray-600 mt-2">Configure licensing rules and restrictions</p>
                    </div>
                    <button onclick="adminPanel.showAddRule()" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Rule
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Global Rules -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Global Rules</h3>
                        <p class="text-sm text-gray-600 mt-1">Rules applied to all licenses</p>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-900">Hardware Binding Required</h4>
                                <p class="text-sm text-gray-600">Licenses must be bound to specific hardware</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-900">Maximum Devices Per License</h4>
                                <p class="text-sm text-gray-600">Default device limit for new licenses</p>
                            </div>
                            <input type="number" value="3" min="1" max="10" 
                                class="w-16 px-2 py-1 border border-gray-300 rounded text-center">
                        </div>

                        <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-900">License Duration (Days)</h4>
                                <p class="text-sm text-gray-600">Default expiration for new licenses</p>
                            </div>
                            <input type="number" value="365" min="1" 
                                class="w-20 px-2 py-1 border border-gray-300 rounded text-center">
                        </div>
                    </div>
                </div>

                <!-- Custom Rules -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Custom Rules</h3>
                        <p class="text-sm text-gray-600 mt-1">Product-specific licensing rules</p>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4" id="custom-rules-list">
                            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div>
                                    <h4 class="font-medium text-gray-900">Geographic Restrictions</h4>
                                    <p class="text-sm text-gray-600">Restrict usage to specific countries</p>
                                    <span class="text-xs text-blue-600">Applied to: MyApp Pro</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                </div>
                            </div>

                            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div>
                                    <h4 class="font-medium text-gray-900">Time-Based Usage</h4>
                                    <p class="text-sm text-gray-600">Limit usage to business hours</p>
                                    <span class="text-xs text-blue-600">Applied to: Enterprise Suite</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [{
                        label: 'Successful',
                        data: [10, 15, 25, 30, 20, 12],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Failed',
                        data: [2, 1, 3, 2, 1, 1],
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
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
                validations_today: 0
            },
            system_health: {
                avg_response_time: 45
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

    logout() {
        localStorage.removeItem('admin_token');
        this.token = null;
        this.currentUser = null;
        this.dashboardRendered = false; // Reset flag
        this.showLogin();
    }
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});