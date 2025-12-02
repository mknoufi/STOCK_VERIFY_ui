"""
Service Manager - Ensures only one instance of backend/frontend runs
Handles port conflicts dynamically and kills existing instances
"""

import os
import socket
import subprocess
import platform
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class ServiceManager:
    """Manages service instances and port conflicts"""

    @staticmethod
    def is_port_in_use(port: int, host: str = "localhost") -> bool:
        """Check if a port is in use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result == 0
        except Exception:
            return False

    @staticmethod
    def find_available_port(start_port: int, max_attempts: int = 20) -> int:
        """Find an available port starting from start_port"""
        for port in range(start_port, start_port + max_attempts):
            if not ServiceManager.is_port_in_use(port):
                if port != start_port:
                    logger.info(f"Port {start_port} in use, using port {port} instead")
                return port
        raise RuntimeError(
            f"No available ports found in range {start_port}-{start_port + max_attempts - 1}"
        )

    @staticmethod
    def get_process_using_port(port: int) -> Optional[int]:
        """Get PID of process using a port"""
        try:
            if platform.system() == "Windows":
                # Windows: netstat -ano | findstr :PORT
                result = subprocess.run(
                    ["netstat", "-ano"], capture_output=True, text=True, timeout=5
                )
                for line in result.stdout.split("\n"):
                    if f":{port}" in line and "LISTENING" in line:
                        parts = line.split()
                        if len(parts) > 0:
                            try:
                                return int(parts[-1])
                            except (ValueError, IndexError):
                                pass
            else:
                # Unix/Mac: lsof -ti:PORT
                result = subprocess.run(
                    ["lsof", "-ti", f":{port}"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0 and result.stdout.strip():
                    return int(result.stdout.strip().split("\n")[0])
        except Exception as e:
            logger.debug(f"Could not get process for port {port}: {e}")
        return None

    @staticmethod
    def kill_process(pid: int) -> bool:
        """Kill a process by PID"""
        try:
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, timeout=5)
            else:
                subprocess.run(["kill", "-9", str(pid)], capture_output=True, timeout=5)
            return True
        except Exception as e:
            logger.warning(f"Could not kill process {pid}: {e}")
            return False

    @staticmethod
    def kill_processes_by_name(name_patterns: list) -> int:
        """Kill processes matching name patterns"""
        killed = 0
        try:
            if platform.system() == "Windows":
                for pattern in name_patterns:
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/IM", pattern],
                            capture_output=True,
                            timeout=5,
                        )
                        killed += 1
                    except:
                        pass
            else:
                for pattern in name_patterns:
                    try:
                        subprocess.run(["pkill", "-f", pattern], capture_output=True, timeout=5)
                        killed += 1
                    except:
                        pass
        except Exception as e:
            logger.warning(f"Error killing processes: {e}")
        return killed

    @staticmethod
    def ensure_single_backend(preferred_port: int = 8000) -> Tuple[int, bool]:
        """
        Ensure only one backend instance runs
        Returns: (port, was_killed)
        """
        # Check if port is in use
        if ServiceManager.is_port_in_use(preferred_port):
            pid = ServiceManager.get_process_using_port(preferred_port)
            if pid:
                # Check if it's our backend process
                try:
                    if platform.system() == "Windows":
                        result = subprocess.run(
                            ["tasklist", "/FI", f"PID eq {pid}"],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if (
                            "python" in result.stdout.lower()
                            or "server.py" in result.stdout.lower()
                        ):
                            logger.info(f"Killing existing backend process (PID: {pid})")
                            ServiceManager.kill_process(pid)
                            # Wait a moment for port to be released
                            import time

                            time.sleep(2)
                    else:
                        result = subprocess.run(
                            ["ps", "-p", str(pid), "-o", "command="],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if "server.py" in result.stdout or "python" in result.stdout:
                            logger.info(f"Killing existing backend process (PID: {pid})")
                            ServiceManager.kill_process(pid)
                            import time

                            time.sleep(2)
                except Exception as e:
                    logger.warning(f"Could not verify process: {e}")

            # If port still in use, find alternative
            if ServiceManager.is_port_in_use(preferred_port):
                port = ServiceManager.find_available_port(preferred_port)
                return (port, True)

        return (preferred_port, False)

    @staticmethod
    def ensure_single_frontend(preferred_port: int = 8081) -> Tuple[int, bool]:
        """
        Ensure only one frontend instance runs
        Returns: (port, was_killed)
        """
        # Kill any existing Expo/Metro processes
        patterns = ["expo", "metro", "node.*expo"]
        killed = ServiceManager.kill_processes_by_name(patterns)
        if killed > 0:
            logger.info(f"Killed {killed} existing frontend process(es)")
            import time

            time.sleep(2)

        # Check if port is in use
        if ServiceManager.is_port_in_use(preferred_port):
            pid = ServiceManager.get_process_using_port(preferred_port)
            if pid:
                logger.info(f"Killing process using port {preferred_port} (PID: {pid})")
                ServiceManager.kill_process(pid)
                import time

                time.sleep(2)

            # If port still in use, find alternative
            if ServiceManager.is_port_in_use(preferred_port):
                port = ServiceManager.find_available_port(preferred_port, max_attempts=10)
                return (port, True)

        return (preferred_port, False)

    @staticmethod
    def save_port_info(service: str, port: int, pid: Optional[int] = None):
        """Save port information to file"""
        try:
            port_file = Path(__file__).parent.parent.parent / f"{service}_port.json"
            import json
            from datetime import datetime

            port_info = {
                "service": service,
                "port": port,
                "pid": pid or os.getpid(),
                "started_at": datetime.now().isoformat(),
                "url": f"http://localhost:{port}",
            }

            with open(port_file, "w") as f:
                json.dump(port_info, f, indent=2)

            logger.info(f"Saved {service} port info: {port}")
        except Exception as e:
            logger.warning(f"Could not save port info: {e}")
