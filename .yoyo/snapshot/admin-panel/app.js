// Admin Panel JavaScript with TypeScript-style annotations

/** @type {string} */
const API_BASE = 'http://localhost:8000/api';
/** @type {string} */
const ADMIN_API = 'http://localhost:3000/api';

/** @type {boolean} */
let autoScroll = true;
/** @type {number|null} */
let logInterval = null;
/** @type {number|null} */
let statusInterval = null;
/** @type {Array<{service: string, level: string, message: string, timestamp: string, count?: number}>} */
let errors = []; // Store errors for dashboard
/** @type {boolean} */
let sidebarVisible = true;
/** @type {{frontend: boolean, backend: boolean}} */
let liveViewState = { frontend: false, backend: false };
/** @type {{frontend: boolean, backend: boolean}} */
let terminalViewState = { frontend: true, backend: true }; // Both terminals visible by default
/** @type {{frontend: boolean, backend: boolean}} */
let terminalAutoScroll = { frontend: true, backend: true };
/** @type {{frontend: Array<string>, backend: Array<string>}} */
let terminalOutputs = { frontend: [], backend: [] };
/** @type {Array<Object>} */
let errorNotifications = [];
/** @type {{error: number, warning: number, critical: number}} */
let lastErrorCount = { error: 0, warning: 0, critical: 0 };
/** @type {Map<string, number>} */
let errorDeduplication = new Map(); // Track duplicate errors
/** @type {Map<string, Array<Object>>} */
let errorGroups = new Map(); // Group similar errors

/** @type {Array<number>} */
let activeIntervals = [];

/**
 * Clean up all intervals to prevent memory leaks
 */
function cleanupIntervals() {
    activeIntervals.forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
    });
    activeIntervals = [];
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    if (logInterval) {
        clearInterval(logInterval);
        logInterval = null;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAllServices();
    setupEventListeners();
    generateQRCode();
    refreshErrors();
    
    // Auto-refresh status every 5 seconds
    statusInterval = setInterval(checkAllServices, 5000);
    
    // Auto-refresh logs every 2 seconds
    logInterval = setInterval(() => {
        refreshLogs();
    }, 2000);
    
    // Store interval IDs to clean up later
    activeIntervals.push(
        setInterval(refreshErrors, 3000),
        setInterval(checkNewErrors, 2000),
        setInterval(() => {
            if (liveViewState.frontend) updateLiveViewStatus('frontend');
            if (liveViewState.backend) updateLiveViewStatus('backend');
        }, 3000),
        setInterval(updateTerminalViews, 2000),
        setInterval(refreshLiveActivity, 5000)
    );
    
    // Update terminal views
    updateTerminalViews();
    
    // Load live activity
    refreshLiveActivity();
    
    // Verify all button functions exist
    setTimeout(() => {
        const allFunctionsExist = verifyButtonFunctions();
        if (allFunctionsExist) {
            console.log('✅ All button functions verified');
        }
    }, 1000);
});

// Improved error handling for network issues
window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (message.includes('CORS') || message.includes('fetch')) {
        console.debug('Network error handled:', message);
        event.preventDefault();
        return false;
    }
}, true);

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    if (reason.name === 'TypeError' && reason.message && reason.message.includes('fetch')) {
        console.debug('Fetch error handled:', reason.message);
        event.preventDefault();
    }
});

// Clean up intervals on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    cleanupIntervals();
});

// Clean up on visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Reduce update frequency when tab is hidden
        cleanupIntervals();
    } else {
        // Resume normal operation when tab becomes visible
        setTimeout(() => {
            if (!statusInterval) {
                statusInterval = setInterval(checkAllServices, 5000);
            }
        }, 1000);
    }
});

function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', checkAllServices);
    document.getElementById('logServiceSelect').addEventListener('change', refreshLogs);
    document.getElementById('logLevelFilter').addEventListener('change', refreshLogs);
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebarVisible = !sidebarVisible;
    sidebar.style.display = sidebarVisible ? 'block' : 'none';
    
    const btn = document.getElementById('toggleSidebar');
    btn.innerHTML = sidebarVisible 
        ? '<i class="fas fa-qrcode"></i> QR Code'
        : '<i class="fas fa-qrcode"></i> Show QR';
}

// Check service status
/**
 * Check all service statuses with timeout protection
 * @returns {Promise<void>}
 */
async function checkAllServices() {
    /** @type {Array<Promise<any>>} */
    const checks = [];
    
    /**
     * Add timeout wrapper for promises
     * @param {Promise<any>} promise - Promise to wrap
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<any>}
     */
    const withTimeout = (promise, timeoutMs = 5000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeoutMs)
            )
        ]);
    };
    
    try {
        // Run checks with timeout protection
        checks.push(withTimeout(checkMongoDB().catch(e => console.debug('MongoDB check failed:', e))));
        checks.push(withTimeout(checkBackend().catch(e => console.debug('Backend check failed:', e))));
        checks.push(withTimeout(checkFrontend().catch(e => console.debug('Frontend check failed:', e))));
        
        await Promise.allSettled(checks);
        updateGlobalStatus();
        updateExpoStatus();
    } catch (error) {
        console.error('Error checking services:', error);
        // Still update status even if checks fail
        updateGlobalStatus();
        updateExpoStatus();
    }
}

