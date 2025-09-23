// Customer Portal JavaScript - Modern Turnkey Software Shield
// Self-service interface for customers to manage their licenses

class CustomerPortal {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('customer_token');
        
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
            // For now, just check if token exists (simplified for demo)
            return this.token && this.token.length > 0;
        } catch (error) {
            return false;
        }
    }

    showLogin() {
        const portal = document.getElementById('customer-portal');
        portal.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
                            <i class="fas fa-shield-alt text-white text-xl"></i>
                        </div>
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Customer Portal
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            Access your software licenses and account
                        </p>
                    </div>
                    <form class="mt-8 space-y-6" id="customer-login-form">
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input id="email" name="email" type="email" required
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address">
                            </div>
                            <div>
                                <input id="password" name="password" type="password" required
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Password">
                            </div>
                        </div>

                        <div id="customer-login-error" class="hidden text-red-600 text-sm text-center"></div>

                        <div>
                            <button type="submit" id="customer-login-btn"
                                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <i class="fas fa-sign-in-alt text-blue-500 group-hover:text-blue-400"></i>
                                </span>
                                Sign In
                            </button>
                        </div>

                        <div class="text-center">
                            <a href="/" class="text-blue-600 hover:text-blue-700 text-sm">
                                ← Back to Main Site
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('customer-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('customer-login-btn');
        const errorDiv = document.getElementById('customer-login-error');

        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
        loginBtn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            // For demo purposes, accept any email/password combination
            if (email && password) {
                this.token = btoa(JSON.stringify({
                    email: email,
                    name: email.split('@')[0],
                    loginTime: Date.now()
                }));
                
                localStorage.setItem('customer_token', this.token);
                this.currentUser = { email: email, name: email.split('@')[0] };
                
                await this.loadDashboard();
            } else {
                throw new Error('Please enter both email and password');
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }
    }

    async loadDashboard() {
        const portal = document.getElementById('customer-portal');
        
        // Mock license data for demo
        const mockLicenses = [
            {
                id: 1,
                license_key: 'DEMO-1234-5678-ABCD',
                product_name: 'Protected Software Pro',
                status: 'active',
                devices_used: 2,
                devices_allowed: 5,
                expires_at: '2024-12-31',
                last_validation: '2025-09-23 14:35:00'
            },
            {
                id: 2,
                license_key: 'DEMO-9876-5432-EFGH',
                product_name: 'Security Suite Enterprise',
                status: 'active',
                devices_used: 1,
                devices_allowed: 3,
                expires_at: '2025-06-15',
                last_validation: '2025-09-22 09:15:00'
            }
        ];

        portal.innerHTML = `
            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b border-gray-200">
                <div class="px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <i class="fas fa-shield-alt text-2xl text-blue-600 mr-3"></i>
                            <h1 class="text-xl font-bold text-gray-900">Customer Portal</h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-gray-600">Welcome, ${this.currentUser?.name || 'Customer'}</span>
                            <button onclick="customerPortal.logout()" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-sign-out-alt mr-1"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <!-- Dashboard Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">License Dashboard</h1>
                    <p class="text-gray-600 mt-2">Manage your software licenses and devices</p>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-green-100 p-3 rounded-full mr-4">
                                <i class="fas fa-key text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-gray-900">${mockLicenses.length}</p>
                                <p class="text-gray-600 text-sm">Active Licenses</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-blue-100 p-3 rounded-full mr-4">
                                <i class="fas fa-desktop text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-gray-900">3/8</p>
                                <p class="text-gray-600 text-sm">Devices Used</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-yellow-100 p-3 rounded-full mr-4">
                                <i class="fas fa-clock text-yellow-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-gray-900">125</p>
                                <p class="text-gray-600 text-sm">Days Remaining</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Licenses Table -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Your Licenses</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devices</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${mockLicenses.map(license => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${license.license_key}</div>
                                            <div class="text-sm text-gray-500">Last used: ${license.last_validation}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${license.product_name}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 text-xs rounded ${license.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${license.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${license.devices_used}/${license.devices_allowed}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${new Date(license.expires_at).toLocaleDateString()}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onclick="customerPortal.viewLicense('${license.license_key}')" 
                                                class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                                            <button onclick="customerPortal.manageLicense('${license.license_key}')" 
                                                class="text-indigo-600 hover:text-indigo-900">Manage</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            <div class="flex items-center">
                                <div class="bg-green-100 p-2 rounded-full mr-4">
                                    <i class="fas fa-check text-green-600"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-900">License validated successfully</p>
                                    <p class="text-sm text-gray-500">DEMO-1234-5678-ABCD • 2 hours ago</p>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <div class="bg-blue-100 p-2 rounded-full mr-4">
                                    <i class="fas fa-desktop text-blue-600"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-900">New device registered</p>
                                    <p class="text-sm text-gray-500">DESKTOP-HOME-PC • Yesterday</p>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <div class="bg-green-100 p-2 rounded-full mr-4">
                                    <i class="fas fa-download text-green-600"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Software downloaded</p>
                                    <p class="text-sm text-gray-500">Protected Software Pro v2.1 • 3 days ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    viewLicense(licenseKey) {
        alert(`Viewing license details for: ${licenseKey}\n\nThis would show:\n- Device list\n- Usage history\n- Validation logs\n- Expiry information`);
    }

    manageLicense(licenseKey) {
        alert(`Managing license: ${licenseKey}\n\nThis would allow:\n- Remove old devices\n- Download software\n- View detailed analytics\n- Contact support`);
    }

    logout() {
        localStorage.removeItem('customer_token');
        this.token = null;
        this.currentUser = null;
        this.showLogin();
    }
}

// Initialize customer portal
document.addEventListener('DOMContentLoaded', () => {
    window.customerPortal = new CustomerPortal();
});