#!/usr/bin/env python3
"""
Simple HTTP server for Admin Panel
Serves the admin panel UI and provides API endpoints for service management
"""

import http.server
import socketserver
import os
import json
import subprocess
import psutil
import socket
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PORT = 3000
ADMIN_PANEL_DIR = Path(__file__).parent


class AdminPanelHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ADMIN_PANEL_DIR), **kwargs)

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)

        # API endpoints
        if parsed_path.path == "/api/status":
            self.handle_status()
        elif parsed_path.path == "/api/logs":
            self.handle_logs(parsed_path.query)
        elif parsed_path.path == "/api/qr":
            self.handle_qr()
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
        # Add security headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
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
        elif parsed_path.path == "/api/logs":
            self.handle_logs(parsed_path.query)
        elif parsed_path.path == "/api/network-info":
            self.handle_network_info()
        elif parsed_path.path == "/api/execute-command":
            self.handle_execute_command()
        else:
            self.send_error(404)

    def handle_status(self):
        """Get service status"""
        status = {
            "mongodb": self.check_mongodb(),
            "backend": self.check_backend(),
            "frontend": self.check_frontend(),
        }
        self.send_json_response(status)

    def check_mongodb(self):
        """Check MongoDB status"""
        try:
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                if "mongod" in proc.info["name"].lower():
                    return {"running": True, "pid": proc.info["pid"], "port": 27017}
        except:
            pass
        return {"running": False, "pid": None, "port": 27017}

    def check_backend(self):
        """Check backend status"""
        try:
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                cmdline = " ".join(proc.info.get("cmdline", []))
                if "server.py" in cmdline:
                    # Check port
                    port = self.get_port_from_process(proc.info["pid"])
                    return {
                        "running": True,
                        "pid": proc.info["pid"],
                        "port": port or 8000,
                        "url": f"http://localhost:{port or 8000}",
                    }
        except:
            pass
        return {"running": False, "pid": None, "port": 8000}

    def check_frontend(self):
        """Check frontend status"""
        try:
            for proc in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    cmdline = " ".join(proc.info.get("cmdline", []))
                    if (
                        "expo" in cmdline.lower()
                        or "metro" in cmdline.lower()
                        or "node" in cmdline.lower()
                    ):
                        port = self.get_port_from_process(proc.info["pid"])
                        # Also check common Expo ports
                        if not port:
                            for check_port in [8081, 19000, 19001, 19002]:
                                if self.is_port_in_use(check_port):
                                    port = check_port
                                    break
                        return {
                            "running": True,
                            "pid": proc.info["pid"],
                            "port": port or 8081,
                            "url": f"http://localhost:{port or 8081}",
                        }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception:
            # Fallback: check if port is in use
            if self.is_port_in_use(8081):
                return {"running": True, "pid": None, "port": 8081}
        return {"running": False, "pid": None, "port": 8081}

    def is_port_in_use(self, port):
        """Check if a port is in use"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(("localhost", port))
            sock.close()
            return result == 0
        except:
            return False

    def get_port_from_process(self, pid):
        """Get port from process"""
        try:
            proc = psutil.Process(pid)
            connections = proc.connections()
            for conn in connections:
                if conn.status == "LISTEN":
                    return conn.laddr.port
        except:
            pass
        return None

    def handle_logs(self, query_string):
        """Get service logs with input validation"""
        params = parse_qs(query_string)
        service = params.get("service", ["all"])[0]

        # Validate service parameter to prevent path traversal
        allowed_services = ["backend", "frontend", "all", "mongodb", "admin"]
        if service not in allowed_services:
            self.send_json_response(
                {
                    "success": False,
                    "error": f'Invalid service. Allowed: {", ".join(allowed_services)}',
                },
                400,
            )
            return

        logs = []
        try:
            if service == "backend":
                log_file = Path(__file__).parent.parent / "backend.log"
            elif service == "frontend":
                log_file = Path(__file__).parent.parent / "frontend.log"
            else:
                log_file = None

            if log_file and log_file.exists():
                # Validate file path to prevent directory traversal
                if log_file.resolve().parent != Path(__file__).parent.parent.resolve():
                    logs = [f"[{service}] Access denied"]
                else:
                    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                        logs = f.readlines()[-100:]  # Last 100 lines
            else:
                logs = [f"[{service}] Logs not available"]
        except Exception as e:
            logs = [f"[{service}] Error reading logs: {str(e)}"]

        self.send_json_response({"success": True, "logs": logs})

    def handle_network_info(self):
        """Get network information for QR code"""
        try:
            import socket

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

            self.send_json_response({"local_ip": local_ip, "hostname": hostname})
        except Exception as e:
            self.send_json_response(
                {"local_ip": "localhost", "hostname": "localhost", "error": str(e)}
            )

    def _check_auth(self):
        """Basic authentication check"""
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False
        # In production, validate the token properly
        return len(auth_header) > 7  # Basic check

    def handle_execute_command(self):
        """Execute terminal command safely with authentication"""
        # Check authentication for sensitive operations
        if not self._check_auth():
            self.send_json_response({"success": False, "error": "Authentication required"}, 401)
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 5000:  # Limit payload size
                self.send_json_response({"success": False, "error": "Request too large"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))

            service = data.get("service", "")
            command = data.get("command", "").strip()

            if not command:
                self.send_json_response({"success": False, "error": "No command provided"})
                return

            # Whitelist of safe commands
            safe_commands = {
                "frontend": [
                    "npm",
                    "node",
                    "npx",
                    "expo",
                    "yarn",
                    "ls",
                    "pwd",
                    "cd",
                    "cat",
                    "grep",
                    "find",
                    "ps",
                    "top",
                    "df",
                    "du",
                    "whoami",
                    "date",
                    "echo",
                    "env",
                    "which",
                    "whereis",
                ],
                "backend": [
                    "python",
                    "python3",
                    "pip",
                    "pip3",
                    "ls",
                    "pwd",
                    "cd",
                    "cat",
                    "grep",
                    "find",
                    "ps",
                    "top",
                    "df",
                    "du",
                    "whoami",
                    "date",
                    "echo",
                    "env",
                    "which",
                    "whereis",
                ],
            }

            # Check if command is safe
            command_parts = command.split()
            if not command_parts:
                self.send_json_response({"success": False, "error": "Invalid command"})
                return

            base_command = command_parts[0]
            allowed = safe_commands.get(service, [])

            # Block dangerous commands
            dangerous = [
                "rm",
                "del",
                "delete",
                "format",
                "mkfs",
                "dd",
                "sudo",
                "su",
                "shutdown",
                "reboot",
                "killall",
                "pkill",
                ">",
                ">>",
                "|",
                "&",
                "&&",
                "||",
                ";",
                "`",
                "$",
                "(",
                ")",
                "{",
                "}",
            ]

            if any(danger in command for danger in dangerous):
                self.send_json_response(
                    {
                        "success": False,
                        "error": "Command contains dangerous operations and is blocked for security",
                    }
                )
                return

            if base_command not in allowed:
                self.send_json_response(
                    {
                        "success": False,
                        "error": f'Command "{base_command}" is not allowed. Allowed commands: {", ".join(allowed[:5])}...',
                    }
                )
                return

            # Execute command
            try:
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=(
                        str(Path(__file__).parent.parent / service)
                        if service in ["frontend", "backend"]
                        else None
                    ),
                )

                output = result.stdout + result.stderr
                self.send_json_response(
                    {"success": True, "output": output, "exit_code": result.returncode}
                )
            except subprocess.TimeoutExpired:
                self.send_json_response(
                    {"success": False, "error": "Command timed out after 10 seconds"}
                )
            except Exception as e:
                self.send_json_response(
                    {"success": False, "error": f"Error executing command: {str(e)}"}
                )
        except Exception as e:
            self.send_json_response({"success": False, "error": f"Invalid request: {str(e)}"})

    def handle_qr(self):
        """Get QR code data"""
        # Try to get Expo URL from Metro bundler
        qr_data = {"url": "exp://localhost:8081", "web_url": "http://localhost:8081"}
        self.send_json_response(qr_data)

    def handle_start(self):
        """Start services"""
        project_root = Path(__file__).parent.parent
        script = project_root / "scripts" / "start_all.sh"
        try:
            subprocess.Popen(["bash", str(script)], cwd=str(project_root))
            self.send_json_response({"success": True, "message": "Services starting"})
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)}, status=500)

    def handle_stop(self):
        """Stop services"""
        project_root = Path(__file__).parent.parent
        script = project_root / "scripts" / "stop_all.sh"
        try:
            subprocess.run(["bash", str(script)], cwd=str(project_root), timeout=10)
            self.send_json_response({"success": True, "message": "Services stopped"})
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)}, status=500)

    def handle_restart(self):
        """Restart services"""
        self.handle_stop()
        import time

        time.sleep(2)
        self.handle_start()

    def handle_mongodb_start(self):
        """Start MongoDB"""
        project_root = Path(__file__).parent.parent
        script = project_root / "scripts" / "start_mongodb.sh"
        try:
            if script.exists():
                subprocess.Popen(["bash", str(script)], cwd=str(project_root))
                self.send_json_response(
                    {"success": True, "message": "MongoDB start command issued"}
                )
            else:
                # Try direct start
                import os

                mongod_path = "/opt/homebrew/bin/mongod"
                if os.path.exists(mongod_path):
                    subprocess.Popen(
                        [mongod_path, "--dbpath", os.path.expanduser("~/data/db")],
                        cwd=str(project_root),
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    self.send_json_response({"success": True, "message": "MongoDB started"})
                else:
                    self.send_json_response(
                        {"success": False, "message": "MongoDB not found. Please install MongoDB."},
                        status=500,
                    )
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)}, status=500)

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
            if killed > 0:
                self.send_json_response(
                    {"success": True, "message": f"Stopped {killed} MongoDB process(es)"}
                )
            else:
                self.send_json_response({"success": True, "message": "No MongoDB processes found"})
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)}, status=500)

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
        else:
            self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass


def main():
    """Start the admin panel server"""
    os.chdir(ADMIN_PANEL_DIR)

    # Check if port is already in use
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("", PORT))
        sock.close()
    except OSError:
        print(f"⚠️  Port {PORT} is already in use!")
        print(f"✅ Admin panel is likely already running at http://localhost:{PORT}")
        print(f"   If not, kill the process using: lsof -ti:{PORT} | xargs kill")
        return

    # Create server with SO_REUSEADDR
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with ReusableTCPServer(("", PORT), AdminPanelHandler) as httpd:
        print(f"🚀 Admin Panel running at http://localhost:{PORT}")
        print(f"📁 Serving from: {ADMIN_PANEL_DIR}")
        print("🛑 Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")


if __name__ == "__main__":
    main()
