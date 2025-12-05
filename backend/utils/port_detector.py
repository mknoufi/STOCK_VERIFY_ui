"""
Port Detection Utility for Backend
Automatically detect and use available ports
"""

import logging
import os
import socket
from typing import Optional

logger = logging.getLogger(__name__)


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
    def find_available_port(preferred_port: int, port_range: Optional[range] = None) -> int:
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
            raise Exception("No available ports found for backend")

    @staticmethod
    def is_mongo_running(port: int = 27017, host: str = "localhost") -> bool:
        """Check if MongoDB is running on a specific port"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                if result == 0:
                    # Port is open, verify it's MongoDB by trying a simple connection
                    try:
                        import asyncio

                        from motor.motor_asyncio import AsyncIOMotorClient

                        client: AsyncIOMotorClient = AsyncIOMotorClient(
                            f"mongodb://{host}:{port}", serverSelectionTimeoutMS=1000
                        )
                        # Try to ping
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            loop.run_until_complete(client.admin.command("ping"))
                            return True
                        finally:
                            loop.close()
                            client.close()
                    except Exception:
                        # Port is open but might not be MongoDB
                        return result == 0
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
        mongo_port = int(os.getenv("MONGO_PORT", 27017))

        # Check if MongoDB is running on default port
        if not PortDetector.is_port_available(27017):
            mongo_port = 27017  # MongoDB is running
        else:
            # Try to find MongoDB on alternative ports
            alternatives = [27018, 27019, 27020]
            for port in alternatives:
                if not PortDetector.is_port_available(port):
                    mongo_port = port
                    break

        mongo_url = f"mongodb://localhost:{mongo_port}"
        logger.info(f"Using MongoDB URL: {mongo_url}")
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
    def generate_frontend_config(backend_port: int, frontend_port: Optional[int] = None) -> str:
        """Generate frontend configuration with dynamic ports"""

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
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.41:{backend_port}
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