async function checkMongoDB() {
    try {
        // Try backend API first
        try {
            const response = await fetch(`${API_BASE}/admin/control/services/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const mongodb = data.data?.mongodb || {};
                
                const status = document.getElementById('mongodbStatus');
                const pid = document.getElementById('mongodbPid');
                const connection = document.getElementById('mongodbConnection');
                
                if (mongodb.running) {
                    status.textContent = 'Running';
                    status.className = 'status-badge running';
                    pid.textContent = mongodb.pid || '-';
                    connection.textContent = mongodb.status || 'Connected';
                    // Show stop button, hide start button
                    document.getElementById('mongodbStartBtn').style.display = 'none';
                    document.getElementById('mongodbStopBtn').style.display = 'inline-block';
                } else {
                    status.textContent = 'Stopped';
                    status.className = 'status-badge stopped';
                    pid.textContent = '-';
                    connection.textContent = 'Disconnected';
                    // Show start button, hide stop button
                    document.getElementById('mongodbStartBtn').style.display = 'inline-block';
                    document.getElementById('mongodbStopBtn').style.display = 'none';
                }
                return;
            }
        } catch (e) {
            console.debug('Backend API check failed, trying admin API');
        }
        
        // Fallback to admin panel API
        const response = await fetch(`${ADMIN_API}/status`);
        const data = await response.json();
        const mongodb = data.mongodb || {};
        
        const status = document.getElementById('mongodbStatus');
        const pid = document.getElementById('mongodbPid');
        const connection = document.getElementById('mongodbConnection');
        
        if (mongodb.running) {
            status.textContent = 'Running';
            status.className = 'status-badge running';
            pid.textContent = mongodb.pid || '-';
            connection.textContent = 'Connected';
            // Show stop button, hide start button
            document.getElementById('mongodbStartBtn').style.display = 'none';
            document.getElementById('mongodbStopBtn').style.display = 'inline-block';
        } else {
            status.textContent = 'Stopped';
            status.className = 'status-badge stopped';
            pid.textContent = '-';
            connection.textContent = 'Disconnected';
            // Show start button, hide stop button
            document.getElementById('mongodbStartBtn').style.display = 'inline-block';
            document.getElementById('mongodbStopBtn').style.display = 'none';
        }
    } catch (error) {
        updateServiceStatus('mongodb', 'Stopped', 'stopped');
    }
}

async function checkBackend() {
    try {
        // Try backend API first
        try {
            const response = await fetch(`${API_BASE}/admin/control/services/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const backend = data.data?.backend || {};
                
                const status = document.getElementById('backendStatus');
                const pid = document.getElementById('backendPid');
                const port = document.getElementById('backendPort');
                
                if (backend.running) {
                    status.textContent = 'Running';
                    status.className = 'status-badge running';
                    pid.textContent = backend.pid || '-';
                    port.textContent = backend.port || '8000';
                    // Show stop button, hide start button
                    document.getElementById('backendStartBtn').style.display = 'none';
                    document.getElementById('backendStopBtn').style.display = 'inline-block';
                } else {
                    status.textContent = 'Stopped';
                    status.className = 'status-badge stopped';
                    pid.textContent = '-';
                    // Show start button, hide stop button
                    document.getElementById('backendStartBtn').style.display = 'inline-block';
                    document.getElementById('backendStopBtn').style.display = 'none';
                }
                return;
            }
        } catch (e) {
            console.debug('Backend API check failed, trying admin API');
        }
        
        // Fallback to admin panel API
        const response = await fetch(`${ADMIN_API}/status`);
        const data = await response.json();
        const backend = data.backend || {};
        
        const status = document.getElementById('backendStatus');
        const pid = document.getElementById('backendPid');
        const port = document.getElementById('backendPort');
        
        if (backend.running) {
            status.textContent = 'Running';
            status.className = 'status-badge running';
            pid.textContent = backend.pid || '-';
            port.textContent = backend.port || '8000';
            // Show stop button, hide start button
            document.getElementById('backendStartBtn').style.display = 'none';
            document.getElementById('backendStopBtn').style.display = 'inline-block';
        } else {
            status.textContent = 'Stopped';
            status.className = 'status-badge stopped';
            pid.textContent = '-';
            // Show start button, hide stop button
            document.getElementById('backendStartBtn').style.display = 'inline-block';
            document.getElementById('backendStopBtn').style.display = 'none';
        }
    } catch (error) {
        updateServiceStatus('backend', 'Stopped', 'stopped');
    }
}

async function checkFrontend() {
    try {
        let frontend;
        try {
            const response = await fetch(`${ADMIN_API}/status`);
            const data = await response.json();
            frontend = data.frontend || {};
        } catch {
            try {
                const response = await fetch(`${API_BASE}/admin/control`);
                const data = await response.json();
                frontend = data.services?.frontend || {};
            } catch {
                frontend = await checkPortOpen(8081);
            }
        }
        
        const status = document.getElementById('frontendStatus');
        const pid = document.getElementById('frontendPid');
        const port = document.getElementById('frontendPort');
        
        if (frontend.running || frontend.status === 'running' || frontend.is_running || frontend.portOpen) {
            status.textContent = 'Running';
            status.className = 'status-badge running';
            pid.textContent = frontend.pid || 'Check terminal';
            port.textContent = frontend.port || '8081';
            // Show stop button, hide start button
            const startBtn = document.getElementById('frontendStartBtn');
            const stopBtn = document.getElementById('frontendStopBtn');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else {
            status.textContent = 'Stopped';
            status.className = 'status-badge stopped';
            pid.textContent = '-';
            // Show start button, hide stop button
            const startBtn = document.getElementById('frontendStartBtn');
            const stopBtn = document.getElementById('frontendStopBtn');
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    } catch (error) {
        console.debug('Frontend check failed:', error.message);
    }
}

async function checkPortOpen(port) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ portOpen: true, port });
        img.onerror = () => resolve({ portOpen: false, port });
        img.src = `http://localhost:${port}/favicon.ico?t=${Date.now()}`;
        setTimeout(() => resolve({ portOpen: false, port }), 1000);
    });
}

function updateServiceStatus(service, text, className) {
    const statusEl = document.getElementById(`${service}Status`);
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = `status-badge ${className}`;
    }
}

function updateGlobalStatus() {
    const mongodb = document.getElementById('mongodbStatus').textContent;
    const backend = document.getElementById('backendStatus').textContent;
    const frontend = document.getElementById('frontendStatus').textContent;
    
    const indicator = document.getElementById('globalStatus');
    
    if (mongodb === 'Running' && backend === 'Running' && frontend === 'Running') {
        indicator.innerHTML = '<i class="fas fa-circle"></i> All Services Running';
        indicator.className = 'status-indicator active';
    } else {
        indicator.innerHTML = '<i class="fas fa-circle"></i> Some Services Down';
        indicator.className = 'status-indicator inactive';
    }
}

function updateExpoStatus() {
    const frontendStatus = document.getElementById('frontendStatus').textContent;
    const expoStatus = document.getElementById('expoStatus');
    if (expoStatus) {
        if (frontendStatus === 'Running') {
            expoStatus.textContent = 'Running';
            expoStatus.className = 'status-badge running';
        } else {
            expoStatus.textContent = 'Stopped';
            expoStatus.className = 'status-badge stopped';
        }
    }
}

/**
 * Start a service with type validation
 * @param {'mongodb'|'backend'|'frontend'|string} service - Service name to start
 * @returns {Promise<void>}
 */
async function startService(service) {
    if (typeof service !== 'string' || !service.trim()) {
        console.error('Invalid service name:', service);
        showNotification('Invalid service name', 'error');
        return;
    }
    
    try {
        /** @type {string} */
        let endpoint;
        if (service === 'mongodb') {
            endpoint = `${ADMIN_API}/mongodb/start`;
        } else {
            endpoint = `${API_BASE}/admin/control/services/${service}/start`;
        }
        
        /** @type {Response} */
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
            }
        });
        
        if (response.ok) {
            /** @type {any} */
            const data = await response.json();
            showNotification(data?.message || `${service} start command issued`, 'success');
            setTimeout(checkAllServices, 2000);
        } else {
            /** @type {any} */
            const error = await response.json().catch(() => ({ detail: 'Failed to start service' }));
            showNotification(error?.detail || `Failed to start ${service}`, 'error');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        showNotification(`Error: ${message}`, 'error');
    }
}

