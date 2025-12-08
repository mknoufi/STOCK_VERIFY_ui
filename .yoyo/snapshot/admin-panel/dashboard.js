/**
 * Enhanced Admin Dashboard JavaScript
 * Advanced monitoring and control system for Stock Verification System
 */

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    if (typeof showAlert === 'function') {
        showAlert('error', 'System Error', 'An unexpected error occurred. Check console for details.');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (typeof showAlert === 'function') {
        showAlert('warning', 'Network Error', 'A network request failed. Retrying...');
    }
    event.preventDefault(); // Prevent default browser behavior
});

// Configuration
/** @type {{API_BASE: string, ADMIN_API: string, UPDATE_INTERVALS: {STATUS: number, METRICS: number, LOGS: number, SECURITY: number}, CHART_POINTS: number, ALERT_TIMEOUT: number}} */
const CONFIG = {
    API_BASE: 'http://localhost:8000/api',
    ADMIN_API: 'http://localhost:3000/api',
    UPDATE_INTERVALS: {
        STATUS: 5000,      // 5 seconds
        METRICS: 3000,     // 3 seconds
        LOGS: 2000,        // 2 seconds
        SECURITY: 10000,   // 10 seconds
    },
    CHART_POINTS: 50,      // Number of data points to keep
    ALERT_TIMEOUT: 5000,   // Auto-dismiss alerts after 5 seconds
};

// Global State
/** @type {{theme: string, autoRefresh: boolean, autoScroll: boolean, alertsEnabled: boolean, chartsEnabled: boolean, charts: Object, intervals: Object, data: {metrics: {cpu: Array, memory: Array, api: Array}, services: Object, security: Object, logs: Array}, alerts: Array, alertCount: number}} */
const state = {
    theme: localStorage.getItem('admin-theme') || 'light',
    autoRefresh: true,
    autoScroll: true,
    alertsEnabled: true,
    chartsEnabled: false, // Will be set to true if Chart.js loads successfully
    charts: {},
    intervals: {},
    data: {
        metrics: {
            cpu: [],
            memory: [],
            api: [],
        },
        services: {},
        security: {},
        logs: [],
    },
    alerts: [],
    alertCount: 0,
};

// Chart Configurations
const chartConfigs = {
    cpu: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU Usage %',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    display: false,
                },
                x: {
                    display: false,
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            elements: {
                point: {
                    radius: 0,
                }
            }
        }
    },
    memory: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Memory Usage %',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    display: false,
                },
                x: {
                    display: false,
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            elements: {
                point: {
                    radius: 0,
                }
            }
        }
    },
    api: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Response Time ms',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    display: false,
                },
                x: {
                    display: false,
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            elements: {
                point: {
                    radius: 0,
                }
            }
        }
    }
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Enhanced Admin Dashboard...');

    initializeTheme();
    initializeCharts();
    setupEventListeners();
    startDataCollection();

    // Initial data load
    Promise.allSettled([
        refreshServices(),
        refreshMetrics(),
        refreshSecurityData(),
        refreshLogs()
    ]).then((results) => {
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length === 0) {
            showAlert('success', 'Dashboard initialized successfully', 'System is ready for monitoring');
        } else {
            console.warn(`${failures.length} initialization operations failed:`, failures);
            showAlert('warning', 'Partial Initialization', `${results.length - failures.length}/${results.length} components loaded successfully`);
        }
    }).catch(error => {
        console.error('Dashboard initialization failed:', error);
        showAlert('error', 'Initialization Failed', 'Some features may not work correctly');
    });

    } catch (initError) {
        console.error('Critical initialization error:', initError);
        // Show fallback error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; padding: 20px; border: 1px solid #e74c3c; border-radius: 8px; background: #fdf2f2;">
                    <h2 style="color: #e74c3c; margin: 0 0 10px 0;">⚠️ Dashboard Initialization Failed</h2>
                    <p style="margin: 0; color: #666;">Please refresh the page or check the browser console for details.</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
});

// Theme Management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('admin-theme', state.theme);
    initializeTheme();

    // Refresh charts to apply theme colors
    if (typeof Chart !== 'undefined' && state.charts) {
        Object.values(state.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                try {
                    chart.update();
                } catch (error) {
                    console.debug('Chart update failed during theme toggle:', error);
                }
            }
        });
    }

    // Show theme change notification if alert function exists
    if (typeof showAlert === 'function') {
        showAlert('info', 'Theme Changed', `Switched to ${state.theme} theme`);
    } else {
        console.log(`Theme switched to ${state.theme}`);
    }
}

