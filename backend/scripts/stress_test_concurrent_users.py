#!/usr/bin/env python3
"""
Concurrent User Stress Test Script

Tests multi-user concurrency scenarios to verify:
1. Session isolation (no cross-user data leakage)
2. Connection pool handling under load
3. Proper authentication per request
4. Database operation atomicity

Usage:
    python stress_test_concurrent_users.py --users 10 --duration 60 --base-url http://localhost:8001

Requirements:
    pip install aiohttp asyncio
"""

import argparse
import asyncio
import json
import logging
import random
import statistics
import sys
import time
from dataclasses import dataclass, field
from typing import Any

try:
    import aiohttp
except ImportError:
    print("Error: aiohttp is required. Install with: pip install aiohttp")
    sys.exit(1)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


@dataclass
class UserSession:
    """Represents a simulated user session."""

    user_id: str
    username: str
    pin: str
    access_token: str | None = None
    refresh_token: str | None = None
    requests_made: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: list[float] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass
class StressTestResults:
    """Aggregated stress test results."""

    total_users: int = 0
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: list[float] = field(default_factory=list)
    session_isolation_errors: int = 0
    connection_errors: int = 0
    auth_errors: int = 0
    start_time: float = 0.0
    end_time: float = 0.0

    def calculate_stats(self) -> dict[str, Any]:
        """Calculate summary statistics."""
        duration = self.end_time - self.start_time
        rps = self.total_requests / duration if duration > 0 else 0

        if self.response_times:
            avg_response = statistics.mean(self.response_times)
            p50 = statistics.median(self.response_times)
            p95 = (
                statistics.quantiles(self.response_times, n=20)[18]
                if len(self.response_times) > 20
                else max(self.response_times)
            )
            p99 = (
                statistics.quantiles(self.response_times, n=100)[98]
                if len(self.response_times) > 100
                else max(self.response_times)
            )
            min_response = min(self.response_times)
            max_response = max(self.response_times)
        else:
            avg_response = p50 = p95 = p99 = min_response = max_response = 0

        success_rate = (
            (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0
        )

        return {
            "summary": {
                "total_users": self.total_users,
                "total_requests": self.total_requests,
                "successful_requests": self.successful_requests,
                "failed_requests": self.failed_requests,
                "success_rate": f"{success_rate:.2f}%",
                "duration_seconds": f"{duration:.2f}",
                "requests_per_second": f"{rps:.2f}",
            },
            "latency": {
                "avg_ms": f"{avg_response * 1000:.2f}",
                "p50_ms": f"{p50 * 1000:.2f}",
                "p95_ms": f"{p95 * 1000:.2f}",
                "p99_ms": f"{p99 * 1000:.2f}",
                "min_ms": f"{min_response * 1000:.2f}",
                "max_ms": f"{max_response * 1000:.2f}",
            },
            "errors": {
                "session_isolation_errors": self.session_isolation_errors,
                "connection_errors": self.connection_errors,
                "auth_errors": self.auth_errors,
            },
        }


class ConcurrentUserStressTester:
    """Stress tester for multi-user concurrency scenarios."""

    # Default test users (should exist in database)
    DEFAULT_USERS = [
        {"username": "staff1", "pin": "1234"},
        {"username": "supervisor", "pin": "1234"},
        {"username": "admin", "pin": "1234"},
    ]

    def __init__(
        self,
        base_url: str,
        num_users: int = 10,
        duration_seconds: int = 60,
        ramp_up_seconds: int = 5,
    ):
        self.base_url = base_url.rstrip("/")
        self.num_users = num_users
        self.duration_seconds = duration_seconds
        self.ramp_up_seconds = ramp_up_seconds
        self.sessions: list[UserSession] = []
        self.results = StressTestResults()
        self._stop_event = asyncio.Event()

    async def _create_session(self, user_idx: int) -> UserSession:
        """Create a user session with credentials."""
        # Rotate through available test users
        user_data = self.DEFAULT_USERS[user_idx % len(self.DEFAULT_USERS)]
        return UserSession(
            user_id=f"user_{user_idx}",
            username=user_data["username"],
            pin=user_data["pin"],
        )

    async def _login_user(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        """Authenticate a user and store tokens."""
        try:
            start_time = time.time()
            async with session.post(
                f"{self.base_url}/api/auth/login-pin",
                json={"pin": user.pin},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                elapsed = time.time() - start_time
                user.response_times.append(elapsed)

                if response.status == 200:
                    data = await response.json()
                    user.access_token = data.get("access_token")
                    user.refresh_token = data.get("refresh_token")
                    user.successful_requests += 1
                    return True
                else:
                    user.failed_requests += 1
                    user.errors.append(f"Login failed: {response.status}")
                    self.results.auth_errors += 1
                    return False
        except aiohttp.ClientError as e:
            user.failed_requests += 1
            user.errors.append(f"Login connection error: {str(e)}")
            self.results.connection_errors += 1
            return False
        except Exception as e:
            user.failed_requests += 1
            user.errors.append(f"Login error: {str(e)}")
            return False

    async def _make_authenticated_request(
        self,
        http_session: aiohttp.ClientSession,
        user: UserSession,
        method: str,
        path: str,
        json_data: dict | None = None,
    ) -> tuple[bool, dict | None]:
        """Make an authenticated API request."""
        if not user.access_token:
            return False, None

        headers = {"Authorization": f"Bearer {user.access_token}"}
        url = f"{self.base_url}{path}"

        try:
            start_time = time.time()
            async with http_session.request(
                method,
                url,
                json=json_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as response:
                elapsed = time.time() - start_time
                user.response_times.append(elapsed)
                user.requests_made += 1

                if response.status == 200:
                    user.successful_requests += 1
                    try:
                        data = await response.json()
                        return True, data
                    except json.JSONDecodeError:
                        return True, None
                elif response.status == 401:
                    user.failed_requests += 1
                    self.results.auth_errors += 1
                    return False, None
                else:
                    user.failed_requests += 1
                    return False, None

        except aiohttp.ClientError as e:
            user.failed_requests += 1
            user.errors.append(f"Request connection error: {str(e)}")
            self.results.connection_errors += 1
            return False, None
        except Exception as e:
            user.failed_requests += 1
            user.errors.append(f"Request error: {str(e)}")
            return False, None

    async def _verify_session_isolation(
        self, http_session: aiohttp.ClientSession, user: UserSession
    ) -> bool:
        """Verify that user can only access their own session data."""
        success, data = await self._make_authenticated_request(
            http_session, user, "GET", "/api/auth/me"
        )

        if success and data:
            # Verify the returned username matches the expected user
            returned_username = data.get("username")
            if returned_username and returned_username != user.username:
                logger.error(
                    f"SESSION ISOLATION VIOLATION: User {user.username} received data for {returned_username}"
                )
                self.results.session_isolation_errors += 1
                return False
            return True
        return False

    async def _run_user_session(self, user: UserSession, http_session: aiohttp.ClientSession):
        """Run a complete user session with various operations."""
        # Login
        if not await self._login_user(http_session, user):
            logger.warning(f"User {user.user_id} failed to login")
            return

        logger.info(f"User {user.user_id} ({user.username}) logged in successfully")

        # Run operations until stop signal
        while not self._stop_event.is_set():
            try:
                # Random delay between operations (simulate think time)
                await asyncio.sleep(random.uniform(0.5, 2.0))

                if self._stop_event.is_set():
                    break

                # Choose a random operation
                operation = random.choice(
                    [
                        self._verify_session_isolation,
                        self._search_items,
                        self._get_sessions,
                        self._heartbeat,
                    ]
                )

                await operation(http_session, user)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.debug(f"User {user.user_id} operation error: {e}")

    async def _search_items(self, http_session: aiohttp.ClientSession, user: UserSession) -> bool:
        """Perform an item search."""
        search_terms = ["rice", "oil", "sugar", "510", "520", "530"]
        search_term = random.choice(search_terms)

        success, data = await self._make_authenticated_request(
            http_session,
            user,
            "POST",
            "/api/items/search/optimized",
            json_data={"query": search_term, "limit": 20},
        )
        return success

    async def _get_sessions(self, http_session: aiohttp.ClientSession, user: UserSession) -> bool:
        """Get active sessions."""
        success, _ = await self._make_authenticated_request(
            http_session, user, "GET", "/api/sessions"
        )
        return success

    async def _heartbeat(self, http_session: aiohttp.ClientSession, user: UserSession) -> bool:
        """Send heartbeat to keep session alive."""
        success, _ = await self._make_authenticated_request(
            http_session, user, "GET", "/api/auth/heartbeat"
        )
        return success

    async def _ramp_up_users(self, http_session: aiohttp.ClientSession) -> list[asyncio.Task]:
        """Gradually start user sessions."""
        tasks = []
        delay_per_user = self.ramp_up_seconds / self.num_users

        for i in range(self.num_users):
            user = await self._create_session(i)
            self.sessions.append(user)

            task = asyncio.create_task(self._run_user_session(user, http_session))
            tasks.append(task)

            if delay_per_user > 0:
                await asyncio.sleep(delay_per_user)

            logger.info(f"Started user {i + 1}/{self.num_users}")

        return tasks

    async def run(self) -> StressTestResults:
        """Run the stress test."""
        logger.info(
            f"Starting stress test with {self.num_users} users for {self.duration_seconds}s"
        )
        logger.info(f"Target: {self.base_url}")

        self.results.total_users = self.num_users
        self.results.start_time = time.time()

        # Create shared HTTP session with connection pooling
        connector = aiohttp.TCPConnector(
            limit=self.num_users * 2,  # Allow 2 connections per user
            limit_per_host=self.num_users * 2,
            ttl_dns_cache=300,
        )

        async with aiohttp.ClientSession(connector=connector) as http_session:
            # Ramp up users
            tasks = await self._ramp_up_users(http_session)

            # Run for specified duration
            logger.info(f"All users started. Running for {self.duration_seconds} seconds...")
            await asyncio.sleep(self.duration_seconds)

            # Signal stop
            self._stop_event.set()

            # Wait for tasks to complete (with timeout)
            try:
                await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=10.0)
            except asyncio.TimeoutError:
                logger.warning("Some user sessions did not complete gracefully")
                for task in tasks:
                    task.cancel()

        self.results.end_time = time.time()

        # Aggregate results
        for user in self.sessions:
            self.results.total_requests += user.requests_made
            self.results.successful_requests += user.successful_requests
            self.results.failed_requests += user.failed_requests
            self.results.response_times.extend(user.response_times)

        return self.results

    def print_results(self):
        """Print formatted test results."""
        stats = self.results.calculate_stats()

        print("\n" + "=" * 60)
        print("CONCURRENT USER STRESS TEST RESULTS")
        print("=" * 60)

        print("\n📊 Summary:")
        for key, value in stats["summary"].items():
            print(f"   {key}: {value}")

        print("\n⏱️ Latency:")
        for key, value in stats["latency"].items():
            print(f"   {key}: {value}")

        print("\n❌ Errors:")
        for key, value in stats["errors"].items():
            print(f"   {key}: {value}")

        # Session isolation check
        if stats["errors"]["session_isolation_errors"] > 0:
            print("\n🚨 CRITICAL: Session isolation violations detected!")
            print("   This indicates potential security issues with multi-user handling.")
        else:
            print("\n✅ Session isolation: PASSED")

        # Overall status
        success_rate = float(stats["summary"]["success_rate"].rstrip("%"))
        if success_rate >= 99.0 and stats["errors"]["session_isolation_errors"] == 0:
            print("\n🎉 STRESS TEST: PASSED")
        elif success_rate >= 95.0:
            print("\n⚠️ STRESS TEST: PASSED WITH WARNINGS")
        else:
            print("\n❌ STRESS TEST: FAILED")

        print("=" * 60 + "\n")

        return stats


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Concurrent User Stress Test for Stock Verification System"
    )
    parser.add_argument(
        "--users",
        "-u",
        type=int,
        default=10,
        help="Number of concurrent users (default: 10)",
    )
    parser.add_argument(
        "--duration",
        "-d",
        type=int,
        default=60,
        help="Test duration in seconds (default: 60)",
    )
    parser.add_argument(
        "--base-url",
        "-b",
        type=str,
        default="http://localhost:8001",
        help="Base URL of the API server (default: http://localhost:8001)",
    )
    parser.add_argument(
        "--ramp-up",
        "-r",
        type=int,
        default=5,
        help="Ramp-up time in seconds (default: 5)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        help="Output file for JSON results (optional)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Create and run tester
    tester = ConcurrentUserStressTester(
        base_url=args.base_url,
        num_users=args.users,
        duration_seconds=args.duration,
        ramp_up_seconds=args.ramp_up,
    )

    try:
        await tester.run()
        stats = tester.print_results()

        # Write JSON output if requested
        if args.output:
            with open(args.output, "w") as f:
                json.dump(stats, f, indent=2)
            print(f"Results written to: {args.output}")

    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