// Stop service
async function stopService(service) {
    try {
        let endpoint;
        if (service === 'mongodb') {
            endpoint = `${ADMIN_API}/mongodb/stop`;
        } else {
            endpoint = `${API_BASE}/admin/control/services/${service}/stop`;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(data.message || `${service} stopped successfully`, 'success');
            setTimeout(checkAllServices, 2000);
        } else {
            const error = await response.json().catch(() => ({ detail: 'Failed to stop service' }));
            showNotification(error.detail || `Failed to stop ${service}`, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Toggle service (for backward compatibility)
async function toggleService(service) {
    // Check current status and toggle
    try {
        const response = await fetch(`${API_BASE}/admin/control/services/status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            const serviceData = data.data?.[service] || {};
            if (serviceData.running) {
                await stopService(service);
            } else {
                await startService(service);
            }
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// View logs
function viewLogs(service) {
    document.getElementById('logServiceSelect').value = service;
    refreshLogs();
    // Scroll to logs section
    document.querySelector('.section:has(#logsContent)').scrollIntoView({ behavior: 'smooth' });
}

async function refreshLogs() {
    const service = document.getElementById('logServiceSelect').value;
    const levelFilter = document.getElementById('logLevelFilter').value;
    const logsContent = document.getElementById('logsContent');
    
    try {
        let logs = [];
        try {
            const response = await fetch(`${ADMIN_API}/logs?service=${service}`);
            if (response.ok) {
                const data = await response.json();
                logs = data.logs || [];
            }
        } catch {
            try {
                const response = await fetch(`${API_BASE}/admin/control/logs?service=${service}`);
                if (response.ok) {
                    const data = await response.json();
                    logs = data.logs || [];
                }
            } catch {
                logs = [`[${new Date().toLocaleTimeString()}] Logs not available for ${service}`];
            }
        }
        
        // Filter by level
        if (levelFilter !== 'all') {
            logs = logs.filter(log => {
                const level = detectLogLevel(log);
                return level === levelFilter;
            });
        }
        
        if (logs.length === 0) {
            logs = [`[${new Date().toLocaleTimeString()}] No logs available for ${service}`];
        }
        
        displayLogs(logs);
        
        // Extract errors from logs
        extractErrorsFromLogs(logs, service);
    } catch (error) {
        displayLogs([`[${new Date().toLocaleTimeString()}] Error fetching logs: ${error.message}`]);
    }
}

/**
 * Display logs with performance optimization for large datasets
 * @param {Array<string>} logs - Array of log entries
 */
function displayLogs(logs) {
    const logsContent = getCachedElement('logsContent');
    
    if (!logsContent) {
        console.error('Log content element not found');
        return;
    }
    
    if (!Array.isArray(logs) || logs.length === 0) {
        logsContent.innerHTML = '<p class="empty-state">No logs available</p>';
        return;
    }
    
    try {
        // Limit logs to prevent performance issues
        const maxLogs = 500;
        const displayLogs = logs.length > maxLogs ? logs.slice(-maxLogs) : logs;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        displayLogs.forEach(log => {
            if (typeof log !== 'string') return;
            
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${detectLogLevel(log)}`;
            logEntry.textContent = log; // Use textContent for safety
            fragment.appendChild(logEntry);
        });
        
        // Clear and append new content efficiently
        logsContent.innerHTML = '';
        logsContent.appendChild(fragment);
        
        // Auto-scroll to bottom if enabled
        if (autoScroll) {
            requestAnimationFrame(() => {
                logsContent.scrollTop = logsContent.scrollHeight;
            });
        }
    } catch (error) {
        console.error('Error displaying logs:', error);
        logsContent.innerHTML = '<p class="error-state">Error displaying logs</p>';
    }
}

function detectLogLevel(log) {
    const logStr = log.toLowerCase();
    if (logStr.includes('critical') || logStr.includes('fatal')) return 'critical';
    if (logStr.includes('error') || logStr.includes('exception')) return 'error';
    if (logStr.includes('warning') || logStr.includes('warn')) return 'warning';
    if (logStr.includes('success') || logStr.includes('completed')) return 'success';
    return 'info';
}

function extractErrorsFromLogs(logs, service) {
    logs.forEach(log => {
        const level = detectLogLevel(log);
        if (level === 'error' || level === 'critical' || level === 'warning') {
            // Normalize error message for deduplication
            const normalizedMessage = normalizeErrorMessage(log);
            const errorKey = `${service}:${level}:${normalizedMessage}`;
            
            // Check if this is a duplicate error
            const existingError = errorDeduplication.get(errorKey);
            const now = Date.now();
            
            if (existingError) {
                // Update count and last occurrence
                existingError.count = (existingError.count || 1) + 1;
                existingError.lastOccurrence = now;
                existingError.timestamp = new Date().toISOString();
                
                // Update the error in the errors array
                const errorIndex = errors.findIndex(e => e.id === existingError.id);
                if (errorIndex !== -1) {
                    errors[errorIndex] = existingError;
                }
            } else {
                // New error
                const error = {
                    id: Date.now() + Math.random(),
                    service: service,
                    level: level,
                    message: log,
                    normalizedMessage: normalizedMessage,
                    timestamp: new Date().toISOString(),
                    count: 1,
                    firstOccurrence: now,
                    lastOccurrence: now
                };
                
                errors.push(error);
                errorDeduplication.set(errorKey, error);
                
                // Keep only last 200 errors
                if (errors.length > 200) {
                    const removed = errors.shift();
                    errorDeduplication.delete(`${removed.service}:${removed.level}:${removed.normalizedMessage}`);
                }
            }
        }
    });
    
    updateErrorDashboard();
}

/**
 * Normalize error message by removing timestamps and variable parts
 * @param {string|undefined} message - Raw error message
 * @returns {string} - Normalized error message
 */
function normalizeErrorMessage(message) {
    if (typeof message !== 'string' || !message) {
        return 'Unknown error';
    }
    
    // Remove timestamps, IDs, and other variable parts
    /** @type {string} */
    let normalized = message
        .replace(/\[\d{4}-\d{2}-\d{2}T[\d:.]+\w+\]/g, '') // Remove timestamps
        .replace(/\[backend\]|\[frontend\]|\[mongodb\]/gi, '') // Remove service tags
        .replace(/ERROR:|WARNING:|CRITICAL:/gi, '') // Remove level tags
        .replace(/\(\d+\)/g, '') // Remove error codes like (0)
        .replace(/0x[\da-f]+/gi, '') // Remove hex addresses
        .trim();
    
    // Extract key error message (first 150 chars of meaningful content)
    /** @type {string} */
    const keyParts = normalized.split(':').slice(-2).join(':').trim();
    return keyParts.substring(0, 150);
}

// Error Dashboard
function refreshErrors() {
    // Errors are extracted from logs, so this just updates the display
    updateErrorDashboard();
}

function updateErrorDashboard() {
    const errorCount = errors.filter(e => e.level === 'error').length;
    const warningCount = errors.filter(e => e.level === 'warning').length;
    const criticalCount = errors.filter(e => e.level === 'critical').length;
    
    document.getElementById('errorCount').textContent = errorCount;
    document.getElementById('warningCount').textContent = warningCount;
    document.getElementById('criticalCount').textContent = criticalCount;
    
    // Animate stat cards if count changed
    if (errorCount > 0) {
        document.getElementById('errorCount').parentElement.parentElement.style.animation = 'pulse 0.5s';
    }
    if (warningCount > 0) {
        document.getElementById('warningCount').parentElement.parentElement.style.animation = 'pulse 0.5s';
    }
    if (criticalCount > 0) {
        document.getElementById('criticalCount').parentElement.parentElement.style.animation = 'pulse 0.5s';
    }
    
    filterErrors();
}

function filterErrors() {
    const serviceFilter = document.getElementById('errorServiceFilter').value;
    const levelFilter = document.getElementById('errorLevelFilter').value;
    
    let filtered = errors;
    
    if (serviceFilter !== 'all') {
        filtered = filtered.filter(e => e.service === serviceFilter);
    }
    
    if (levelFilter !== 'all') {
        filtered = filtered.filter(e => e.level === levelFilter);
    }
    
    displayErrors(filtered);
}

/**
 * Display errors with comprehensive type checking
 * @param {Array<{service: string, level: string, message: string, timestamp: string, count?: number}>} errorList - Array of error objects
 */
function displayErrors(errorList) {
    /** @type {HTMLElement|null} */
    const errorListEl = document.getElementById('errorList');
    
    if (!errorListEl) {
        console.error('Error list element not found');
        return;
    }
    
    if (!Array.isArray(errorList) || errorList.length === 0) {
        errorListEl.innerHTML = '<p class="empty-state">No errors detected</p>';
        return;
    }
    
    // Validate error objects
    /** @type {Array<{service: string, level: string, message: string, timestamp: string, count?: number}>} */
    const validErrors = errorList.filter(error => {
        if (typeof error !== 'object' || error === null) {
            console.warn('Invalid error object:', error);
            return false;
        }
        if (typeof error.service !== 'string' || typeof error.level !== 'string' || 
            typeof error.message !== 'string' || typeof error.timestamp !== 'string') {
            console.warn('Error object missing required string properties:', error);
            return false;
        }
        return true;
    });
    
    // Sort by count (most frequent first) or timestamp (newest first)
    errorList.sort((a, b) => {
        if (a.count && b.count && a.count !== b.count) {
            return b.count - a.count; // Most frequent first
        }
        return new Date(b.timestamp) - new Date(a.timestamp); // Newest first
    });
    
    errorListEl.innerHTML = errorList.slice(0, 30).map((error, index) => {
        const time = new Date(error.timestamp).toLocaleTimeString();
        const count = error.count || 1;
        const countBadge = count > 1 ? `<span class="error-count-badge">${count}x</span>` : '';
        const shortMessage = error.normalizedMessage || error.message;
        const fullMessage = error.message || shortMessage;
        
        return `
            <div class="error-item ${error.level}" data-error-id="${error.id}">
                <div class="error-item-header">
                    <div class="error-header-left">
                        <span class="error-service">${error.service}</span>
                        ${countBadge}
                    </div>
                    <div class="error-header-right">
                        <button class="btn btn-icon btn-copy-error" onclick="copyError(${index})" title="Copy error">
                            <i class="fas fa-copy"></i>
                        </button>
                        <span class="error-time">${time}</span>
                    </div>
                </div>
                <div class="error-message">${escapeHtml(shortMessage.substring(0, 200))}</div>
                ${count > 1 ? `<div class="error-count-info">This error occurred ${count} times</div>` : ''}
                <textarea class="error-full-message" style="display: none;">${escapeHtml(fullMessage)}</textarea>
            </div>
        `;
    }).join('');
    
    // Store error list for copy functions
    window.currentErrorList = errorList;
}

function viewErrors(service) {
    document.getElementById('errorServiceFilter').value = service;
    document.getElementById('errorLevelFilter').value = 'all';
    filterErrors();
    // Scroll to error dashboard
    document.querySelector('.error-dashboard').scrollIntoView({ behavior: 'smooth' });
}

function clearErrors() {
    errors = [];
    updateErrorDashboard();
    showNotification('Errors cleared', 'success');
}

// QR Code
async function generateQRCode() {
    const container = document.getElementById('qrCodeContainer');
    
    try {
        const expoUrl = await getExpoURL();
        document.getElementById('expoUrl').textContent = expoUrl;
        
        // Clear container
        container.innerHTML = '';
        
        // Generate QR code using QRCode.js
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(container, expoUrl, {
                width: 250,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, (error) => {
                if (error) {
                    container.innerHTML = `
                        <div class="qr-loading">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Error generating QR code</p>
                        </div>
                    `;
                }
            });
        } else {
            // Fallback to API
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(expoUrl)}`;
            container.innerHTML = `<img src="${qrUrl}" alt="Expo QR Code" style="max-width: 100%;" />`;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="qr-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

async function refreshQRCode() {
    generateQRCode();
    showNotification('QR code refreshed', 'success');
}

async function getExpoURL() {
    try {
        const response = await fetch(`${ADMIN_API}/status`);
        const data = await response.json();
        const frontend = data.frontend || {};
        
        if (frontend.running && frontend.port) {
            // Try to get local IP
            try {
                const ipResponse = await fetch(`${ADMIN_API}/network-info`);
                const ipData = await ipResponse.json();
                const localIP = ipData.local_ip || 'localhost';
                return `exp://${localIP}:${frontend.port}`;
            } catch {
                return `exp://localhost:${frontend.port}`;
            }
        }
    } catch {
        // Fallback
    }
    return 'exp://localhost:8081';
}

function copyExpoUrl() {
    const url = document.getElementById('expoUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('URL copied to clipboard', 'success');
    });
}