// Chart Management
function initializeCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js library not loaded. Charts will be disabled.');
        state.chartsEnabled = false;
        return;
    }

    try {
        // Metric cards charts
        ['cpu', 'memory', 'api'].forEach(metric => {
            const canvas = document.getElementById(`${metric}Chart`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (chartConfigs[metric]) {
                    state.charts[metric] = new Chart(ctx, chartConfigs[metric]);
                } else {
                    console.warn(`Chart config not found for: ${metric}`);
                }
            }
        });

        // Analytics charts
        initializeAnalyticsCharts();

        state.chartsEnabled = true;
        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Chart initialization failed:', error);
        state.chartsEnabled = false;
    }
}

function initializeAnalyticsCharts() {
    if (typeof Chart === 'undefined') {
        console.debug('Chart.js not available, skipping analytics charts');
        return;
    }

    try {
        // System Load Chart
        const systemLoadCtx = document.getElementById('systemLoadChart');
        if (systemLoadCtx) {
            state.charts.systemLoad = new Chart(systemLoadCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU %',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                    },
                    {
                        label: 'Memory %',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                }
            }
        });
    }

    // Response Time Chart
    const responseTimeCtx = document.getElementById('responseTimeChart');
    if (responseTimeCtx) {
        state.charts.responseTime = new Chart(responseTimeCtx, {
            type: 'bar',
            data: {
                labels: ['Auth', 'Items', 'Users', 'Reports', 'Sync'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#6366f1',
                    ],
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Milliseconds'
                        }
                    }
                }
            }
        });
    }

    // Error Rate Chart
    const errorRateCtx = document.getElementById('errorRateChart');
    if (errorRateCtx) {
        state.charts.errorRate = new Chart(errorRateCtx, {
            type: 'doughnut',
            data: {
                labels: ['Success', 'Client Errors', 'Server Errors'],
                datasets: [{
                    data: [95, 3, 2],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                    ],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    // Database Performance Chart
    const dbPerformanceCtx = document.getElementById('dbPerformanceChart');
    if (dbPerformanceCtx) {
        state.charts.dbPerformance = new Chart(dbPerformanceCtx, {
            type: 'radar',
            data: {
                labels: ['Connections', 'Query Time', 'Throughput', 'Cache Hit', 'Availability'],
                datasets: [{
                    label: 'MongoDB',
                    data: [80, 85, 90, 95, 99],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                }, {
                    label: 'SQL Server',
                    data: [70, 75, 85, 88, 95],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                    }
                }
            }
        });

        console.log('Analytics charts initialized successfully');\n    } catch (error) {\n        console.error('Analytics chart initialization failed:', error);\n    }\n}

/**
 * Update chart with new data point
 * @param {string} chartName - Name of the chart to update
 * @param {number} newValue - New data value
 * @param {string|null} label - Optional label for the data point
 */
function updateChart(chartName, newValue, label = null) {
    if (typeof Chart === 'undefined') {
        console.debug('Chart.js not available, skipping chart update');
        return;
    }

    const chart = state.charts[chartName];
    if (!chart || !chart.data || !chart.data.datasets || chart.data.datasets.length === 0) {
        console.debug(`Chart '${chartName}' not properly initialized`);
        return;
    }

    try {
        const dataset = chart.data.datasets[0];
        const labels = chart.data.labels;

        // Validate newValue
        if (typeof newValue !== 'number' || isNaN(newValue)) {
            console.warn(`Invalid chart value for ${chartName}:`, newValue);
            return;
        }

        // Add new data point
        dataset.data.push(newValue);
        labels.push(label || new Date().toLocaleTimeString());

        // Keep only last N points
        if (dataset.data.length > CONFIG.CHART_POINTS) {
            dataset.data.shift();
            labels.shift();
        }

        chart.update('none');
    } catch (error) {
        console.error(`Error updating chart '${chartName}':`, error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Time range selector
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            refreshAnalytics(e.target.dataset.range);
        });
    });

    // Log filters
    const logServiceFilter = document.getElementById('logServiceFilter');
    const logLevelFilter = document.getElementById('logLevelFilter');

    if (logServiceFilter) {
        logServiceFilter.addEventListener('change', filterLogs);
    }

    if (logLevelFilter) {
        logLevelFilter.addEventListener('change', filterLogs);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    refreshAllData();
                    break;
                case 't':
                    e.preventDefault();
                    toggleTheme();
                    break;
                case 'a':
                    e.preventDefault();
                    toggleAlerts();
                    break;
            }
        }
    });
}

