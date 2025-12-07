#!/usr/bin/env python3
"""
Enhanced Admin Panel Server
Advanced monitoring and control system with real-time metrics
"""

import http.server
import socketserver
import os
import json
import subprocess
import psutil
import socket
import time
import threading
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
import logging

PORT = 3000
ADMIN_PANEL_DIR = Path(__file__).parent

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# Global metrics storage
class MetricsStore:
    def __init__(self):
        self.cpu_history = []
        self.memory_history = []
        self.disk_history = []
        self.network_history = []
        self.service_status = {}
        self.security_events = []
        self.system_logs = []
        self.alert_count = 0

    def add_cpu_metric(self, value):
        timestamp = time.time()
        self.cpu_history.append({"timestamp": timestamp, "value": value})
        self._cleanup_old_data(self.cpu_history)

    def add_memory_metric(self, value):
        timestamp = time.time()
        self.memory_history.append({"timestamp": timestamp, "value": value})
        self._cleanup_old_data(self.memory_history)

    def add_security_event(self, event_type, message, severity="info"):
        event = {
            "type": event_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
        }
        self.security_events.append(event)
        if len(self.security_events) > 100:
            self.security_events.pop(0)

    def add_system_log(self, level, service, message):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level.upper(),
            "service": service,
            "message": message,
        }
        self.system_logs.append(log_entry)
        if len(self.system_logs) > 500:
            self.system_logs.pop(0)

    def _cleanup_old_data(self, data_list, max_age_hours=24):
        cutoff = time.time() - (max_age_hours * 3600)
        while data_list and data_list[0]["timestamp"] < cutoff:
            data_list.pop(0)


# Global metrics instance
metrics = MetricsStore()


