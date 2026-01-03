"""
Port Detection Utility for Backend
Automatically detect and use available ports
"""

import json
import logging
import os
import socket
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


def save_backend_info(port: int, local_ip: str, protocol: str = "http") -> None:
    """Save backend port info to JSON files."""
    try:
        port_data = {
            "port": port,
            "ip": local_ip,
            "url": f"{protocol}://{local_ip}:{port}",
            "pid": os.getpid(),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Save to backend_port.json in project root
        # Assuming this file is in backend/utils/port_detector.py
        # root is ../../
        root_dir = Path(__file__).parent.parent.parent
        with open(root_dir / "backend_port.json", "w") as f:
            json.dump(port_data, f)

        # Save to frontend/public/backend_port.json for Expo Web
        frontend_public = root_dir / "frontend" / "public"
        if frontend_public.exists():
            with open(frontend_public / "backend_port.json", "w") as f:
                json.dump(port_data, f)
            logger.info(f"Saved backend port info to {frontend_public / 'backend_port.json'}")

        logger.info(
            f"Saved backend info (IP: {local_ip}, Port: {port}) to {root_dir / 'backend_port.json'}"
        )
    except Exception as e:
        logger.warning(f"Failed to save backend port info: {e}")


class PortDetector:
    """Detect available ports and configure services"""

    @staticmethod
    def is_port_available(port: int, host: str = "localhost") -> bool:
        """Check if a port is available"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result != 0
        except Exception:
            return False

    @staticmethod
    def find_available_port(preferred_port: int, port_range: range = None) -> int:
        """Find an available port starting from preferred"""

        # Try preferred port first
        if PortDetector.is_port_available(preferred_port):
            return preferred_port

        # Try range around preferred port
        if port_range is None:
            port_range = range(preferred_port, preferred_port + 50)

        for port in port_range:
            if PortDetector.is_port_available(port):
                logger.info(f"Found available port: {port} (preferred was {preferred_port})")
                return port

        raise Exception(f"No available ports found in range {port_range}")

    @staticmethod
    def get_backend_port() -> int:
        """Get the best available port for backend"""
        preferred = int(os.getenv("PORT", 8001))

        try:
            return PortDetector.find_available_port(preferred, range(8000, 8050))
        except Exception:
            logger.warning("Could not find port in primary range, trying alternatives")
            # Try alternative ports
            alternatives = [5000, 5001, 3000, 3001, 9000, 9001]
            for port in alternatives:
                if PortDetector.is_port_available(port):
                    logger.info(f"Using alternative port: {port}")
                    return port

            # Last resort
            raise Exception("No available ports found for backend") from None

    @staticmethod
    def is_mongo_running(port: int = 27017, host: str = "localhost") -> bool:
        """Check if MongoDB is running on a specific port"""
        # Keep this lightweight and safe during import/startup:
        # - First ensure TCP connect works
        # - Then attempt a short synchronous 'ping' via PyMongo (no event loop juggling)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                if sock.connect_ex((host, port)) != 0:
                    return False

            try:
                from pymongo import MongoClient

                client = MongoClient(
                    f"mongodb://{host}:{port}",
                    serverSelectionTimeoutMS=800,
                    connectTimeoutMS=800,
                    socketTimeoutMS=800,
                    directConnection=True,
                )
                client.admin.command("ping")
                return True
            except Exception:
                # Port is open but ping failed (could be a different service)
                return False
        except Exception:
            return False

    @staticmethod
    def find_mongo_port(start_port: int = 27017, max_attempts: int = 10) -> tuple[int, bool]:
        """Find MongoDB port and return (port, is_running)"""
        # Check default port first
        if PortDetector.is_mongo_running(start_port):
            return (start_port, True)

        # Try alternative ports
        alternatives = [27018, 27019, 27020, 27021, 27022]
        for port in alternatives[: max_attempts - 1]:
            if PortDetector.is_mongo_running(port):
                logger.info(f"MongoDB found on alternative port: {port}")
                return (port, True)

        # MongoDB not found on any port
        return (start_port, False)

    @staticmethod
    def get_mongo_url() -> str:
        """Get MongoDB URL with dynamic port detection"""
        # If explicitly provided, respect it
        explicit = os.getenv("MONGO_URL") or os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")
        if explicit:
            return explicit

        # If running inside Docker, prefer service DNS name
        if Path("/.dockerenv").exists() or os.getenv("DOCKER_CONTAINER") == "true":
            mongo_url = "mongodb://mongo:27017"
            logger.info(f"Using MongoDB URL (docker): {mongo_url}")
            return mongo_url

        # If MONGO_PORT is set, use it
        if os.getenv("MONGO_PORT"):
            mongo_url = (
                f"mongodb://localhost:{int(os.getenv('MONGO_PORT', '27017'))}?directConnection=true"
            )
            logger.info(f"Using MongoDB URL (MONGO_PORT): {mongo_url}")
            return mongo_url

        # Host dev: prefer the standard port, then the docker-compose published port.
        candidates = [27017, 27018, 27019, 27020]
        for port in candidates:
            if PortDetector.is_mongo_running(port):
                mongo_url = f"mongodb://localhost:{port}?directConnection=true"
                logger.info(f"Using MongoDB URL (detected): {mongo_url}")
                return mongo_url

        # Fallback
        mongo_url = "mongodb://localhost:27017?directConnection=true"
        logger.info(f"Using MongoDB URL (fallback): {mongo_url}")
        return mongo_url

    @staticmethod
    def get_mongo_status() -> dict:
        """Get MongoDB port and running status"""
        port, is_running = PortDetector.find_mongo_port()
        return {
            "port": port,
            "is_running": is_running,
            "url": f"mongodb://localhost:{port}",
            "status": "running" if is_running else "not_running",
        }

    @staticmethod
    def get_local_ip() -> str:
        """Get the local IP address of the machine (prioritizing LAN)"""
        try:
            # 1. Try connecting to a public DNS server (Google)
            # This usually forces the OS to pick the primary outgoing interface (LAN)
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0)
            try:
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
            except Exception:
                ip = "127.0.0.1"
            finally:
                s.close()

            # 2. Sanity check: If we got localhost or something weird, try 192.168 specifically
            if ip.startswith("127.") or ip == "0.0.0.0":  # nosec
                # Fallback: iterate interfaces (simple approach often restricted, so we rely on socket)
                # Re-try with a local router guess
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                try:
                    s.connect(("192.168.1.1", 80))
                    ip = s.getsockname()[0]
                except Exception:
                    pass
                finally:
                    s.close()

            return ip
        except Exception:
            return "127.0.0.1"

    @staticmethod
    def generate_frontend_config(backend_port: int, frontend_port: int = None) -> str:
        """Generate frontend configuration with dynamic ports"""

        # Detect LAN IP dynamically
        lan_ip = PortDetector.get_local_ip()

        # Try to detect current frontend port
        if frontend_port is None:
            frontend_port = 8081  # Default
            if not PortDetector.is_port_available(8081):
                # Frontend is running on 8081
                pass
            else:
                # Try to find alternative
                for port in range(8080, 8090):
                    if not PortDetector.is_port_available(port):
                        frontend_port = port
                        break

        return f"""# Dynamic Configuration for Frontend
EXPO_PUBLIC_BACKEND_URL=http://{lan_ip}:{backend_port}
EXPO_PUBLIC_FRONTEND_PORT={frontend_port}
EXPO_PUBLIC_API_TIMEOUT=30000
"""


if __name__ == "__main__":
    # Test port detection
    detector = PortDetector()

    print("=== PORT DETECTION TEST ===")
    print(f"Backend port: {detector.get_backend_port()}")
    print(f"MongoDB URL: {detector.get_mongo_url()}")

    backend_port = detector.get_backend_port()
    frontend_config = detector.generate_frontend_config(backend_port)
    print(f"\nFrontend config:\n{frontend_config}")