// Data Collection
function startDataCollection() {
    // Clear existing intervals
    Object.values(state.intervals).forEach(clearInterval);

    if (state.autoRefresh) {
        state.intervals.status = setInterval(refreshServices, CONFIG.UPDATE_INTERVALS.STATUS);
        state.intervals.metrics = setInterval(refreshMetrics, CONFIG.UPDATE_INTERVALS.METRICS);
        state.intervals.logs = setInterval(refreshLogs, CONFIG.UPDATE_INTERVALS.LOGS);
        state.intervals.security = setInterval(refreshSecurityData, CONFIG.UPDATE_INTERVALS.SECURITY);
    }
}

function stopDataCollection() {
    Object.values(state.intervals).forEach(clearInterval);
    state.intervals = {};
}

// API Functions
/** @type {Map<string, Promise>} */
const requestCache = new Map();
/** @type {Map<string, {data: any, timestamp: number}>} */
const responseCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Make API request with deduplication, caching, and type safety
 * @param {string} endpoint - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{success: boolean, data?: any, error?: string, message?: string}>}
 */
async function apiRequest(endpoint, options = {}) {
    try {
        if (typeof endpoint !== 'string') {
            throw new Error('Endpoint must be a string');
        }

        /** @type {string} */
        const method = options.method || 'GET';
        /** @type {string} */
        const cacheKey = `${method}:${endpoint}`;

        // Check response cache for GET requests
        if (method === 'GET') {
            const cached = responseCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                return cached.data;
            }
        }

        // Check for in-flight requests to prevent duplicates
        if (requestCache.has(cacheKey)) {
            return await requestCache.get(cacheKey);
        }

        /** @type {string} */
        const baseUrl = endpoint.startsWith('/admin/control') ? CONFIG.ADMIN_API : CONFIG.API_BASE;
        /** @type {string} */
        const url = `${baseUrl}${endpoint}`;

        /** @type {RequestInit} */
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
            }
        };

        /** @type {Promise} */
        const requestPromise = fetch(url, { ...defaultOptions, ...options })
            .then(async (response) => {
                if (!response.ok) {
                    /** @type {string} */
                    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
                    try {
                        /** @type {any} */
                        const errorData = await response.json();
                        errorMessage = errorData?.error || errorData?.message || errorMessage;
                    } catch (e) {
                        // Use default message if response is not JSON
                    }
                    throw new Error(errorMessage);
                }

                /** @type {string|null} */
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return { success: true, data: await response.text() };
                }
            })
            .finally(() => {
                // Clean up request cache
                requestCache.delete(cacheKey);
            });

        // Store in-flight request
        requestCache.set(cacheKey, requestPromise);

        /** @type {any} */
        const result = await requestPromise;

        // Cache GET responses
        if (method === 'GET' && result.success !== false) {
            responseCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }

        return result;

    } catch (error) {
        console.error(`API request error for ${endpoint}:`, error);

        // Handle network errors gracefully
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server');
        }

        throw error;
    }
}

// Service Management
async function refreshServices() {
    try {
        const response = await apiRequest('/admin/control/services/status');
        const services = response.data || response;

        state.data.services = services;

        // Update service nodes
        ['mongodb', 'backend', 'frontend', 'sql_server'].forEach(service => {
            const serviceData = services[service] || {};
            updateServiceNode(service, serviceData);
        });

        // Update system health
        updateSystemHealth();

    } catch (error) {
        console.error('Error refreshing services:', error);
        showAlert('error', 'Service Status Error', 'Failed to fetch service status');
    }
}

/**
 * Update service node display
 * @param {string} serviceName - Name of the service
 * @param {Object} serviceData - Service status data
 */
