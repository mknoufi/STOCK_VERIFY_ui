import asyncio
import logging
import socket

from zeroconf import ServiceInfo, Zeroconf

logger = logging.getLogger(__name__)


class MDNSService:
    def __init__(self, service_name: str = "stock-verify", port: int = 8001):
        self.zeroconf = Zeroconf()
        self.service_name = service_name
        self.port = port
        self.info = None

    async def register(self):
        try:
            # Get local IP
            local_ip = self._get_local_ip()
            if not local_ip:
                logger.warning("Could not determine local IP for mDNS registration")
                return

            # Prepare service info
            # _http._tcp.local. is the service type
            desc = {"path": "/"}

            self.info = ServiceInfo(
                "_http._tcp.local.",
                f"{self.service_name}._http._tcp.local.",
                addresses=[socket.inet_aton(local_ip)],
                port=self.port,
                properties=desc,
                server=f"{self.service_name}.local.",
            )

            logger.info(
                f"Registering mDNS service: {self.service_name}.local. at {local_ip}:{self.port}"
            )

            # Run blocking registration in executor
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self.zeroconf.register_service, self.info)

        except Exception as e:
            logger.error(f"Failed to register mDNS service: {e}", exc_info=True)

    async def unregister(self):
        if self.info:
            logger.info(f"Unregistering mDNS service: {self.service_name}")
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self.zeroconf.unregister_service, self.info)

        self.zeroconf.close()

    def _get_local_ip(self):
        try:
            # Connect to a public DNS to determine the most appropriate local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"


# Global instance
mdns_service = None


async def start_mdns(port: int = 8001):
    global mdns_service
    mdns_service = MDNSService(port=port)
    await mdns_service.register()


async def stop_mdns():
    global mdns_service
    if mdns_service:
        await mdns_service.unregister()