// Quick Actions
async function startAllServices() {
    showNotification('Starting all services...', 'info');
    try {
        await Promise.all([
            fetch(`${API_BASE}/admin/control/backend/start`, { method: 'POST' }),
            fetch(`${API_BASE}/admin/control/frontend/start`, { method: 'POST' })
        ]);
        showNotification('All services started', 'success');
        setTimeout(checkAllServices, 2000);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

async function stopAllServices() {
    showNotification('Stopping all services...', 'info');
    try {
        await Promise.all([
            fetch(`${API_BASE}/admin/control/backend/stop`, { method: 'POST' }),
            fetch(`${API_BASE}/admin/control/frontend/stop`, { method: 'POST' })
        ]);
        showNotification('All services stopped', 'success');
        setTimeout(checkAllServices, 2000);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

async function restartAllServices() {
    showNotification('Restarting all services...', 'info');
    await stopAllServices();
    setTimeout(async () => {
        await startAllServices();
    }, 2000);
}

function openFrontend() {
    window.open('http://localhost:8081', '_blank');
}

function openBackendDocs() {
    window.open('http://localhost:8000/docs', '_blank');
}

function clearLogs() {
    document.getElementById('logsContent').innerHTML = '<p class="empty-state">Logs cleared</p>';
    showNotification('Logs cleared', 'success');
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.getElementById('autoScrollBtn');
    btn.classList.toggle('active', autoScroll);
    showNotification(autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled', 'info');
}

function exportLogs() {
    const service = document.getElementById('logServiceSelect').value;
    const logs = document.getElementById('logsContent').textContent;
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${service}-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Logs exported', 'success');
}

function exportAllLogs() {
    const allLogs = errors.map(e => `[${e.timestamp}] [${e.service}] [${e.level}] ${e.message}`).join('\n');
    const blob = new Blob([allLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('All logs exported', 'success');
}

// Utility functions
/**
 * Escape HTML characters to prevent XSS attacks
 * @param {string|undefined|null} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    if (typeof text !== 'string') {
        text = String(text);
    }
    /** @type {HTMLDivElement} */
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** @type {Map<string, number>} */
const notificationThrottle = new Map();
const NOTIFICATION_THROTTLE_TIME = 1000; // 1 second

/**
 * Show notification toast with throttling and type safety
 * @param {string} message - Message to display
 * @param {'info'|'success'|'warning'|'error'} type - Notification type
 */
function showNotification(message, type = 'info') {
    if (typeof message !== 'string') {
        console.error('Notification message must be a string:', message);
        return;
    }
    
    // Throttle identical notifications
    const notificationKey = `${type}:${message}`;
    const lastShown = notificationThrottle.get(notificationKey);
    if (lastShown && (Date.now() - lastShown) < NOTIFICATION_THROTTLE_TIME) {
        return; // Skip duplicate notification
    }
    notificationThrottle.set(notificationKey, Date.now());
    
    // Clean up old throttle entries
    const cutoff = Date.now() - NOTIFICATION_THROTTLE_TIME * 2;
    for (const [key, timestamp] of notificationThrottle.entries()) {
        if (timestamp < cutoff) {
            notificationThrottle.delete(key);
        }
    }
    
    /** @type {string[]} */
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(type)) {
        console.warn('Invalid notification type:', type);
        type = 'info';
    }
    
    const toast = getCachedElement('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Live View Functions
function toggleLiveView(view) {
    if (view === 'all') {
        liveViewState.frontend = true;
        liveViewState.backend = true;
    } else if (view === 'frontend') {
        liveViewState.frontend = !liveViewState.frontend;
    } else if (view === 'backend') {
        liveViewState.backend = !liveViewState.backend;
    }
    
    updateLiveViewPanels();
}

function updateLiveViewPanels() {
    const frontendPanel = document.getElementById('frontendViewPanel');
    const backendPanel = document.getElementById('backendViewPanel');
    
    if (liveViewState.frontend) {
        frontendPanel.classList.add('active');
        checkFrameLoad('frontend');
    } else {
        frontendPanel.classList.remove('active');
    }
    
    if (liveViewState.backend) {
        backendPanel.classList.add('active');
        checkFrameLoad('backend');
    } else {
        backendPanel.classList.remove('active');
    }
    
    // Update button states
    document.getElementById('frontendViewBtn').classList.toggle('active', liveViewState.frontend);
    document.getElementById('backendViewBtn').classList.toggle('active', liveViewState.backend);
}

function checkFrameLoad(service) {
    const frame = document.getElementById(`${service}Frame`);
    const overlay = document.getElementById(`${service}Overlay`);
    
    if (frame && overlay) {
        frame.onload = () => {
            overlay.classList.add('hidden');
            updateLiveViewStatus(service);
        };
        
        frame.onerror = () => {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load ${service}</p>
            `;
        };
        
        // Show overlay initially
        overlay.classList.remove('hidden');
    }
}

function refreshLiveView(service) {
    const frame = document.getElementById(`${service}Frame`);
    const overlay = document.getElementById(`${service}Overlay`);
    
    if (frame && overlay) {
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <p>Refreshing ${service}...</p>
        `;
        
        // Force reload
        const src = frame.src;
        frame.src = '';
        setTimeout(() => {
            frame.src = src;
        }, 100);
    }
}

function updateLiveViewStatus(service) {
    const statusEl = document.getElementById(`${service}LiveStatus`);
    if (!statusEl) return;
    
    // Check if service is running
    let isRunning = false;
    if (service === 'frontend') {
        isRunning = document.getElementById('frontendStatus').textContent === 'Running';
    } else if (service === 'backend') {
        isRunning = document.getElementById('backendStatus').textContent === 'Running';
    }
    
    if (isRunning) {
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Running';
        statusEl.className = 'live-status running';
    } else {
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Stopped';
        statusEl.className = 'live-status stopped';
    }
}

function openFullscreen(service) {
    const modal = document.getElementById('fullscreenModal');
    const frame = document.getElementById('fullscreenFrame');
    const title = document.getElementById('fullscreenTitle');
    
    let src = '';
    let serviceName = '';
    
    if (service === 'frontend') {
        src = 'http://localhost:8081';
        serviceName = 'Frontend';
    } else if (service === 'backend') {
        src = 'http://localhost:8000/docs';
        serviceName = 'Backend API Docs';
    }
    
    title.textContent = serviceName;
    frame.src = src;
    modal.classList.add('show');
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    const frame = document.getElementById('fullscreenFrame');
    modal.classList.remove('show');
    frame.src = '';
}

// Error Notification Functions
function checkNewErrors() {
    const currentErrors = errors.filter(e => e.level === 'error').length;
    const currentWarnings = errors.filter(e => e.level === 'warning').length;
    const currentCritical = errors.filter(e => e.level === 'critical').length;
    
    // Check for new errors
    if (currentErrors > lastErrorCount.error) {
        const newErrors = errors.filter(e => 
            e.level === 'error' && 
            (Date.now() - new Date(e.timestamp).getTime()) < 5000
        );
        newErrors.forEach(error => showErrorNotification(error));
    }
    
    if (currentWarnings > lastErrorCount.warning) {
        const newWarnings = errors.filter(e => 
            e.level === 'warning' && 
            (Date.now() - new Date(e.timestamp).getTime()) < 5000
        );
        newWarnings.forEach(error => showErrorNotification(error));
    }
    
    if (currentCritical > lastErrorCount.critical) {
        const newCritical = errors.filter(e => 
            e.level === 'critical' && 
            (Date.now() - new Date(e.timestamp).getTime()) < 5000
        );
        newCritical.forEach(error => showErrorNotification(error));
    }
    
    lastErrorCount = {
        error: currentErrors,
        warning: currentWarnings,
        critical: currentCritical
    };
}

function showErrorNotification(error) {
    // Don't show notifications for duplicate errors (only show once per unique error)
    const errorKey = `${error.service}:${error.level}:${error.normalizedMessage || normalizeErrorMessage(error.message)}`;
    
    // Only show notification if this is a new error or if count reached threshold
    if (error.count && error.count > 1 && error.count % 10 !== 0) {
        return; // Skip if it's a duplicate and not at threshold
    }
    
    const panel = document.getElementById('errorNotificationPanel');
    const list = document.getElementById('errorNotificationList');
    
    // Add to notification list
    const notification = document.createElement('div');
    notification.className = `error-notification-item ${error.level}`;
    const countBadge = error.count > 1 ? `<span class="error-count-badge">${error.count}x</span>` : '';
    const shortMessage = error.normalizedMessage || error.message;
    
    notification.innerHTML = `
        <div class="error-notification-item-header">
            <div class="error-header-left">
                <span class="error-notification-service">${error.service}</span>
                ${countBadge}
            </div>
            <span class="error-notification-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="error-notification-message">${escapeHtml(shortMessage.substring(0, 150))}</div>
        ${error.count > 5 ? `<div class="error-count-info">⚠️ This error has occurred ${error.count} times</div>` : ''}
    `;
    
    list.insertBefore(notification, list.firstChild);
    
    // Limit to 10 notifications
    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
    
    // Show panel
    panel.classList.add('show');
    
    // Auto-hide after 15 seconds (longer for repeated errors)
    const hideDelay = error.count > 10 ? 20000 : 15000;
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            if (list.children.length === 0) {
                panel.classList.remove('show');
            }
        }, 300);
    }, hideDelay);
    
    // Show toast notification for critical errors or high-frequency errors
    if (error.level === 'critical' || (error.count && error.count > 20)) {
        const message = error.count > 1 
            ? `Repeated ${error.level} in ${error.service} (${error.count}x): ${shortMessage.substring(0, 40)}...`
            : `${error.level} in ${error.service}: ${shortMessage.substring(0, 50)}...`;
        showNotification(message, 'error');
    }
}

function closeErrorNotifications() {
    const panel = document.getElementById('errorNotificationPanel');
    panel.classList.remove('show');
}

// Copy Error Functions
function copyError(index) {
    if (!window.currentErrorList || !window.currentErrorList[index]) {
        showNotification('Error not found', 'error');
        return;
    }
    
    const error = window.currentErrorList[index];
    const errorText = formatErrorForCopy(error);
    
    navigator.clipboard.writeText(errorText).then(() => {
        showNotification('Error copied to clipboard', 'success');
        
        // Visual feedback
        const errorItems = document.querySelectorAll('.error-item');
        if (errorItems[index]) {
            errorItems[index].classList.add('copied');
            setTimeout(() => {
                errorItems[index].classList.remove('copied');
            }, 1000);
        }
    }).catch(err => {
        showNotification('Failed to copy error', 'error');
        console.error('Copy error:', err);
    });
}

function copyAllErrors() {
    const serviceFilter = document.getElementById('errorServiceFilter').value;
    const levelFilter = document.getElementById('errorLevelFilter').value;
    
    let filtered = errors;
    
    if (serviceFilter !== 'all') {
        filtered = filtered.filter(e => e.service === serviceFilter);
    }
    
    if (levelFilter !== 'all') {
        filtered = filtered.filter(e => e.level === levelFilter);
    }
    
    if (filtered.length === 0) {
        showNotification('No errors to copy', 'warning');
        return;
    }
    
    // Sort by count (most frequent first)
    filtered.sort((a, b) => {
        if (a.count && b.count && a.count !== b.count) {
            return b.count - a.count;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    const errorText = filtered.map((error, index) => {
        return formatErrorForCopy(error, index + 1);
    }).join('\n\n' + '='.repeat(80) + '\n\n');
    
    const header = `STOCK_VERIFY Error Report\nGenerated: ${new Date().toLocaleString()}\nTotal Errors: ${filtered.length}\n${'='.repeat(80)}\n\n`;
    const fullText = header + errorText;
    
    navigator.clipboard.writeText(fullText).then(() => {
        showNotification(`Copied ${filtered.length} error(s) to clipboard`, 'success');
    }).catch(err => {
        showNotification('Failed to copy errors', 'error');
        console.error('Copy error:', err);
    });
}

function formatErrorForCopy(error, number = null) {
    const count = error.count || 1;
    const time = new Date(error.timestamp).toLocaleString();
    const fullMessage = error.message || error.normalizedMessage || '';
    
    let text = '';
    if (number) {
        text += `Error #${number}\n`;
    }
    text += `Service: ${error.service.toUpperCase()}\n`;
    text += `Level: ${error.level.toUpperCase()}\n`;
    text += `Count: ${count} occurrence(s)\n`;
    text += `Time: ${time}\n`;
    text += `Message:\n${fullMessage}`;
    
    return text;
}

function exportErrors() {
    const serviceFilter = document.getElementById('errorServiceFilter').value;
    const levelFilter = document.getElementById('errorLevelFilter').value;
    
    let filtered = errors;
    
    if (serviceFilter !== 'all') {
        filtered = filtered.filter(e => e.service === serviceFilter);
    }
    
    if (levelFilter !== 'all') {
        filtered = filtered.filter(e => e.level === levelFilter);
    }
    
    if (filtered.length === 0) {
        showNotification('No errors to export', 'warning');
        return;
    }
    
    // Sort by count (most frequent first)
    filtered.sort((a, b) => {
        if (a.count && b.count && a.count !== b.count) {
            return b.count - a.count;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    const errorText = filtered.map((error, index) => {
        return formatErrorForCopy(error, index + 1);
    }).join('\n\n' + '='.repeat(80) + '\n\n');
    
    const header = `STOCK_VERIFY Error Report\nGenerated: ${new Date().toLocaleString()}\nTotal Errors: ${filtered.length}\nFilter: Service=${serviceFilter}, Level=${levelFilter}\n${'='.repeat(80)}\n\n`;
    const fullText = header + errorText;
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`Exported ${filtered.length} error(s)`, 'success');
}

// Terminal View Functions
function toggleTerminalView(view) {
    if (view === 'both') {
        terminalViewState.frontend = true;
        terminalViewState.backend = true;
    } else if (view === 'frontend') {
        terminalViewState.frontend = !terminalViewState.frontend;
    } else if (view === 'backend') {
        terminalViewState.backend = !terminalViewState.backend;
    }
    
    updateTerminalPanels();
}

function updateTerminalPanels() {
    const frontendPanel = document.getElementById('frontendTerminalPanel');
    const backendPanel = document.getElementById('backendTerminalPanel');
    
    if (frontendPanel) {
        frontendPanel.classList.toggle('active', terminalViewState.frontend);
    }
    if (backendPanel) {
        backendPanel.classList.toggle('active', terminalViewState.backend);
    }
    
    // Update button states
    const frontendBtn = document.getElementById('frontendTerminalBtn');
    const backendBtn = document.getElementById('backendTerminalBtn');
    const bothBtn = document.getElementById('bothTerminalBtn');
    
    if (frontendBtn) frontendBtn.classList.toggle('active', terminalViewState.frontend);
    if (backendBtn) backendBtn.classList.toggle('active', terminalViewState.backend);
    if (bothBtn) bothBtn.classList.toggle('active', terminalViewState.frontend && terminalViewState.backend);
}

async function updateTerminalViews() {
    if (terminalViewState.frontend) {
        await updateTerminalOutput('frontend');
    }
    if (terminalViewState.backend) {
        await updateTerminalOutput('backend');
    }
}

async function updateTerminalOutput(service) {
    const terminalContent = document.getElementById(`${service}TerminalContent`);
    const terminalStatus = document.getElementById(`${service}TerminalStatus`);
    
    if (!terminalContent) return;
    
    try {
        let logs = [];
        try {
            const response = await fetch(`${ADMIN_API}/logs?service=${service}`);
            if (response.ok) {
                const data = await response.json();
                logs = data.logs || [];
            }
        } catch {
            try {
                const response = await fetch(`${API_BASE}/admin/control/logs?service=${service}`);
                if (response.ok) {
                    const data = await response.json();
                    logs = data.logs || [];
                }
            } catch {
                logs = [`[${new Date().toLocaleTimeString()}] Logs not available for ${service}`];
            }
        }
        
        // Update terminal output
        if (logs.length > 0) {
            const newLogs = logs.slice(terminalOutputs[service].length);
            terminalOutputs[service] = logs;
            
            // Add new lines
            newLogs.forEach(log => {
                addTerminalLine(service, log);
            });
            
            // Update status
            if (terminalStatus) {
                const isRunning = document.getElementById(`${service}Status`)?.textContent === 'Running';
                terminalStatus.innerHTML = isRunning 
                    ? '<i class="fas fa-circle"></i> Running'
                    : '<i class="fas fa-circle"></i> Stopped';
                terminalStatus.className = `terminal-status ${isRunning ? 'running' : 'stopped'}`;
            }
            
            // Auto-scroll
            if (terminalAutoScroll[service]) {
                terminalContent.scrollTop = terminalContent.scrollHeight;
            }
        }
    } catch (error) {
        console.error(`Error updating ${service} terminal:`, error);
    }
}

function addTerminalLine(service, log, levelOverride = null) {
    const terminalContent = document.getElementById(`${service}TerminalContent`);
    if (!terminalContent) return;
    
    const level = levelOverride || detectLogLevel(log);
    const prompt = service === 'frontend' ? 'frontend@expo:~$' : 'backend@fastapi:~$';
    
    // Remove timestamp and service tags for cleaner display (unless it's a command)
    let cleanLog = log;
    if (!log.startsWith('$ ')) {
        cleanLog = log
            .replace(/\[\d{4}-\d{2}-\d{2}T[\d:.]+\w+\]/g, '')
            .replace(/\[backend\]|\[frontend\]|\[mongodb\]/gi, '')
            .replace(/ERROR:|WARNING:|CRITICAL:/gi, '')
            .trim();
    }
    
    const line = document.createElement('div');
    line.className = `terminal-line ${level}`;
    
    // Color code based on level
    let textColor = '';
    if (level === 'error' || level === 'critical') {
        textColor = '#f85149';
    } else if (level === 'warning') {
        textColor = '#d29922';
    } else if (level === 'success') {
        textColor = '#3fb950';
    } else {
        textColor = '#c9d1d9';
    }
    
    line.innerHTML = `
        <span class="terminal-prompt">${prompt}</span>
        <span class="terminal-text" style="color: ${textColor}">${escapeHtml(cleanLog)}</span>
    `;
    
    terminalContent.appendChild(line);
    
    // Limit to last 500 lines
    while (terminalContent.children.length > 500) {
        terminalContent.removeChild(terminalContent.firstChild);
    }
    
    // Auto-scroll if enabled
    if (terminalAutoScroll[service]) {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }
}

function toggleTerminalAutoScroll(service) {
    terminalAutoScroll[service] = !terminalAutoScroll[service];
    const btn = document.getElementById(`${service}AutoScrollBtn`);
    if (btn) {
        btn.classList.toggle('active', terminalAutoScroll[service]);
        showNotification(`${service} auto-scroll ${terminalAutoScroll[service] ? 'enabled' : 'disabled'}`, 'info');
    }
}

function copyTerminalOutput(service) {
    const terminalContent = document.getElementById(`${service}TerminalContent`);
    if (!terminalContent) return;
    
    const lines = Array.from(terminalContent.querySelectorAll('.terminal-line'))
        .map(line => line.textContent)
        .join('\n');
    
    if (!lines.trim()) {
        showNotification('No output to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(lines).then(() => {
        showNotification(`${service} terminal output copied`, 'success');
    }).catch(err => {
        showNotification('Failed to copy output', 'error');
        console.error('Copy error:', err);
    });
}

function copyAllTerminalOutputs() {
    const frontendContent = document.getElementById('frontendTerminalContent');
    const backendContent = document.getElementById('backendTerminalContent');

    if (!frontendContent && !backendContent) {
        showNotification('No terminal output available to copy', 'warning');
        return;
    }

    const frontendOutput = frontendContent ? frontendContent.textContent.trim() : '';
    const backendOutput = backendContent ? backendContent.textContent.trim() : '';

    if (!frontendOutput && !backendOutput) {
        showNotification('No terminal output available to copy', 'warning');
        return;
    }

    const sections = [];
    if (frontendOutput) {
        sections.push(`Frontend Output:\n${frontendOutput}`);
    }
    if (backendOutput) {
        sections.push(`Backend Output:\n${backendOutput}`);
    }

    const allOutput = sections.join('\n\n' + '='.repeat(40) + '\n\n');

    navigator.clipboard.writeText(allOutput).then(() => {
        showNotification('All terminal outputs copied', 'success');
    }).catch(err => {
        showNotification('Failed to copy terminal outputs', 'error');
        console.error('Copy error:', err);
    });
}

function clearTerminals() {
    if (confirm('Clear all terminal outputs?')) {
        terminalOutputs.frontend = [];
        terminalOutputs.backend = [];
        
        const frontendContent = document.getElementById('frontendTerminalContent');
        const backendContent = document.getElementById('backendTerminalContent');
        
        if (frontendContent) {
            frontendContent.innerHTML = `
                <div class="terminal-line">
                    <span class="terminal-prompt">frontend@expo:~$</span>
                    <span class="terminal-text">Terminal cleared...</span>
                </div>
            `;
        }
        
        if (backendContent) {
            backendContent.innerHTML = `
                <div class="terminal-line">
                    <span class="terminal-prompt">backend@fastapi:~$</span>
                    <span class="terminal-text">Terminal cleared...</span>
                </div>
            `;
        }
        
        showNotification('Terminals cleared', 'success');
    }
}

// Terminal Command Execution
function handleTerminalKeyPress(event, service) {
    if (event.key === 'Enter') {
        executeTerminalCommand(service);
    }
}

async function executeTerminalCommand(service) {
    const input = document.getElementById(`${service}TerminalInput`);
    const command = input.value.trim();
    
    if (!command) {
        return;
    }
    
    // Show command in terminal
    const prompt = service === 'frontend' ? 'frontend@expo:~$' : 'backend@fastapi:~$';
    addTerminalLine(service, `$ ${command}`, 'info');
    
    // Clear input
    input.value = '';
    input.disabled = true;
    
    try {
        const response = await fetch(`${ADMIN_API}/execute-command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service: service,
                command: command
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show output
            if (data.output) {
                const lines = data.output.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        addTerminalLine(service, line, 'info');
                    }
                });
            }
            
            if (data.exit_code !== 0) {
                addTerminalLine(service, `Command exited with code ${data.exit_code}`, 'warning');
            }
        } else {
            addTerminalLine(service, `Error: ${data.error}`, 'error');
            showNotification(data.error, 'error');
        }
    } catch (error) {
        addTerminalLine(service, `Error: ${error.message}`, 'error');
        showNotification(`Failed to execute command: ${error.message}`, 'error');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// Verify all button functions exist
function verifyButtonFunctions() {
    const functions = {
        'toggleTerminalView': typeof toggleTerminalView !== 'undefined',
        'clearTerminals': typeof clearTerminals !== 'undefined',
        'toggleTerminalAutoScroll': typeof toggleTerminalAutoScroll !== 'undefined',
        'copyTerminalOutput': typeof copyTerminalOutput !== 'undefined',
        'copyAllTerminalOutputs': typeof copyAllTerminalOutputs !== 'undefined',
        'executeTerminalCommand': typeof executeTerminalCommand !== 'undefined',
        'toggleLiveView': typeof toggleLiveView !== 'undefined',
        'refreshLiveView': typeof refreshLiveView !== 'undefined',
        'openFullscreen': typeof openFullscreen !== 'undefined',
        'closeFullscreen': typeof closeFullscreen !== 'undefined',
        'toggleService': typeof toggleService !== 'undefined',
        'viewLogs': typeof viewLogs !== 'undefined',
        'viewErrors': typeof viewErrors !== 'undefined',
        'copyAllErrors': typeof copyAllErrors !== 'undefined',
        'exportErrors': typeof exportErrors !== 'undefined',
        'clearErrors': typeof clearErrors !== 'undefined',
        'clearLogs': typeof clearLogs !== 'undefined',
        'toggleAutoScroll': typeof toggleAutoScroll !== 'undefined',
        'exportLogs': typeof exportLogs !== 'undefined',
        'startAllServices': typeof startAllServices !== 'undefined',
        'stopAllServices': typeof stopAllServices !== 'undefined',
        'restartAllServices': typeof restartAllServices !== 'undefined',
        'openFrontend': typeof openFrontend !== 'undefined',
        'openBackendDocs': typeof openBackendDocs !== 'undefined',
        'exportAllLogs': typeof exportAllLogs !== 'undefined',
        'toggleSidebar': typeof toggleSidebar !== 'undefined',
        'refreshQRCode': typeof refreshQRCode !== 'undefined',
        'copyExpoUrl': typeof copyExpoUrl !== 'undefined',
        'closeErrorNotifications': typeof closeErrorNotifications !== 'undefined',
        'refreshLiveActivity': typeof refreshLiveActivity !== 'undefined'
    };
    
    const missing = Object.entries(functions).filter(([name, exists]) => !exists);
    
    if (missing.length > 0) {
        console.warn('Missing functions:', missing.map(([name]) => name));
        return false;
    }
    
    return true;
}

// Refresh Live Activity (Users and Verifications)
async function refreshLiveActivity() {
    try {
        await Promise.all([
            loadLiveUsers(),
            loadLiveVerifications()
        ]);
    } catch (error) {
        console.error('Error refreshing live activity:', error);
    }
}

// Load Live Users
async function loadLiveUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`http://localhost:8000/api/v2/erp/items/live/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const usersList = document.getElementById('liveUsersList');
        const usersCount = document.getElementById('liveUsersCount');

        if (data.success && data.users) {
            usersCount.textContent = data.count || data.users.length;

            if (data.users.length === 0) {
                usersList.innerHTML = '<div class="empty-state">No active users</div>';
            } else {
                usersList.innerHTML = data.users.map(user => `
                    <div class="activity-item">
                        <div class="activity-item-header">
                            <i class="fas fa-user-circle"></i>
                            <strong>${escapeHtml(user.username)}</strong>
                        </div>
                        <div class="activity-item-details">
                            <span><i class="fas fa-check"></i> ${user.items_verified} items verified</span>
                            <span class="activity-time">${formatTimeAgo(user.last_activity)}</span>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            usersList.innerHTML = '<div class="empty-state">Failed to load users</div>';
        }
    } catch (error) {
        console.error('Error loading live users:', error);
        const usersList = document.getElementById('liveUsersList');
        if (usersList) {
            usersList.innerHTML = '<div class="empty-state">Error loading users</div>';
        }
    }
}

// Load Live Verifications
async function loadLiveVerifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`http://localhost:8000/api/v2/erp/items/live/verifications?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const verificationsList = document.getElementById('liveVerificationsList');
        const verificationsCount = document.getElementById('liveVerificationsCount');

        if (data.success && data.verifications) {
            verificationsCount.textContent = data.count || data.verifications.length;

            if (data.verifications.length === 0) {
                verificationsList.innerHTML = '<div class="empty-state">No recent verifications</div>';
            } else {
                verificationsList.innerHTML = data.verifications.map(verification => {
                    const varianceBadge = verification.variance !== undefined && verification.variance !== 0
                        ? `<span class="variance-badge ${verification.variance > 0 ? 'positive' : 'negative'}">
                            ${verification.variance > 0 ? '+' : ''}${verification.variance.toFixed(2)}
                           </span>`
                        : '';
                    return `
                        <div class="activity-item">
                            <div class="activity-item-header">
                                <i class="fas fa-cube"></i>
                                <strong>${escapeHtml(verification.item_name || verification.item_code)}</strong>
                                ${varianceBadge}
                            </div>
                            <div class="activity-item-details">
                                <span><i class="fas fa-user"></i> ${escapeHtml(verification.verified_by)}</span>
                                ${verification.floor || verification.rack 
                                    ? `<span><i class="fas fa-location-arrow"></i> ${[verification.floor, verification.rack].filter(Boolean).join(' / ')}</span>`
                                    : ''}
                                <span class="activity-time">${formatTimeAgo(verification.verified_at)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            verificationsList.innerHTML = '<div class="empty-state">Failed to load verifications</div>';
        }
    } catch (error) {
        console.error('Error loading live verifications:', error);
        const verificationsList = document.getElementById('liveVerificationsList');
        if (verificationsList) {
            verificationsList.innerHTML = '<div class="empty-state">Error loading verifications</div>';
        }
    }
}

/**
 * Format timestamp to human-readable "time ago" format
 * @param {string|number|Date|undefined} timestamp - Timestamp to format
 * @returns {string} - Formatted time string
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    /** @type {Date} */
    const date = new Date(timestamp);
    /** @type {Date} */
    const now = new Date();
    
    // Validate date
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    
    /** @type {number} */
    const diffMs = now.getTime() - date.getTime();
    /** @type {number} */
    const diffMins = Math.floor(diffMs / 60000);
    /** @type {number} */
    const diffHours = Math.floor(diffMs / 3600000);
    /** @type {number} */
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleString();
}