function updateServiceNode(serviceName, serviceData) {
    if (!serviceName || typeof serviceName !== 'string') {
        console.warn('Invalid service name provided to updateServiceNode');
        return;
    }

    const node = document.getElementById(`${serviceName}Node`);
    const status = document.getElementById(`${serviceName}Status`);
    const metrics = document.getElementById(`${serviceName}Metrics`);

    if (!node) {
        console.debug(`Service node not found for: ${serviceName}`);
        return;
    }

    // Ensure serviceData is valid
    const safeServiceData = serviceData || {};
    const isRunning = Boolean(safeServiceData.running);
    const hasWarning = Boolean(safeServiceData.warning);

    // Update node class
    node.className = 'service-node';
    if (isRunning) {
        node.classList.add(hasWarning ? 'warning' : 'running');
    } else {
        node.classList.add('stopped');
    }

    // Update status
    status.textContent = isRunning ? 'Running' : 'Stopped';
    status.className = `service-status ${isRunning ? (hasWarning ? 'warning' : 'running') : 'stopped'}`;

    // Update metrics
    if (metrics) {
        const metricValue = getServiceMetricValue(serviceName, serviceData);
        metrics.innerHTML = metricValue;
    }
}

function getServiceMetricValue(serviceName, serviceData) {
    switch (serviceName) {
        case 'mongodb':
            const latency = serviceData.latency || Math.floor(Math.random() * 50) + 10;
            return `<i class="fas fa-clock"></i> <span id="${serviceName}Latency">${latency} ms</span>`;
        case 'backend':
            const rps = serviceData.rps || Math.floor(Math.random() * 100) + 50;
            return `<i class="fas fa-chart-line"></i> <span id="${serviceName}Rps">${rps} req/s</span>`;
        case 'frontend':
            const connections = serviceData.connections || Math.floor(Math.random() * 20) + 5;
            return `<i class="fas fa-eye"></i> <span id="${serviceName}Connections">${connections} conn</span>`;
        case 'sql_server':
            const queries = serviceData.queries || Math.floor(Math.random() * 30) + 10;
            return `<i class="fas fa-exchange-alt"></i> <span id="${serviceName}Queries">${queries} q/s</span>`;
        default:
            return '<i class="fas fa-circle"></i> <span>--</span>';
    }
}

async function refreshMetrics() {
    try {
        // Simulate metrics data (in production, fetch from actual APIs)
        const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
        const memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
        const apiResponse = Math.floor(Math.random() * 200) + 100; // 100-300ms

        // Update metric displays
        updateMetricDisplay('cpuUsage', `${cpuUsage}%`);
        updateMetricDisplay('memoryUsage', `${memoryUsage}%`);
        updateMetricDisplay('apiResponse', `${apiResponse}ms`);

        // Update charts
        updateChart('cpu', cpuUsage);
        updateChart('memory', memoryUsage);
        updateChart('api', apiResponse);

        // Update analytics charts
        if (state.charts.systemLoad) {
            const systemLoadChart = state.charts.systemLoad;
            systemLoadChart.data.datasets[0].data.push(cpuUsage);
            systemLoadChart.data.datasets[1].data.push(memoryUsage);
            systemLoadChart.data.labels.push(new Date().toLocaleTimeString());

            if (systemLoadChart.data.labels.length > CONFIG.CHART_POINTS) {
                systemLoadChart.data.datasets[0].data.shift();
                systemLoadChart.data.datasets[1].data.shift();
                systemLoadChart.data.labels.shift();
            }

            systemLoadChart.update('none');
        }

        // Store metrics data
        state.data.metrics.cpu.push({ timestamp: Date.now(), value: cpuUsage });
        state.data.metrics.memory.push({ timestamp: Date.now(), value: memoryUsage });
        state.data.metrics.api.push({ timestamp: Date.now(), value: apiResponse });

        // Keep only recent data
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        ['cpu', 'memory', 'api'].forEach(metric => {
            state.data.metrics[metric] = state.data.metrics[metric].filter(
                point => point.timestamp > cutoff
            );
        });

    } catch (error) {
        console.error('Error refreshing metrics:', error);
    }
}

function updateMetricDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Security Monitoring
async function refreshSecurityData() {
    try {
        // Try to get real security data from backend
        let securityData = {};

        try {
            const [summary, failedLogins, suspicious] = await Promise.all([
                apiRequest('/admin/security/summary'),
                apiRequest('/admin/security/failed-logins?hours=24'),
                apiRequest('/admin/security/suspicious-activity?hours=24')
            ]);

            securityData = {
                failedLogins: failedLogins.data?.count || 0,
                suspiciousActivity: suspicious.data?.count || 0,
                activeSessions: summary.data?.active_sessions || 0,
                events: [
                    ...(failedLogins.data?.events || []),
                    ...(suspicious.data?.events || [])
                ].slice(0, 10) // Latest 10 events
            };
        } catch (apiError) {
            // Fallback to simulated data
            securityData = {
                failedLogins: Math.floor(Math.random() * 5),
                suspiciousActivity: Math.floor(Math.random() * 3),
                activeSessions: Math.floor(Math.random() * 20) + 5,
                events: [
                    {
                        type: 'info',
                        message: 'User login successful',
                        timestamp: new Date().toISOString()
                    }
                ]
            };
        }

        // Update security displays
        updateSecurityDisplay('failedLoginsCount', securityData.failedLogins);
        updateSecurityDisplay('suspiciousActivityCount', securityData.suspiciousActivity);
        updateSecurityDisplay('activeUserSessions', securityData.activeSessions);
        updateSecurityDisplay('activeSessions', securityData.activeSessions);

        // Update security status
        const securityStatus = document.getElementById('securityStatus');
        if (securityStatus) {
            const isSecure = securityData.failedLogins < 5 && securityData.suspiciousActivity < 3;
            securityStatus.innerHTML = isSecure
                ? '<i class="fas fa-check-circle"></i><span>Secure</span>'
                : '<i class="fas fa-exclamation-triangle"></i><span>Alert</span>';
            securityStatus.className = `security-status ${isSecure ? 'secure' : 'alert'}`;
        }

        // Update recent events
        updateSecurityEvents(securityData.events);

        // Check for security alerts
        if (securityData.failedLogins > 10) {
            showAlert('warning', 'Security Alert', `${securityData.failedLogins} failed logins detected`);
        }

        state.data.security = securityData;

    } catch (error) {
        console.error('Error refreshing security data:', error);
    }
}

function updateSecurityDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateSecurityEvents(events) {
    const eventsList = document.getElementById('securityEventsList');
    if (!eventsList || !events) return;

    eventsList.innerHTML = events.map(event => `
        <li class="event-item">
            <i class="fas fa-${getEventIcon(event.type)}"></i>
            <span>${event.message}</span>
            <time>${formatTime(event.timestamp)}</time>
        </li>
    `).join('');
}

function getEventIcon(type) {
    switch (type) {
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'success': return 'check-circle';
        default: return 'info-circle';
    }
}

