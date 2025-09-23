// Admin Panel JavaScript - Modern Turnkey Software Shield
// Comprehensive admin interface for managing customers, products, and system

class AdminPanel {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('admin_token');
        this.charts = {};
        this.currentPage = 'dashboard';
        
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
                            Turnkey Software Shield Administration
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
                this.renderDashboard(response.data);
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

    renderDashboard(data) {
        const app = document.getElementById('admin-app');
        app.innerHTML = `
            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b border-gray-200">
                <div class="px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <i class="fas fa-shield-alt text-2xl text-brand-blue mr-3"></i>
                            <h1 class="text-xl font-bold text-gray-900">Turnkey Software Shield</h1>
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
            <div class="flex h-screen bg-gray-50">
                <!-- Sidebar -->
                <div class="w-64 bg-white shadow-sm">
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
                <div class="flex-1 overflow-auto">
                    <div class="p-8" id="main-content">
                        ${this.renderDashboardContent(data)}
                    </div>
                </div>
            </div>
        `;

        this.updateActiveNavItem('dashboard');
        this.initializeCharts(data);
    }

    renderDashboardContent(data) {
        return `
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
                            <p class="text-3xl font-bold text-gray-900">${data.stats.total_customers}</p>
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
                            <p class="text-3xl font-bold text-gray-900">${data.stats.active_licenses}</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-key text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Validations Today</p>
                            <p class="text-3xl font-bold text-gray-900">${data.stats.total_validations_today}</p>
                        </div>
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-check-circle text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Security Events</p>
                            <p class="text-3xl font-bold text-gray-900">${data.stats.security_events_today}</p>
                        </div>
                        <div class="bg-red-100 p-3 rounded-full">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts and Recent Activity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Validation Chart -->
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">License Validations</h3>
                    <canvas id="validationChart" height="300"></canvas>
                </div>
                
                <!-- System Health -->
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Database Status</span>
                            <span class="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                                ${data.system_health.database_status}
                            </span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Email Queue</span>
                            <span class="text-gray-900">${data.system_health.email_queue_size} pending</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Avg Response Time</span>
                            <span class="text-gray-900">${Math.round(data.system_health.avg_response_time)}ms</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Uptime</span>
                            <span class="text-gray-900">${data.system_health.uptime}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Recent Customers -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Recent Customers</h3>
                    </div>
                    <div class="p-0">
                        ${data.recent_customers.length > 0 ? `
                            <div class="space-y-0">
                                ${data.recent_customers.slice(0, 5).map(customer => `
                                    <div class="p-4 border-b border-gray-100 last:border-b-0">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium text-gray-900">${customer.first_name} ${customer.last_name}</p>
                                                <p class="text-sm text-gray-600">${customer.email}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-sm text-gray-500">${this.formatDate(customer.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="p-4 text-center text-gray-500">
                                No recent customers
                            </div>
                        `}
                    </div>
                </div>

                <!-- Security Events -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Security Events</h3>
                    </div>
                    <div class="p-0">
                        ${data.security_events.length > 0 ? `
                            <div class="space-y-0">
                                ${data.security_events.slice(0, 5).map(event => `
                                    <div class="p-4 border-b border-gray-100 last:border-b-0">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium text-gray-900">${event.event_type.replace('_', ' ')}</p>
                                                <p class="text-sm text-gray-600">${event.description}</p>
                                            </div>
                                            <div class="text-right">
                                                <span class="px-2 py-1 text-xs rounded ${this.getSeverityClass(event.severity)}">
                                                    ${event.severity}
                                                </span>
                                                <p class="text-xs text-gray-500 mt-1">${this.formatDate(event.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="p-4 text-center text-gray-500">
                                No security events
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    initializeCharts(data) {
        // Initialize validation chart
        const ctx = document.getElementById('validationChart');
        if (ctx) {
            this.charts.validation = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Successful', 'Failed'],
                    datasets: [{
                        data: [
                            data.stats.total_validations_today - (data.stats.security_events_today || 0),
                            data.stats.security_events_today || 0
                        ],
                        backgroundColor: ['#10b981', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    async showPage(page) {
        this.currentPage = page;
        this.updateActiveNavItem(page);
        
        const content = document.getElementById('main-content');
        content.innerHTML = '<div class="flex justify-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';
        
        try {
            let pageContent = '';
            
            switch (page) {
                case 'dashboard':
                    const dashboardData = await this.apiCall('/admin/dashboard');
                    pageContent = this.renderDashboardContent(dashboardData.data);
                    break;
                case 'customers':
                    pageContent = await this.renderCustomersPage();
                    break;
                case 'products':
                    pageContent = await this.renderProductsPage();
                    break;
                case 'licenses':
                    pageContent = await this.renderLicensesPage();
                    break;
                case 'security':
                    pageContent = await this.renderSecurityPage();
                    break;
                case 'settings':
                    pageContent = await this.renderSettingsPage();
                    break;
                default:
                    pageContent = '<div class="text-center py-8">Page not found</div>';
            }
            
            content.innerHTML = pageContent;
            
            if (page === 'dashboard') {
                // Reinitialize charts for dashboard
                setTimeout(() => {
                    const dashboardData = JSON.parse(sessionStorage.getItem('dashboard_data') || '{}');
                    if (dashboardData.stats) {
                        this.initializeCharts(dashboardData);
                    }
                }, 100);
            }
        } catch (error) {
            console.error(`Failed to load ${page}:`, error);
            content.innerHTML = `<div class="text-center py-8 text-red-600">Failed to load ${page}</div>`;
        }
    }

    async renderCustomersPage() {
        const result = await this.apiCall('/admin/customers');
        if (!result.success) {
            throw new Error(result.error);
        }

        const customers = result.data.customers;
        
        return `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Customers</h1>
                        <p class="text-gray-600 mt-2">Manage customer accounts and licenses</p>
                    </div>
                    <button onclick="adminPanel.showAddCustomerModal()" 
                        class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Customer
                    </button>
                </div>
            </div>

            <!-- Customers Table -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900">Customer List</h3>
                        <div class="flex space-x-2">
                            <input type="text" placeholder="Search customers..." 
                                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                id="customer-search">
                            <button class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devices</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${customers.map(customer => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">
                                                ${customer.name || 'N/A'}
                                            </div>
                                            ${customer.company ? `<div class="text-sm text-gray-500">${customer.company}</div>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${customer.device_count || 0} devices
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs rounded ${customer.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${customer.is_active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${this.formatDate(customer.created_at)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onclick="adminPanel.showEditCustomerModal(${customer.id})" 
                                            class="text-indigo-600 hover:text-indigo-900 mr-2">
                                            <i class="fas fa-edit mr-1"></i>Edit
                                        </button>
                                        <button onclick="adminPanel.deleteCustomer(${customer.id}, '${customer.name}')" 
                                            class="text-red-600 hover:text-red-900">
                                            <i class="fas fa-trash mr-1"></i>Delete
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderProductsPage() {
        const result = await this.apiCall('/admin/products');
        if (!result.success) {
            throw new Error(result.error);
        }

        const products = result.data.products;
        
        return `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Products</h1>
                        <p class="text-gray-600 mt-2">Manage protected software products</p>
                    </div>
                    <button onclick="adminPanel.showAddProductModal()" 
                        class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Product
                    </button>
                </div>
            </div>

            <!-- Products Table -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900">Product List</h3>
                        <div class="flex space-x-2">
                            <input type="text" placeholder="Search products..." 
                                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                id="product-search">
                            <button class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Licenses</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${products.length ? products.map(product => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">
                                                ${product.name}
                                            </div>
                                            ${product.description ? `<div class="text-sm text-gray-500">${product.description}</div>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.version}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${product.license_count || 0} licenses
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs rounded ${product.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${product.is_active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${this.formatDate(product.created_at)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onclick="adminPanel.showEditProductModal(${product.id})" 
                                            class="text-indigo-600 hover:text-indigo-900 mr-2">
                                            <i class="fas fa-edit mr-1"></i>Edit
                                        </button>
                                        <button onclick="adminPanel.deleteProduct(${product.id}, '${product.name}')" 
                                            class="text-red-600 hover:text-red-900">
                                            <i class="fas fa-trash mr-1"></i>Delete
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                                        <i class="fas fa-box text-2xl mb-2 block"></i>
                                        No products found. Create your first product to get started.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderLicensesPage() {
        const result = await this.apiCall('/admin/licenses');
        if (!result.success) {
            throw new Error(result.error);
        }

        const licenses = result.data.licenses;
        
        return `
            <div class="mb-8">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">Licenses</h1>
                        <p class="text-gray-600 mt-2">View and manage software licenses</p>
                    </div>
                    <button onclick="adminPanel.showAddLicenseModal()" 
                        class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Generate License
                    </button>
                </div>
            </div>

            <!-- License Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <i class="fas fa-key text-2xl text-blue-500 mr-4"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-600">Total Licenses</p>
                            <p class="text-2xl font-bold text-gray-900">${licenses.length}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-2xl text-green-500 mr-4"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-600">Active</p>
                            <p class="text-2xl font-bold text-gray-900">${licenses.filter(l => l.status === 'active').length}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <i class="fas fa-clock text-2xl text-yellow-500 mr-4"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-600">Expiring Soon</p>
                            <p class="text-2xl font-bold text-gray-900">${licenses.filter(l => {
                                if (!l.expires_at || l.status !== 'active') return false;
                                const expirationDate = new Date(l.expires_at);
                                const thirtyDaysFromNow = new Date();
                                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                                return expirationDate <= thirtyDaysFromNow;
                            }).length}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <i class="fas fa-ban text-2xl text-red-500 mr-4"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-600">Revoked</p>
                            <p class="text-2xl font-bold text-gray-900">${licenses.filter(l => l.status === 'revoked').length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Licenses Table -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900">License List</h3>
                        <div class="flex space-x-2">
                            <select class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="revoked">Revoked</option>
                                <option value="expired">Expired</option>
                            </select>
                            <input type="text" placeholder="Search licenses..." 
                                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                id="license-search">
                            <button class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Key</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${licenses.length ? licenses.map(license => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-mono text-gray-900">
                                            ${license.license_key.substring(0, 8)}...${license.license_key.substring(-8)}
                                        </div>
                                        <button onclick="navigator.clipboard.writeText('${license.license_key}')" 
                                            class="text-xs text-blue-600 hover:text-blue-800">
                                            <i class="fas fa-copy mr-1"></i>Copy Full Key
                                        </button>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">${license.customer_name || 'N/A'}</div>
                                        <div class="text-sm text-gray-500">${license.customer_email || ''}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">${license.product_name || 'N/A'}</div>
                                        <div class="text-sm text-gray-500">v${license.product_version || '1.0.0'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                                            ${license.license_type || 'standard'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs rounded ${this.getLicenseStatusClass(license.status)}">
                                            ${license.status || 'active'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${license.expires_at ? this.formatDate(license.expires_at) : 'Never'}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        ${license.status === 'active' ? `
                                            <button onclick="adminPanel.revokeLicense(${license.id}, '${license.license_key}')" 
                                                class="text-red-600 hover:text-red-900">
                                                <i class="fas fa-ban mr-1"></i>Revoke
                                            </button>
                                        ` : `
                                            <span class="text-gray-400">No actions</span>
                                        `}
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                                        <i class="fas fa-key text-2xl mb-2 block"></i>
                                        No licenses found. Generate your first license to get started.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderSecurityPage() {
        return `
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Security Events</h1>
                <p class="text-gray-600 mt-2">Monitor security incidents and threats</p>
            </div>
            <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                <i class="fas fa-shield-alt text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">Security monitoring coming soon...</p>
            </div>
        `;
    }

    async renderSettingsPage() {
        return `
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">System Settings</h1>
                <p class="text-gray-600 mt-2">Configure system parameters and preferences</p>
            </div>
            <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                <i class="fas fa-cog text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">System settings coming soon...</p>
            </div>
        `;
    }

    updateActiveNavItem(activePage) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-brand-blue', 'text-white');
            item.classList.add('text-gray-600', 'hover:bg-gray-100');
        });
        
        const activeItem = document.querySelector(`[data-page="${activePage}"]`);
        if (activeItem) {
            activeItem.classList.remove('text-gray-600', 'hover:bg-gray-100');
            activeItem.classList.add('bg-brand-blue', 'text-white');
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        this.token = null;
        this.currentUser = null;
        this.showLogin();
    }

    async apiCall(endpoint, options = {}) {
        try {
            const config = {
                ...options,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };
            
            const response = await axios(`${this.apiBaseUrl}${endpoint}`, config);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error);
            
            if (error.response?.status === 401) {
                this.logout();
                return { success: false, error: 'Authentication failed' };
            }
            
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    getSeverityClass(severity) {
        const classes = {
            low: 'bg-blue-100 text-blue-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800'
        };
        return classes[severity] || classes.medium;
    }

    getLicenseStatusClass(status) {
        const classes = {
            active: 'bg-green-100 text-green-800',
            revoked: 'bg-red-100 text-red-800',
            expired: 'bg-gray-100 text-gray-800',
            suspended: 'bg-yellow-100 text-yellow-800'
        };
        return classes[status] || classes.active;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    showError(message) {
        const app = document.getElementById('admin-app');
        app.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                    <p class="text-gray-600">${message}</p>
                    <button onclick="location.reload()" 
                        class="mt-4 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    // CRUD Operations for Customers
    showAddCustomerModal() {
        this.showModal('Add Customer', `
            <form id="customer-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input type="text" name="name" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input type="text" name="company" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="adminPanel.hideModal()" 
                        class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" 
                        class="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                        Add Customer
                    </button>
                </div>
            </form>
        `, async (formData) => {
            const result = await this.apiCall('/admin/customers', {
                method: 'POST',
                data: formData
            });
            
            if (result.success) {
                this.hideModal();
                this.loadPage('customers');
                this.showToast('Customer added successfully', 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        });
    }

    showEditCustomerModal(customerId) {
        // First get customer data
        this.apiCall(`/admin/customers/${customerId}`).then(result => {
            if (!result.success) {
                this.showToast(result.error, 'error');
                return;
            }
            
            const customer = result.data.customer;
            this.showModal('Edit Customer', `
                <form id="customer-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" value="${customer.email}" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input type="text" name="name" value="${customer.name}" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Company</label>
                        <input type="text" name="company" value="${customer.company || ''}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input type="tel" name="phone" value="${customer.phone || ''}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="adminPanel.hideModal()" 
                            class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button type="submit" 
                            class="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Update Customer
                        </button>
                    </div>
                </form>
            `, async (formData) => {
                const result = await this.apiCall(`/admin/customers/${customerId}`, {
                    method: 'PUT',
                    data: formData
                });
                
                if (result.success) {
                    this.hideModal();
                    this.loadPage('customers');
                    this.showToast('Customer updated successfully', 'success');
                } else {
                    this.showToast(result.error, 'error');
                }
            });
        });
    }

    async deleteCustomer(customerId, customerName) {
        if (!confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
            return;
        }

        const result = await this.apiCall(`/admin/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.loadPage('customers');
            this.showToast('Customer deleted successfully', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    // CRUD Operations for Products
    showAddProductModal() {
        this.showModal('Add Product', `
            <form id="product-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                    <input type="text" name="name" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Version</label>
                    <input type="text" name="version" placeholder="1.0.0" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea name="description" rows="3" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Features (JSON)</label>
                    <textarea name="features" rows="3" placeholder='{"feature1": true, "feature2": false}' 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue font-mono text-sm"></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="adminPanel.hideModal()" 
                        class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" 
                        class="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                        Add Product
                    </button>
                </div>
            </form>
        `, async (formData) => {
            // Parse features JSON if provided
            if (formData.features) {
                try {
                    formData.features = JSON.parse(formData.features);
                } catch (e) {
                    this.showToast('Invalid JSON format for features', 'error');
                    return;
                }
            }

            const result = await this.apiCall('/admin/products', {
                method: 'POST',
                data: formData
            });
            
            if (result.success) {
                this.hideModal();
                this.loadPage('products');
                this.showToast('Product added successfully', 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        });
    }

    showEditProductModal(productId) {
        this.apiCall(`/admin/products/${productId}`).then(result => {
            if (!result.success) {
                this.showToast(result.error, 'error');
                return;
            }
            
            const product = result.data.product;
            this.showModal('Edit Product', `
                <form id="product-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                        <input type="text" name="name" value="${product.name}" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Version</label>
                        <input type="text" name="version" value="${product.version}" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea name="description" rows="3" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">${product.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Features (JSON)</label>
                        <textarea name="features" rows="3" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue font-mono text-sm">${JSON.stringify(product.features || {}, null, 2)}</textarea>
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="adminPanel.hideModal()" 
                            class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button type="submit" 
                            class="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Update Product
                        </button>
                    </div>
                </form>
            `, async (formData) => {
                // Parse features JSON if provided
                if (formData.features) {
                    try {
                        formData.features = JSON.parse(formData.features);
                    } catch (e) {
                        this.showToast('Invalid JSON format for features', 'error');
                        return;
                    }
                }

                const result = await this.apiCall(`/admin/products/${productId}`, {
                    method: 'PUT',
                    data: formData
                });
                
                if (result.success) {
                    this.hideModal();
                    this.loadPage('products');
                    this.showToast('Product updated successfully', 'success');
                } else {
                    this.showToast(result.error, 'error');
                }
            });
        });
    }

    async deleteProduct(productId, productName) {
        if (!confirm(`Are you sure you want to delete product "${productName}"? This will also affect all related licenses.`)) {
            return;
        }

        const result = await this.apiCall(`/admin/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            this.loadPage('products');
            this.showToast('Product deleted successfully', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    // CRUD Operations for Licenses
    showAddLicenseModal() {
        // First get customers and products for dropdowns
        Promise.all([
            this.apiCall('/admin/customers'),
            this.apiCall('/admin/products')
        ]).then(([customersResult, productsResult]) => {
            if (!customersResult.success || !productsResult.success) {
                this.showToast('Failed to load data', 'error');
                return;
            }

            const customers = customersResult.data.customers;
            const products = productsResult.data.products;

            this.showModal('Add License', `
                <form id="license-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                        <select name="customer_id" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                            <option value="">Select Customer</option>
                            ${customers.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Product</label>
                        <select name="product_id" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                            <option value="">Select Product</option>
                            ${products.map(p => `<option value="${p.id}">${p.name} v${p.version}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">License Type</label>
                        <select name="license_type" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                            <option value="">Select Type</option>
                            <option value="standard">Standard</option>
                            <option value="trial">Trial</option>
                            <option value="premium">Premium</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Max Devices</label>
                        <input type="number" name="max_devices" value="1" min="1" required 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
                        <input type="date" name="expires_at" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-blue">
                    </div>
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="adminPanel.hideModal()" 
                            class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button type="submit" 
                            class="bg-brand-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Generate License
                        </button>
                    </div>
                </form>
            `, async (formData) => {
                const result = await this.apiCall('/admin/licenses', {
                    method: 'POST',
                    data: formData
                });
                
                if (result.success) {
                    this.hideModal();
                    this.loadPage('licenses');
                    this.showToast('License generated successfully', 'success');
                } else {
                    this.showToast(result.error, 'error');
                }
            });
        });
    }

    async revokeLicense(licenseId, licenseKey) {
        if (!confirm(`Are you sure you want to revoke license "${licenseKey}"? This action cannot be undone.`)) {
            return;
        }

        const result = await this.apiCall(`/admin/licenses/${licenseId}/revoke`, {
            method: 'POST'
        });
        
        if (result.success) {
            this.loadPage('licenses');
            this.showToast('License revoked successfully', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    // Modal system
    showModal(title, content, onSubmit = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.id = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    <button onclick="adminPanel.hideModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        if (onSubmit) {
            const form = modal.querySelector('form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    await onSubmit(data);
                });
            }
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    hideModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // Toast notification system
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        }[type] || 'bg-blue-500';
        
        toast.className = `fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});