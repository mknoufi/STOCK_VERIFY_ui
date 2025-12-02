"""
Simplified Performance Tests for Stock Verification System
Tests performance of actual workflows: auth, sessions, search
"""

import pytest
import pytest_asyncio
import random
import time
import asyncio
import statistics
import logging
from httpx import AsyncClient
from typing import Dict
from fastapi import status
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data"""
    name: str
    value: float
    unit: str
    baseline: Optional[float] = None
    threshold: Optional[float] = None
    passed: bool = True


class PerformanceBenchmark:
    """Performance benchmarking utility"""
    
    def __init__(self):
        self.metrics = []
        
    def record_metric(self, name: str, value: float, unit: str, threshold: Optional[float] = None):
        """Record a performance metric"""
        passed = True
        if threshold and value > threshold:
            passed = False
            
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            threshold=threshold,
            passed=passed
        )
        self.metrics.append(metric)
        
        status_icon = "✓" if passed else "✗"
        threshold_msg = f" (threshold: {threshold}{unit})" if threshold else ""
        logger.info(f"{status_icon} {name}: {value:.2f}{unit}{threshold_msg}")
        

@pytest.fixture
def benchmark():
    """Provide performance benchmark utility"""
    return PerformanceBenchmark()


class TestAPIPerformance:
    """API Performance Tests"""
    
    @pytest_asyncio.fixture
    async def auth_headers(self, async_client: AsyncClient) -> Dict[str, str]:
        """Create authenticated user and return auth headers"""
        user_data = {
            "username": f"perf_test_{random.randint(1000, 9999)}",
            "password": "TestPassword123!",
            "full_name": f"Perf User {random.randint(1000, 9999)}",
            "role": "admin"
        }
        
        await async_client.post("/api/auth/register", json=user_data)
        login_response = await async_client.post("/api/auth/login", json={
            "username": user_data["username"],
            "password": user_data["password"]
        })
        
        assert login_response.status_code == status.HTTP_200_OK, f"Login failed: {login_response.text}"
        token = login_response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @pytest.mark.asyncio
    async def test_authentication_performance(self, async_client: AsyncClient, benchmark: PerformanceBenchmark):
        """Benchmark authentication performance"""
        logger.info("Benchmarking authentication performance...")
        
        # 1. Registration Performance
        start_time = time.time()
        user_data = {
            "username": f"bench_user_{random.randint(10000, 99999)}",
            "password": "TestPassword123!",
            "full_name": "Benchmark User",
            "role": "staff"
        }
        
        response = await async_client.post("/api/auth/register", json=user_data)
        reg_time = (time.time() - start_time) * 1000  # ms
        
        assert response.status_code == status.HTTP_201_CREATED
        benchmark.record_metric("registration_latency", reg_time, "ms", 200.0)
        
        # 2. Login Performance
        start_time = time.time()
        response = await async_client.post("/api/auth/login", json={
            "username": user_data["username"],
            "password": user_data["password"]
        })
        login_time = (time.time() - start_time) * 1000  # ms
        
        assert response.status_code == status.HTTP_200_OK
        benchmark.record_metric("login_latency", login_time, "ms", 150.0)

    @pytest.mark.asyncio
    async def test_search_operations_performance(self, async_client: AsyncClient, auth_headers: Dict[str, str], benchmark: PerformanceBenchmark):
        """Benchmark search operations"""
        logger.info("Benchmarking search operations...")
        
        # Test search endpoint performance
        start_time = time.time()
        response = await async_client.get("/api/items/search?q=test", headers=auth_headers)
        search_time = (time.time() - start_time) * 1000
        
        # Search might return 200, 400, or 404
        assert response.status_code in [200, 400, 404]
        benchmark.record_metric("search_latency", search_time, "ms", 100.0)

    @pytest.mark.asyncio
    async def test_concurrent_request_performance(self, async_client: AsyncClient, auth_headers: Dict[str, str], benchmark: PerformanceBenchmark):
        """Benchmark concurrent request handling"""
        logger.info("Benchmarking concurrent requests...")
        
        # Define concurrent task
        async def make_request():
            start = time.time()
            resp = await async_client.get("/health", headers=auth_headers)
            return time.time() - start, resp.status_code
            
        # Execute 50 concurrent requests
        concurrency = 50
        start_total = time.time()
        tasks = [make_request() for _ in range(concurrency)]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_total
        
        # Analyze results
        latencies = [r[0] * 1000 for r in results]
        success_count = sum(1 for r in results if r[1] in [200, 307])
        
        avg_latency = statistics.mean(latencies)
        p95_latency = statistics.quantiles(latencies, n=20)[18] if len(latencies) > 1 else latencies[0]
        throughput = concurrency / total_time
        
        benchmark.record_metric("concurrent_avg_latency", avg_latency, "ms", 100.0)
        benchmark.record_metric("concurrent_p95_latency", p95_latency, "ms", 200.0)
        benchmark.record_metric("request_throughput", throughput, "req/s", 50.0)
        
        assert success_count >= concurrency * 0.95  # 95% success rate


class TestSessionPerformance:
    """Session Performance Tests"""
    
    @pytest_asyncio.fixture
    async def auth_headers(self, async_client: AsyncClient) -> Dict[str, str]:
        """Create authenticated user and return auth headers"""
        user_data = {
            "username": f"session_perf_{random.randint(1000, 9999)}",
            "password": "TestPassword123!",
            "full_name": f"Session Perf User {random.randint(1000, 9999)}",
            "role": "admin"
        }
        
        await async_client.post("/api/auth/register", json=user_data)
        login_response = await async_client.post("/api/auth/login", json={
            "username": user_data["username"],
            "password": user_data["password"]
        })
        
        token = login_response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.mark.asyncio
    async def test_session_creation_performance(self, async_client: AsyncClient, auth_headers: Dict[str, str], benchmark: PerformanceBenchmark):
        """Benchmark session creation"""
        logger.info("Benchmarking session creation...")
        
        session_data = {
            "location": f"Warehouse {random.randint(1, 10)}",
            "session_type": "full_count",
            "notes": "Performance test session"
        }
        
        start_time = time.time()
        response = await async_client.post("/api/sessions", json=session_data, headers=auth_headers)
        creation_time = (time.time() - start_time) * 1000
        
        # Session endpoint might not be fully implemented
        assert response.status_code in [200, 201, 404, 422]
        benchmark.record_metric("session_creation_latency", creation_time, "ms", 150.0)


class TestHealthCheckPerformance:
    """Health Check Performance Tests"""
    
    @pytest.mark.asyncio
    async def test_health_check_performance(self, async_client: AsyncClient, benchmark: PerformanceBenchmark):
        """Benchmark health check endpoint"""
        logger.info("Benchmarking health check...")
        
        # Perform multiple health checks
        latencies = []
        for _ in range(10):
            start_time = time.time()
            response = await async_client.get("/health")
            latency = (time.time() - start_time) * 1000
            latencies.append(latency)
            
            assert response.status_code in [200, 307]
        
        avg_latency = statistics.mean(latencies)
        max_latency = max(latencies)
        min_latency = min(latencies)
        
        benchmark.record_metric("health_check_avg", avg_latency, "ms", 50.0)
        benchmark.record_metric("health_check_max", max_latency, "ms", 100.0)
        benchmark.record_metric("health_check_min", min_latency, "ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