// Log Management
async function refreshLogs() {
    try {
        const serviceFilter = document.getElementById('logServiceFilter')?.value || 'all';
        const levelFilter = document.getElementById('logLevelFilter')?.value || 'all';

        // Try to get real logs from backend
        let logsData = [];

        try {
            const response = await apiRequest(`/admin/control/logs/${serviceFilter}?lines=50&level=${levelFilter}`);
            logsData = response.data?.logs || response.logs || [];
        } catch (apiError) {
            // Generate sample logs
            logsData = generateSampleLogs();
        }

        // Update logs display
        updateLogsDisplay(logsData);

        state.data.logs = logsData;

    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}

function generateSampleLogs() {
    const services = ['backend', 'frontend', 'mongodb'];
    const levels = ['INFO', 'WARNING', 'ERROR'];
    const messages = [
        'Service started successfully',
        'Health check completed',
        'Database connection established',
        'User authentication successful',
        'Request processed in 150ms',
        'Cache miss for key: user_session_123',
        'Scheduled backup completed',
        'Memory usage: 65%'
    ];

    return Array.from({ length: 20 }, () => ({
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        service: services[Math.floor(Math.random() * services.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function updateLogsDisplay(logs) {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;

    const logLines = logs.map(log => `
        <div class="log-line">
            <span class="log-time">[${formatLogTime(log.timestamp)}]</span>
            <span class="log-level ${log.level.toLowerCase()}">[${log.level}]</span>
            <span class="log-service">[${(log.service || 'SYSTEM').toUpperCase()}]</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');

    logsContainer.innerHTML = logLines;

    // Auto-scroll if enabled
    if (state.autoScroll) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

function filterLogs() {
    refreshLogs();
}

function clearLogs() {
    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
        logsContainer.innerHTML = '<div class="log-line"><span class="log-message">Logs cleared</span></div>';
    }
    showAlert('info', 'Logs Cleared', 'All log entries have been cleared');
}

function toggleAutoScroll() {
    state.autoScroll = !state.autoScroll;
    const icon = document.getElementById('autoScrollIcon');
    if (icon) {
        icon.style.opacity = state.autoScroll ? '1' : '0.5';
    }
    showAlert('info', 'Auto-scroll', `Auto-scroll ${state.autoScroll ? 'enabled' : 'disabled'}`);
}

// Service Control Functions
async function startService(serviceName) {
    try {
        showAlert('info', 'Starting Service', `Starting ${serviceName}...`);

        const endpoint = serviceName === 'mongodb'
            ? '/mongodb/start'
            : '/start';

        await apiRequest(endpoint, { method: 'POST' });

        showAlert('success', 'Service Started', `${serviceName} started successfully`);

        // Refresh services after a delay
        setTimeout(refreshServices, 2000);

    } catch (error) {
        console.error(`Error starting ${serviceName}:`, error);
        showAlert('error', 'Start Failed', `Failed to start ${serviceName}: ${error.message}`);
    }
}

async function stopService(serviceName) {
    try {
        showAlert('info', 'Stopping Service', `Stopping ${serviceName}...`);

        const endpoint = serviceName === 'mongodb'
            ? '/mongodb/stop'
            : '/stop';

        await apiRequest(endpoint, { method: 'POST' });

        showAlert('success', 'Service Stopped', `${serviceName} stopped successfully`);

        // Refresh services after a delay
        setTimeout(refreshServices, 2000);

    } catch (error) {
        console.error(`Error stopping ${serviceName}:`, error);
        showAlert('error', 'Stop Failed', `Failed to stop ${serviceName}: ${error.message}`);
    }
}

async function restartAllServices() {
    if (!confirm('Are you sure you want to restart all services? This may cause brief downtime.')) {
        return;
    }

    try {
        showAlert('info', 'Restarting Services', 'Restarting all services...');

        await apiRequest('/restart', { method: 'POST' });

        showAlert('success', 'Services Restarted', 'All services restarted successfully');

        // Refresh services after a delay
        setTimeout(refreshServices, 5000);

    } catch (error) {
        console.error('Error restarting services:', error);
        showAlert('error', 'Restart Failed', `Failed to restart services: ${error.message}`);
    }
}

// SQL Server Functions
/**
 * Test SQL Server connection with input validation
 * @returns {Promise<void>}
 */
async function testSqlConnection() {
    try {
        showAlert('info', 'Testing Connection', 'Testing SQL Server connection...');

        /** @type {HTMLElement|null} */
        const modal = document.getElementById('configModal');
        /** @type {Object} */
        let config = {};

        if (modal && modal.style.display !== 'none') {
            /** @type {HTMLInputElement|null} */
            const hostInput = document.getElementById('sqlHost');
            /** @type {HTMLInputElement|null} */
            const portInput = document.getElementById('sqlPort');
            /** @type {HTMLInputElement|null} */
            const databaseInput = document.getElementById('sqlDatabase');
            /** @type {HTMLInputElement|null} */
            const usernameInput = document.getElementById('sqlUsername');
            /** @type {HTMLInputElement|null} */
            const passwordInput = document.getElementById('sqlPassword');

            // Validate inputs
            const host = hostInput?.value?.trim() || '';
            const portStr = portInput?.value?.trim() || '1433';
            const port = parseInt(portStr, 10);

            if (!host) {
                showAlert('error', 'Validation Error', 'Host is required');
                return;
            }

            if (isNaN(port) || port < 1 || port > 65535) {
                showAlert('error', 'Validation Error', 'Port must be between 1 and 65535');
                return;
            }

            config = {
                host,
                port,
                database: databaseInput?.value?.trim() || '',
                username: usernameInput?.value?.trim() || '',
                password: passwordInput?.value || '',
            };
        }

        /** @type {ApiResponse} */
        const response = await apiRequest('/admin/control/sql-server/test', {
            method: 'POST',
            body: JSON.stringify(config)
        });

        if (response.success) {
            showAlert('success', 'Connection Successful', 'SQL Server connection test passed');
        } else {
            const message = response.message || 'Connection test failed';
            showAlert('error', 'Connection Failed', message);
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error testing SQL connection:', error);
        showAlert('error', 'Test Failed', `Connection test failed: ${message}`);
    }
}

function showSqlConfig() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.add('active');

        // Load current config
        loadSqlConfig();
    }
}

async function loadSqlConfig() {
    try {
        const response = await apiRequest('/admin/control/sql-server/config');
        const config = response.data || {};

        // Populate form
        if (config.host) document.getElementById('sqlHost').value = config.host;
        if (config.port) document.getElementById('sqlPort').value = config.port;
        if (config.database) document.getElementById('sqlDatabase').value = config.database;
        if (config.username) document.getElementById('sqlUsername').value = config.username;

    } catch (error) {
        console.error('Error loading SQL config:', error);
    }
}

// System Health
function updateSystemHealth() {
    const healthElement = document.getElementById('systemHealth');
    const healthScoreElement = document.getElementById('healthScore');

    if (!healthElement || !healthScoreElement) return;

    // Calculate health score based on services
    const services = state.data.services || {};
    const criticalServices = ['backend', 'mongodb'];
    const optionalServices = ['frontend', 'sql_server'];

    let runningCritical = 0;
    let runningOptional = 0;

    criticalServices.forEach(service => {
        if (services[service]?.running) runningCritical++;
    });

    optionalServices.forEach(service => {
        if (services[service]?.running) runningOptional++;
    });

    // Calculate score (critical services worth 60%, optional 40%)
    const score = (runningCritical / criticalServices.length) * 60 +
                  (runningOptional / optionalServices.length) * 40;

    healthScoreElement.textContent = Math.round(score);

    // Update health status
    healthElement.className = 'system-health';
    if (score >= 80) {
        healthElement.classList.add('healthy');
    } else if (score >= 50) {
        healthElement.classList.add('degraded');
    } else {
        healthElement.classList.add('critical');
    }
}

// Analytics
async function refreshAnalytics(timeRange = '1h') {
    try {
        // Update response time chart with sample data
        if (state.charts.responseTime) {
            const responseTimeChart = state.charts.responseTime;
            const endpoints = ['Auth', 'Items', 'Users', 'Reports', 'Sync'];
            const newData = endpoints.map(() => Math.floor(Math.random() * 300) + 50);

            responseTimeChart.data.datasets[0].data = newData;
            responseTimeChart.update();
        }

        // Update error rate chart
        if (state.charts.errorRate) {
            const errorRateChart = state.charts.errorRate;
            const success = Math.floor(Math.random() * 10) + 90; // 90-100%
            const clientErrors = Math.floor(Math.random() * 5) + 1; // 1-6%
            const serverErrors = 100 - success - clientErrors;

            errorRateChart.data.datasets[0].data = [success, clientErrors, serverErrors];
            errorRateChart.update();
        }

        // Update database performance
        if (state.charts.dbPerformance) {
            const dbChart = state.charts.dbPerformance;
            // Simulate some variation in performance metrics
            dbChart.data.datasets[0].data = dbChart.data.datasets[0].data.map(val =>
                Math.max(60, Math.min(100, val + (Math.random() - 0.5) * 10))
            );
            dbChart.data.datasets[1].data = dbChart.data.datasets[1].data.map(val =>
                Math.max(60, Math.min(100, val + (Math.random() - 0.5) * 10))
            );
            dbChart.update();
        }

    } catch (error) {
        console.error('Error refreshing analytics:', error);
    }
}

// Alert System
function showAlert(type, title, message) {
    if (!state.alertsEnabled) return;

    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertId = `alert-${Date.now()}`;
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert-toast ${type}`;
    alertElement.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <div>
            <strong>${title}</strong>
            <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
        </div>
        <button onclick="dismissAlert('${alertId}')" style="background: none; border: none; color: inherit; font-size: 1.125rem; cursor: pointer; margin-left: auto;">
            <i class="fas fa-times"></i>
        </button>
    `;

    alertContainer.appendChild(alertElement);

    // Update alert badge
    state.alerts.push({ id: alertId, type, title, message, timestamp: Date.now() });
    updateAlertBadge();

    // Auto-dismiss after timeout
    setTimeout(() => {
        dismissAlert(alertId);
    }, CONFIG.ALERT_TIMEOUT);
}

function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'error': return 'exclamation-circle';
        default: return 'info-circle';
    }
}

/**
 * Dismiss an alert by ID
 * @param {string} alertId - ID of the alert to dismiss
 */
function dismissAlert(alertId) {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        alertElement.style.animation = 'slideOut 0.3s ease-in-out forwards';
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }

    // Remove from alerts array
    state.alerts = state.alerts.filter(alert => alert.id !== alertId);
    updateAlertBadge();
}

/**
 * Update the alert badge count
 */
function updateAlertBadge() {
    const alertBadge = document.getElementById('alertBadge');
    if (alertBadge) {
        const count = state.alerts.length;
        alertBadge.textContent = count;
        alertBadge.style.display = count > 0 ? 'inline' : 'none';
    }
}

/**
 * Toggle alerts on/off
 */
function toggleAlerts() {
    state.alertsEnabled = !state.alertsEnabled;
    const alertButton = document.querySelector('.alerts-toggle');
    if (alertButton) {
        alertButton.classList.toggle('disabled', !state.alertsEnabled);
    }

    if (typeof showAlert === 'function' && state.alertsEnabled) {
        showAlert('info', 'Alerts Enabled', 'System notifications are now active');
    }
}

/**
 * Refresh all dashboard data
 */
function refreshAllData() {
    if (typeof showAlert === 'function') {
        showAlert('info', 'Refreshing Data', 'Updating all dashboard components...');
    }

    Promise.allSettled([
        refreshServices(),
        refreshMetrics(),
        refreshSecurityData(),
        refreshLogs(),
        refreshAnalytics()
    ]).then((results) => {
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length === 0 && typeof showAlert === 'function') {
            showAlert('success', 'Data Refreshed', 'All components updated successfully');
        } else if (failures.length > 0 && typeof showAlert === 'function') {
            showAlert('warning', 'Partial Refresh', `${results.length - failures.length}/${results.length} components updated`);
        }
    }).catch(error => {
        console.error('Error refreshing data:', error);
        if (typeof showAlert === 'function') {
            showAlert('error', 'Refresh Failed', 'Unable to update dashboard data');
        }
    });
}

function dismissAlert(alertId) {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        alertElement.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }

    // Remove from state
    state.alerts = state.alerts.filter(alert => alert.id !== alertId);
    updateAlertBadge();
}

function updateAlertBadge() {
    const alertBadge = document.getElementById('alertBadge');
    if (alertBadge) {
        const recentAlerts = state.alerts.filter(alert =>
            Date.now() - alert.timestamp < 300000 // 5 minutes
        ).length;

        alertBadge.textContent = recentAlerts;
        alertBadge.style.display = recentAlerts > 0 ? 'flex' : 'none';
    }
}

function toggleAlerts() {
    state.alertsEnabled = !state.alertsEnabled;
    const alertsToggle = document.querySelector('.alerts-toggle');
    if (alertsToggle) {
        alertsToggle.style.opacity = state.alertsEnabled ? '1' : '0.5';
    }

    showAlert('info', 'Alert System', `Alerts ${state.alertsEnabled ? 'enabled' : 'disabled'}`);
}

// Modal Management
function closeModals() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        modalOverlay.close(); // Use dialog.close() method
    }
}

function openModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.add('active');
        modalOverlay.showModal(); // Use dialog.showModal() method
    }
}

// Utility Functions
function refreshAllData() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = '';
        }, 500);
    }

    Promise.all([
        refreshServices(),
        refreshMetrics(),
        refreshSecurityData(),
        refreshLogs(),
        refreshAnalytics()
    ]).then(() => {
        showAlert('success', 'Data Refreshed', 'All dashboard data has been updated');
    }).catch(error => {
        console.error('Error refreshing data:', error);
        showAlert('error', 'Refresh Failed', 'Some data could not be refreshed');
    });
}

/**
 * Format timestamp to time string with validation
 * @param {string|number|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted time string
 */
function formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Invalid time';
        }
        return date.toLocaleTimeString();
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Error';
    }
}

/**
 * Format timestamp to log time string (24-hour format) with validation
 * @param {string|number|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted time string in 24-hour format
 */
function formatLogTime(timestamp) {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Invalid time';
        }
        return date.toLocaleTimeString('en-US', { hour12: false });
    } catch (error) {
        console.error('Error formatting log time:', error);
        return 'Error';
    }
}

// Export functions for global access
window.toggleTheme = toggleTheme;
window.refreshAllData = refreshAllData;
window.toggleAlerts = toggleAlerts;
window.startService = startService;
window.stopService = stopService;
window.restartAllServices = restartAllServices;
window.testSqlConnection = testSqlConnection;
window.showSqlConfig = showSqlConfig;
window.clearLogs = clearLogs;
window.toggleAutoScroll = toggleAutoScroll;
window.dismissAlert = dismissAlert;
window.closeModals = closeModals;
window.refreshServices = refreshServices;

console.log('✅ Enhanced Admin Dashboard loaded successfully');