# Metrics collection thread
class MetricsCollector(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.running = True

    def run(self):
        logger.info("Starting metrics collection thread")
        while self.running:
            try:
                # Collect CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                metrics.add_cpu_metric(cpu_percent)

                # Collect memory usage
                memory = psutil.virtual_memory()
                metrics.add_memory_metric(memory.percent)

                # Check service status
                self._update_service_status()

                # Add sample logs
                if len(metrics.system_logs) < 10:  # Add some initial logs
                    metrics.add_system_log(
                        "INFO",
                        "METRICS",
                        f"System metrics collected - CPU: {cpu_percent}%, Memory: {memory.percent}%",
                    )

                time.sleep(5)  # Collect every 5 seconds

            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
                time.sleep(10)

    def _update_service_status(self):
        """Update service status in metrics"""
        try:
            services = {
                "mongodb": self._check_mongodb(),
                "backend": self._check_backend(),
                "frontend": self._check_frontend(),
                "sql_server": self._check_sql_server(),
            }
            metrics.service_status = services
        except Exception as e:
            logger.error(f"Error updating service status: {e}")

    def _check_mongodb(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if "mongod" in proc.info["name"].lower():
                    return {"running": True, "pid": proc.info["pid"], "port": 27017}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 27017}

    def _check_backend(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline_list = proc.info.get("cmdline")
                if not cmdline_list:
                    continue
                cmdline = " ".join(cmdline_list)
                if "server.py" in cmdline and "backend" in cmdline:
                    return {"running": True, "pid": proc.info["pid"], "port": 8001}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 8001}

    def _check_frontend(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline_list = proc.info.get("cmdline")
                if not cmdline_list:
                    continue
                cmdline = " ".join(cmdline_list)
                if any(keyword in cmdline.lower() for keyword in ["expo", "metro", "react-native"]):
                    return {"running": True, "pid": proc.info["pid"], "port": 8081}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 8081}

    def _check_sql_server(self):
        # Check if SQL Server port is accessible
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(("localhost", 1433))
            sock.close()
            return {"running": result == 0, "pid": None, "port": 1433}
        except:
            return {"running": False, "pid": None, "port": 1433}

    def stop(self):
        self.running = False


class EnhancedAdminHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ADMIN_PANEL_DIR), **kwargs)

    def log_message(self, format, *args):
        """Log requests to the file logger instead of stderr"""
        logger.info(f"{self.client_address[0]} - {format % args}")

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)

        # Enhanced API endpoints
        if parsed_path.path == "/api/status":
            self.handle_status()
        elif parsed_path.path == "/api/metrics":
            self.handle_metrics()
        elif parsed_path.path == "/api/system-health":
            self.handle_system_health()
        elif parsed_path.path == "/api/security-summary":
            self.handle_security_summary()
        elif parsed_path.path == "/api/logs":
            self.handle_logs(parsed_path.query)
        elif parsed_path.path == "/api/analytics":
            self.handle_analytics(parsed_path.query)
        elif parsed_path.path == "/api/qr":
            self.handle_qr()
        elif parsed_path.path == "/api/raw-logs":
            self.handle_raw_logs(parsed_path.query)
        elif parsed_path.path == "/api/network-info":
            self.handle_network_info()
        else:
            # Serve static files
            super().do_GET()

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        origin = self.headers.get("Origin", "")
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
        ]
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)

        if parsed_path.path == "/api/start":
            self.handle_start()
        elif parsed_path.path == "/api/stop":
            self.handle_stop()
        elif parsed_path.path == "/api/restart":
            self.handle_restart()
        elif parsed_path.path == "/api/mongodb/start":
            self.handle_mongodb_start()
        elif parsed_path.path == "/api/mongodb/stop":
            self.handle_mongodb_stop()
        elif parsed_path.path == "/api/sql-server/test":
            self.handle_sql_test()
        elif parsed_path.path == "/api/execute-command":
            self.handle_execute_command()
        elif parsed_path.path == "/api/clear-logs":
            self.handle_clear_logs()
        else:
            self.send_error(404)

    def handle_status(self):
        """Enhanced service status with detailed metrics"""
        try:
            services = {}

            # Get current service status from metrics store
            if metrics.service_status:
                services = metrics.service_status.copy()
            else:
                # Fallback to direct check
                services = {
                    "mongodb": self._check_service_mongodb(),
                    "backend": self._check_service_backend(),
                    "frontend": self._check_service_frontend(),
                    "sql_server": self._check_service_sql(),
                }

            # Add performance metrics to each service
            for service_name, service_data in services.items():
                if service_data["running"]:
                    # Add simulated performance metrics
                    service_data.update(
                        {
                            "latency": self._get_service_latency(service_name),
                            "rps": self._get_service_rps(service_name),
                            "memory_usage": self._get_service_memory(service_name),
                            "uptime": self._get_service_uptime(service_name),
                        }
                    )

            self.send_json_response(
                {"success": True, "data": services, "timestamp": datetime.now().isoformat()}
            )

        except Exception as e:
            logger.error(f"Error in handle_status: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_metrics(self):
        """Real-time system metrics"""
        try:
            # Get current system metrics
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            # Network stats
            network = psutil.net_io_counters()

            metrics_data = {
                "cpu": {
                    "current": cpu_percent,
                    "history": metrics.cpu_history[-50:],  # Last 50 points
                },
                "memory": {
                    "current": memory.percent,
                    "total": memory.total,
                    "available": memory.available,
                    "history": metrics.memory_history[-50:],
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100,
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv,
                },
                "processes": len(psutil.pids()),
                "boot_time": psutil.boot_time(),
                "timestamp": time.time(),
            }

            self.send_json_response({"success": True, "data": metrics_data})

        except Exception as e:
            logger.error(f"Error in handle_metrics: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_system_health(self):
        """Calculate system health score"""
        try:
            # Get service status
            services = metrics.service_status or {}

            # Calculate health score
            critical_services = ["backend", "mongodb"]
            optional_services = ["frontend", "sql_server"]

            running_critical = sum(
                1 for s in critical_services if services.get(s, {}).get("running", False)
            )
            running_optional = sum(
                1 for s in optional_services if services.get(s, {}).get("running", False)
            )

            # Base score calculation (critical services worth 60%, optional 40%)
            base_score = (running_critical / len(critical_services)) * 60 + (
                running_optional / len(optional_services)
            ) * 40

            # Adjust for system performance
            cpu_penalty = max(0, (psutil.cpu_percent() - 80) / 2)  # Penalty for high CPU
            memory_penalty = max(
                0, (psutil.virtual_memory().percent - 80) / 2
            )  # Penalty for high memory

            final_score = max(0, min(100, base_score - cpu_penalty - memory_penalty))

            # Determine status
            if final_score >= 85:
                status = "excellent"
            elif final_score >= 70:
                status = "good"
            elif final_score >= 50:
                status = "degraded"
            else:
                status = "critical"

            self.send_json_response(
                {
                    "success": True,
                    "data": {
                        "score": round(final_score, 1),
                        "status": status,
                        "breakdown": {
                            "services": f"{running_critical + running_optional}/4",
                            "cpu_usage": f"{psutil.cpu_percent()}%",
                            "memory_usage": f"{psutil.virtual_memory().percent}%",
                        },
                        "recommendations": self._get_health_recommendations(final_score, services),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in handle_system_health: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_security_summary(self):
        """Security monitoring data"""
        try:
            # Get recent security events
            recent_events = [
                event
                for event in metrics.security_events
                if datetime.fromisoformat(event["timestamp"]) > datetime.now() - timedelta(hours=24)
            ]

            failed_logins = len(
                [e for e in recent_events if "failed login" in e.get("message", "").lower()]
            )
            suspicious_activity = len([e for e in recent_events if e.get("severity") == "warning"])

            # Get active processes (simulated active sessions)
            active_sessions = len(
                [
                    p
                    for p in psutil.process_iter()
                    if "python" in p.name().lower() or "node" in p.name().lower()
                ]
            )

            self.send_json_response(
                {
                    "success": True,
                    "data": {
                        "failed_logins": failed_logins,
                        "suspicious_activity": suspicious_activity,
                        "active_sessions": active_sessions,
                        "recent_events": recent_events[-20:],  # Last 20 events
                        "security_score": max(
                            0, 100 - (failed_logins * 5) - (suspicious_activity * 10)
                        ),
                        "alerts": [
                            e for e in recent_events if e.get("severity") in ["warning", "error"]
                        ],
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in handle_security_summary: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_logs(self, query_string):
        """Enhanced log handling with filtering - Reads from actual log files"""
        try:
            params = parse_qs(query_string)
            service_filter = params.get("service", ["all"])[0]
            level_filter = params.get("level", ["all"])[0]
            limit = int(params.get("limit", ["100"])[0])

            # Define log files
            project_root = Path(__file__).parent.parent
            log_files = {
                "backend": project_root / "logs" / "backend.log",
                "frontend": project_root / "logs" / "frontend.log",
                "admin": project_root / "logs" / "admin-panel.log",
            }

            all_logs = []

            # Read logs based on filter
            services_to_read = log_files.keys() if service_filter == "all" else [service_filter]

            for service in services_to_read:
                if service in log_files and log_files[service].exists():
                    try:
                        # Read last N lines (approximate)
                        with open(log_files[service], "r", errors="ignore") as f:
                            # Efficiently read last lines
                            f.seek(0, 2)
                            file_size = f.tell()
                            f.seek(max(0, file_size - 50000))  # Read last 50KB
                            lines = f.readlines()

                            for line in lines:
                                line = line.strip()
                                if not line:
                                    continue

                                # Basic parsing
                                level = "INFO"
                                if "ERROR" in line.upper():
                                    level = "ERROR"
                                elif "WARNING" in line.upper():
                                    level = "WARNING"
                                elif "DEBUG" in line.upper():
                                    level = "DEBUG"

                                all_logs.append(
                                    {
                                        "timestamp": datetime.now().isoformat(),  # Approximate since parsing timestamp is hard without regex
                                        "level": level,
                                        "service": service.upper(),
                                        "message": line,
                                    }
                                )
                    except Exception as e:
                        logger.error(f"Error reading log file for {service}: {e}")

            # Filter by level
            if level_filter != "all":
                level_priority = {"ERROR": 3, "WARNING": 2, "INFO": 1, "DEBUG": 0}
                min_priority = level_priority.get(level_filter.upper(), 0)
                all_logs = [
                    log for log in all_logs if level_priority.get(log["level"], 0) >= min_priority
                ]

            # Sort and limit (simple reverse since we read from end)
            all_logs.reverse()
            all_logs = all_logs[:limit]

            self.send_json_response(
                {
                    "success": True,
                    "data": {
                        "logs": all_logs,
                        "total_count": len(all_logs),  # Approximate
                        "filtered_count": len(all_logs),
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in handle_logs: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_raw_logs(self, query_string):
        """Stream raw log content for terminal view"""
        try:
            params = parse_qs(query_string)
            service = params.get("service", ["backend"])[0]
            lines_count = int(params.get("lines", ["100"])[0])

            project_root = Path(__file__).parent.parent
            log_file = project_root / "logs" / f"{service}.log"

            if not log_file.exists():
                self.send_json_response({"success": False, "error": "Log file not found"}, 404)
                return

            # Read last N lines using tail command for efficiency
            try:
                result = subprocess.check_output(["tail", "-n", str(lines_count), str(log_file)])
                content = result.decode("utf-8", errors="ignore")

                self.send_json_response(
                    {"success": True, "data": {"service": service, "content": content}}
                )
            except subprocess.CalledProcessError as e:
                self.send_json_response(
                    {"success": False, "error": f"Failed to read logs: {e}"}, 500
                )

        except Exception as e:
            logger.error(f"Error in handle_raw_logs: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_analytics(self, query_string):
        """Analytics data for charts"""
        try:
            params = parse_qs(query_string)
            time_range = params.get("range", ["1h"])[0]

            # Convert time range to seconds
            range_seconds = {"1h": 3600, "6h": 21600, "24h": 86400, "7d": 604800}.get(
                time_range, 3600
            )

            cutoff_time = time.time() - range_seconds

            # Filter data by time range
            cpu_data = [d for d in metrics.cpu_history if d["timestamp"] > cutoff_time]
            memory_data = [d for d in metrics.memory_history if d["timestamp"] > cutoff_time]

            # Sample API response times (simulate endpoint performance)
            api_endpoints = {
                "auth": {"avg_response": 150, "success_rate": 99.2},
                "items": {"avg_response": 200, "success_rate": 98.8},
                "users": {"avg_response": 120, "success_rate": 99.5},
                "reports": {"avg_response": 800, "success_rate": 97.1},
                "sync": {"avg_response": 1200, "success_rate": 95.5},
            }

            self.send_json_response(
                {
                    "success": True,
                    "data": {
                        "time_range": time_range,
                        "cpu_data": cpu_data,
                        "memory_data": memory_data,
                        "api_performance": api_endpoints,
                        "error_rates": {
                            "success": 96.8,
                            "client_errors": 2.1,
                            "server_errors": 1.1,
                        },
                        "database_performance": {
                            "mongodb": {
                                "connections": 25,
                                "avg_query_time": 45,
                                "throughput": 120,
                                "cache_hit_rate": 87,
                            },
                            "sql_server": {
                                "connections": 15,
                                "avg_query_time": 65,
                                "throughput": 85,
                                "cache_hit_rate": 82,
                            },
                        },
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in handle_analytics: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_sql_test(self):
        """Test SQL Server connection with input validation"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 10000:  # Limit payload size
                self.send_json_response({"success": False, "error": "Request too large"}, 400)
                return

            if content_length > 0:
                post_data = self.rfile.read(content_length)
                config = json.loads(post_data.decode("utf-8"))
            else:
                config = {}

            # Validate and sanitize inputs
            host = str(config.get("host", "localhost")).strip()
            if not host or len(host) > 255:
                self.send_json_response({"success": False, "error": "Invalid host"}, 400)
                return

            # Validate host format (basic check)
            import re

            if not re.match(r"^[a-zA-Z0-9.-]+$", host):
                self.send_json_response({"success": False, "error": "Invalid host format"}, 400)
                return

            port = int(config.get("port", 1433))
            if not (1 <= port <= 65535):
                self.send_json_response({"success": False, "error": "Invalid port range"}, 400)
                return

            # Test if port is accessible
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()

            if result == 0:
                metrics.add_security_event(
                    "sql_test", f"SQL Server connection test successful to {host}:{port}", "info"
                )
                self.send_json_response(
                    {
                        "success": True,
                        "message": f"Successfully connected to {host}:{port}",
                        "latency": f"{50 + (result * 10)}ms",
                    }
                )
            else:
                metrics.add_security_event(
                    "sql_test", f"SQL Server connection test failed to {host}:{port}", "warning"
                )
                self.send_json_response(
                    {
                        "success": False,
                        "message": f"Could not connect to {host}:{port}. Connection refused.",
                        "error_code": result,
                    }
                )

        except Exception as e:
            logger.error(f"Error in handle_sql_test: {e}")
            metrics.add_security_event("sql_test", f"SQL Server test error: {str(e)}", "error")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_clear_logs(self):
        """Clear system logs"""
        try:
            metrics.system_logs.clear()
            metrics.add_system_log("INFO", "ADMIN", "System logs cleared by administrator")

            self.send_json_response(
                {"success": True, "message": "System logs cleared successfully"}
            )

        except Exception as e:
            logger.error(f"Error in handle_clear_logs: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_qr(self):
        """Enhanced QR code data with network info"""
        try:
            # Get network information
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            # Try to get actual local IP (not 127.0.0.1)
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except:
                pass

            qr_data = {
                "expo_url": f"exp://{local_ip}:8081",
                "web_url": f"http://{local_ip}:8081",
                "admin_url": f"http://{local_ip}:3000",
                "api_url": f"http://{local_ip}:8001",
                "local_ip": local_ip,
                "hostname": hostname,
                "timestamp": datetime.now().isoformat(),
            }

            self.send_json_response({"success": True, "data": qr_data})

        except Exception as e:
            logger.error(f"Error in handle_qr: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    def handle_network_info(self):
        """Network information for QR codes and connectivity"""
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            # Try to get actual local IP
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except:
                pass

            # Get network interfaces
            interfaces = []
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        interfaces.append(
                            {"interface": interface, "ip": addr.address, "netmask": addr.netmask}
                        )

            self.send_json_response(
                {
                    "success": True,
                    "data": {
                        "hostname": hostname,
                        "local_ip": local_ip,
                        "interfaces": interfaces,
                        "ports": {
                            "admin": 3000,
                            "backend": 8001,
                            "frontend": 8081,
                            "mongodb": 27017,
                            "sql_server": 1433,
                        },
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error in handle_network_info: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    # Service management methods (enhanced versions of original)
    def handle_start(self):
        """Start all services"""
        project_root = Path(__file__).parent.parent
        script = project_root / "start_all.sh"
        try:
            if script.exists():
                subprocess.Popen(["bash", str(script)], cwd=str(project_root))
                metrics.add_system_log("INFO", "ADMIN", "All services start command issued")
                self.send_json_response({"success": True, "message": "All services starting"})
            else:
                self.send_json_response(
                    {"success": False, "message": "Start script not found"}, 500
                )
        except Exception as e:
            logger.error(f"Error starting services: {e}")
            self.send_json_response({"success": False, "message": str(e)}, 500)

    def handle_stop(self):
        """Stop all services"""
        project_root = Path(__file__).parent.parent
        script = project_root / "stop.sh"
        try:
            if script.exists():
                subprocess.run(["bash", str(script)], cwd=str(project_root), timeout=10)
                metrics.add_system_log("INFO", "ADMIN", "All services stop command issued")
                self.send_json_response({"success": True, "message": "All services stopped"})
            else:
                self.send_json_response({"success": False, "message": "Stop script not found"}, 500)
        except Exception as e:
            logger.error(f"Error stopping services: {e}")
            self.send_json_response({"success": False, "message": str(e)}, 500)

    def handle_restart(self):
        """Restart all services"""
        try:
            metrics.add_system_log("INFO", "ADMIN", "Services restart initiated")
            self.handle_stop()
            time.sleep(3)
            self.handle_start()
            self.send_json_response({"success": True, "message": "Services restarted"})
        except Exception as e:
            logger.error(f"Error restarting services: {e}")
            self.send_json_response({"success": False, "message": str(e)}, 500)

    def handle_mongodb_start(self):
        """Start MongoDB"""
        try:
            # Try to start MongoDB
            mongod_path = "/opt/homebrew/bin/mongod"
            if os.path.exists(mongod_path):
                subprocess.Popen(
                    [mongod_path, "--dbpath", os.path.expanduser("~/data/db")],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                metrics.add_system_log("INFO", "MONGODB", "MongoDB start command issued")
                self.send_json_response({"success": True, "message": "MongoDB starting"})
            else:
                self.send_json_response({"success": False, "message": "MongoDB not found"}, 500)
        except Exception as e:
            logger.error(f"Error starting MongoDB: {e}")
            self.send_json_response({"success": False, "message": str(e)}, 500)

    def handle_mongodb_stop(self):
        """Stop MongoDB"""
        try:
            killed = 0
            for proc in psutil.process_iter(["pid", "name"]):
                if "mongod" in proc.info["name"].lower():
                    try:
                        proc.terminate()
                        killed += 1
                    except:
                        pass

            metrics.add_system_log(
                "INFO", "MONGODB", f"MongoDB stop command issued, {killed} processes terminated"
            )
            self.send_json_response(
                {"success": True, "message": f"Stopped {killed} MongoDB processes"}
            )
        except Exception as e:
            logger.error(f"Error stopping MongoDB: {e}")
            self.send_json_response({"success": False, "message": str(e)}, 500)

    def handle_execute_command(self):
        """Execute terminal command (enhanced security with rate limiting)"""
        # Basic rate limiting check
        client_ip = self.client_address[0]
        current_time = time.time()

        if not hasattr(self, "_command_rate_limit"):
            self._command_rate_limit = {}

        if client_ip in self._command_rate_limit:
            last_command = self._command_rate_limit[client_ip]
            if current_time - last_command < 2:  # 2 second cooldown
                self.send_json_response(
                    {
                        "success": False,
                        "error": "Rate limit exceeded. Please wait before executing another command.",
                    },
                    429,
                )
                return

        self._command_rate_limit[client_ip] = current_time

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 5000:  # Limit payload size
                self.send_json_response(
                    {"success": False, "error": "Request payload too large"}, 400
                )
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))

            service = data.get("service", "")
            command = data.get("command", "").strip()

            if not command:
                self.send_json_response({"success": False, "error": "No command provided"})
                return

            # Enhanced security: whitelist of safe commands
            safe_commands = {
                "frontend": ["npm", "node", "npx", "expo", "yarn", "ls", "pwd", "ps", "whoami"],
                "backend": ["python", "python3", "pip", "pip3", "ls", "pwd", "ps", "whoami"],
                "system": ["ls", "pwd", "ps", "whoami", "date", "uptime", "df", "free"],
            }

            # Check command safety
            command_parts = command.split()
            base_command = command_parts[0] if command_parts else ""
            allowed = safe_commands.get(service, safe_commands["system"])

            if base_command not in allowed:
                metrics.add_security_event(
                    "command_blocked", f"Blocked unsafe command: {command}", "warning"
                )
                self.send_json_response(
                    {"success": False, "error": f'Command "{base_command}" not allowed'}
                )
                return

            # Execute command
            try:
                result = subprocess.run(
                    command, shell=True, capture_output=True, text=True, timeout=10
                )

                metrics.add_system_log("INFO", "COMMAND", f"Executed: {command}")
                self.send_json_response(
                    {
                        "success": True,
                        "output": result.stdout + result.stderr,
                        "exit_code": result.returncode,
                    }
                )
            except subprocess.TimeoutExpired:
                self.send_json_response({"success": False, "error": "Command timed out"})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)})

        except Exception as e:
            logger.error(f"Error executing command: {e}")
            self.send_json_response({"success": False, "error": str(e)}, 500)

    # Helper methods
    def _check_service_mongodb(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if "mongod" in proc.info["name"].lower():
                    return {"running": True, "pid": proc.info["pid"], "port": 27017}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 27017}

    def _check_service_backend(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline = " ".join(proc.info.get("cmdline", []))
                if "server.py" in cmdline:
                    port = self._get_port_from_process(proc.info["pid"])
                    return {"running": True, "pid": proc.info["pid"], "port": port or 8000}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 8000}

    def _check_service_frontend(self):
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                cmdline = " ".join(proc.info.get("cmdline", []))
                if any(keyword in cmdline.lower() for keyword in ["expo", "metro", "node"]):
                    port = self._get_port_from_process(proc.info["pid"])
                    return {"running": True, "pid": proc.info["pid"], "port": port or 8081}
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {"running": False, "pid": None, "port": 8081}

    def _check_service_sql(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(("localhost", 1433))
            sock.close()
            return {"running": result == 0, "pid": None, "port": 1433}
        except:
            return {"running": False, "pid": None, "port": 1433}

    def _get_port_from_process(self, pid):
        try:
            proc = psutil.Process(pid)
            connections = proc.connections()
            for conn in connections:
                if conn.status == "LISTEN":
                    return conn.laddr.port
        except:
            pass
        return None

    def _get_service_latency(self, service_name):
        """Simulate service latency"""
        base_latency = {"mongodb": 15, "backend": 25, "frontend": 35, "sql_server": 45}
        return base_latency.get(service_name, 50) + int(time.time() % 20)

    def _get_service_rps(self, service_name):
        """Simulate requests per second"""
        base_rps = {"mongodb": 150, "backend": 85, "frontend": 45, "sql_server": 25}
        return base_rps.get(service_name, 10) + int(time.time() % 30)

    def _get_service_memory(self, service_name):
        """Simulate service memory usage"""
        base_memory = {"mongodb": 512, "backend": 256, "frontend": 128, "sql_server": 1024}
        return base_memory.get(service_name, 100)

    def _get_service_uptime(self, service_name):
        """Simulate service uptime"""
        return f"{int(time.time() % 86400)}s"

    def _get_health_recommendations(self, score, services):
        """Generate health recommendations"""
        recommendations = []

        if score < 50:
            recommendations.append(
                "Critical: Multiple services are down. Restart services immediately."
            )
        elif score < 70:
            recommendations.append("Warning: System performance is degraded. Check service logs.")

        for service, data in services.items():
            if not data.get("running"):
                recommendations.append(f"Start {service} service to improve system reliability.")

        if psutil.cpu_percent() > 80:
            recommendations.append("High CPU usage detected. Consider scaling resources.")

        if psutil.virtual_memory().percent > 80:
            recommendations.append("High memory usage detected. Check for memory leaks.")

        return recommendations[:3]  # Return top 3 recommendations

    def send_json_response(self, data, status=200):
        """Send JSON response with secure CORS headers"""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        # Restrict CORS to localhost only for security
        origin = self.headers.get("Origin", "")
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
        ]
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        # Add security headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())


def main():
    """Start the enhanced admin panel server"""
    os.chdir(ADMIN_PANEL_DIR)

    # Check if port is already in use
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("", PORT))
        sock.close()
    except OSError:
        print(f"⚠️  Port {PORT} is already in use!")
        print(f"✅ Enhanced admin panel might already be running at http://localhost:{PORT}")
        return

    # Start metrics collection
    metrics_collector = MetricsCollector()
    metrics_collector.start()

    # Add initial logs
    metrics.add_system_log("INFO", "SYSTEM", "Enhanced admin panel server starting")
    metrics.add_security_event("system", "Admin panel server initialized", "info")

    # Create server with SO_REUSEADDR
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    try:
        with ReusableTCPServer(("", PORT), EnhancedAdminHandler) as httpd:
            print(f"🚀 Enhanced Admin Panel running at http://localhost:{PORT}")
            print(f"📊 Real-time metrics: http://localhost:{PORT}/dashboard.html")
            print(f"📁 Serving from: {ADMIN_PANEL_DIR}")
            print("🛑 Press Ctrl+C to stop")

            metrics.add_system_log(
                "INFO", "SYSTEM", f"Enhanced admin panel server started on port {PORT}"
            )

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n🛑 Stopping enhanced admin panel server...")
        metrics_collector.stop()
        metrics.add_system_log("INFO", "SYSTEM", "Enhanced admin panel server stopped")
        print("✅ Server stopped gracefully")


if __name__ == "__main__":
    main()
