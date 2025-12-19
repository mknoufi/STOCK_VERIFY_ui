#!/usr/bin/env python3
"""
Codebase Benchmark Script for Server-Side Analysis
Analyzes Python server performance and code metrics
"""

import time
import psutil
import subprocess
import json
import os
import sys
import ast
from pathlib import Path
from typing import Dict, Any


class ServerBenchmark:
    def __init__(self):
        self.results = {}
        self.start_time = time.time()
        self.base_dir = Path(__file__).parent

    def run_full_benchmark(self) -> Dict[str, Any]:
        """Run complete server benchmark suite"""
        print("🚀 Starting Server Codebase Benchmark Suite...\n")

        # Performance benchmarks
        self.benchmark_startup_time()
        self.benchmark_memory_usage()
        self.benchmark_file_operations()
        self.benchmark_request_handling()

        # Code analysis
        self.analyze_python_code()
        self.analyze_dependencies()

        # System metrics
        self.benchmark_system_resources()

        # Generate report
        self.generate_benchmark_report()

        return self.results

    def benchmark_startup_time(self):
        """Benchmark server startup time"""
        print("⚡ Benchmarking Server Startup Time...")

        server_files = ["server.py", "enhanced-server.py"]
        startup_times = {}

        for server_file in server_files:
            if os.path.exists(self.base_dir / server_file):
                try:
                    # Measure import time (simulates startup)
                    start_time = time.time()

                    # Read and compile the file to simulate startup
                    with open(self.base_dir / server_file, "r") as f:
                        content = f.read()

                    compile(content, server_file, "exec")
                    startup_time = (time.time() - start_time) * 1000  # ms

                    startup_times[server_file] = {
                        "startup_time": round(startup_time, 2),
                        "file_size": os.path.getsize(self.base_dir / server_file) / 1024,  # KB
                    }

                    print(f"✅ {server_file}: {startup_time:.2f}ms")

                except Exception as e:
                    startup_times[server_file] = {"error": str(e)}
                    print(f"❌ {server_file}: {e}")

        self.results["startup"] = startup_times
        print()

    def benchmark_memory_usage(self):
        """Benchmark memory usage patterns"""
        print("🧠 Benchmarking Memory Usage...")

        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Test large data structures
        start_time = time.time()

        # Large list operations
        large_list = [
            {"id": i, "data": f"item_{i}", "timestamp": time.time()} for i in range(100000)
        ]
        list_time = (time.time() - start_time) * 1000
        list_memory = process.memory_info().rss / 1024 / 1024

        # Dictionary operations
        start_time = time.time()
        large_dict = {f"key_{i}": {"value": i, "metadata": f"meta_{i}"} for i in range(50000)}
        dict_time = (time.time() - start_time) * 1000
        dict_memory = process.memory_info().rss / 1024 / 1024

        # JSON operations
        start_time = time.time()
        json_data = {"users": large_list[:1000]}  # Smaller subset for JSON
        json_string = json.dumps(json_data)
        parsed_data = json.loads(json_string)
        json_time = (time.time() - start_time) * 1000
        json_memory = process.memory_info().rss / 1024 / 1024

        # Cleanup
        del large_list, large_dict, json_data, parsed_data

        final_memory = process.memory_info().rss / 1024 / 1024

        self.results["memory"] = {
            "initial_memory_mb": round(initial_memory, 2),
            "list_operations": {
                "time_ms": round(list_time, 2),
                "memory_mb": round(list_memory, 2),
                "memory_increase_mb": round(list_memory - initial_memory, 2),
            },
            "dict_operations": {
                "time_ms": round(dict_time, 2),
                "memory_mb": round(dict_memory, 2),
                "memory_increase_mb": round(dict_memory - list_memory, 2),
            },
            "json_operations": {
                "time_ms": round(json_time, 2),
                "memory_mb": round(json_memory, 2),
                "json_size_kb": round(len(json_string) / 1024, 2),
            },
            "final_memory_mb": round(final_memory, 2),
            "total_increase_mb": round(final_memory - initial_memory, 2),
        }

        print(f"✅ List Operations: {list_time:.2f}ms")
        print(f"✅ Dict Operations: {dict_time:.2f}ms")
        print(f"✅ JSON Operations: {json_time:.2f}ms")
        print(f"✅ Memory Efficiency: {final_memory - initial_memory:.2f}MB increase\n")

    def benchmark_file_operations(self):
        """Benchmark file I/O operations"""
        print("📁 Benchmarking File Operations...")

        # Create test data
        test_data = {
            "logs": [f"[2024-11-27T12:00:{i:02d}] INFO: Test log entry {i}" for i in range(1000)],
            "config": {"server_port": 8000, "debug": True, "max_connections": 100},
            "users": [{"id": i, "name": f"User {i}"} for i in range(100)],
        }

        # Write operations
        start_time = time.time()
        with open(self.base_dir / "benchmark_test.json", "w") as f:
            json.dump(test_data, f, indent=2)
        write_time = (time.time() - start_time) * 1000

        # Read operations
        start_time = time.time()
        with open(self.base_dir / "benchmark_test.json", "r") as f:
            loaded_data = json.load(f)
        read_time = (time.time() - start_time) * 1000

        # File size
        file_size = os.path.getsize(self.base_dir / "benchmark_test.json") / 1024  # KB

        # Multiple small file operations
        start_time = time.time()
        for i in range(10):
            with open(self.base_dir / f"temp_{i}.txt", "w") as f:
                f.write(f"Temporary file {i} content\n" * 10)
        small_files_time = (time.time() - start_time) * 1000

        # Cleanup test files
        os.remove(self.base_dir / "benchmark_test.json")
        for i in range(10):
            if os.path.exists(self.base_dir / f"temp_{i}.txt"):
                os.remove(self.base_dir / f"temp_{i}.txt")

        self.results["file_operations"] = {
            "write_time_ms": round(write_time, 2),
            "read_time_ms": round(read_time, 2),
            "file_size_kb": round(file_size, 2),
            "write_throughput_kb_per_sec": round(file_size / (write_time / 1000), 2),
            "read_throughput_kb_per_sec": round(file_size / (read_time / 1000), 2),
            "small_files_time_ms": round(small_files_time, 2),
        }

        print(f"✅ Write: {write_time:.2f}ms ({file_size / write_time * 1000:.1f} KB/s)")
        print(f"✅ Read: {read_time:.2f}ms ({file_size / read_time * 1000:.1f} KB/s)")
        print(f"✅ Small Files: {small_files_time:.2f}ms\n")

    def benchmark_request_handling(self):
        """Benchmark simulated request handling"""
        print("🌐 Benchmarking Request Handling...")

        # Simulate request processing
        requests = []
        start_time = time.time()

        for i in range(1000):
            # Simulate request data
            request_data = {
                "method": "GET" if i % 3 == 0 else "POST",
                "path": f"/api/endpoint_{i % 10}",
                "headers": {"Content-Type": "application/json"},
                "body": {"data": f"request_{i}"} if i % 3 != 0 else None,
                "timestamp": time.time(),
            }

            # Simulate processing
            if request_data["method"] == "POST" and request_data["body"]:
                # Simulate validation and processing
                processed = json.dumps(request_data["body"])
                validated = json.loads(processed)

            requests.append(request_data)

        processing_time = (time.time() - start_time) * 1000

        # Simulate concurrent request handling
        start_time = time.time()
        batch_size = 50
        batches = [requests[i : i + batch_size] for i in range(0, len(requests), batch_size)]

        for batch in batches:
            # Simulate batch processing
            batch_results = []
            for req in batch:
                result = {
                    "status": 200,
                    "response_time": time.time() - req["timestamp"],
                    "processed": True,
                }
                batch_results.append(result)

        batch_time = (time.time() - start_time) * 1000

        self.results["request_handling"] = {
            "total_requests": len(requests),
            "sequential_time_ms": round(processing_time, 2),
            "sequential_rps": round(len(requests) / (processing_time / 1000), 2),
            "batch_time_ms": round(batch_time, 2),
            "batch_rps": round(len(requests) / (batch_time / 1000), 2),
            "performance_improvement": round(
                (processing_time - batch_time) / processing_time * 100, 2
            ),
        }

        print(
            f"✅ Sequential: {processing_time:.2f}ms ({len(requests) / (processing_time / 1000):.1f} req/s)"
        )
        print(
            f"✅ Batch Processing: {batch_time:.2f}ms ({len(requests) / (batch_time / 1000):.1f} req/s)"
        )
        print(
            f"✅ Performance Gain: {(processing_time - batch_time) / processing_time * 100:.1f}%\n"
        )

    def analyze_python_code(self):
        """Analyze Python code complexity and quality"""
        print("🔍 Analyzing Python Code Quality...")

        python_files = ["server.py", "enhanced-server.py"]
        analysis_results = {}

        for file_name in python_files:
            file_path = self.base_dir / file_name
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r") as f:
                    content = f.read()

                # Parse AST for analysis
                tree = ast.parse(content)

                # Count various code elements
                functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                classes = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
                imports = [
                    node
                    for node in ast.walk(tree)
                    if isinstance(node, (ast.Import, ast.ImportFrom))
                ]

                # Calculate complexity metrics
                lines = content.split("\n")
                total_lines = len(lines)
                code_lines = len(
                    [line for line in lines if line.strip() and not line.strip().startswith("#")]
                )
                comment_lines = len([line for line in lines if line.strip().startswith("#")])

                # Function complexity
                avg_function_length = code_lines / len(functions) if functions else 0

                # Estimate cyclomatic complexity (simplified)
                complexity_keywords = ["if", "elif", "for", "while", "except", "and", "or"]
                complexity_count = sum(content.count(keyword) for keyword in complexity_keywords)

                analysis_results[file_name] = {
                    "total_lines": total_lines,
                    "code_lines": code_lines,
                    "comment_lines": comment_lines,
                    "comment_ratio": round(comment_lines / total_lines * 100, 2),
                    "functions": len(functions),
                    "classes": len(classes),
                    "imports": len(imports),
                    "avg_function_length": round(avg_function_length, 2),
                    "estimated_complexity": complexity_count,
                    "maintainability_score": self.calculate_maintainability(
                        total_lines, code_lines, comment_lines, len(functions), complexity_count
                    ),
                }

                print(f"✅ {file_name}: {len(functions)} functions, {len(classes)} classes")
                print(
                    f"   Lines: {code_lines} code, {comment_lines} comments ({comment_lines / total_lines * 100:.1f}%)"
                )

            except Exception as e:
                analysis_results[file_name] = {"error": str(e)}
                print(f"❌ {file_name}: Analysis failed - {e}")

        self.results["code_analysis"] = analysis_results
        print()

    def analyze_dependencies(self):
        """Analyze project dependencies"""
        print("📦 Analyzing Dependencies...")

        # Get installed packages
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "list", "--format=json"],
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                packages = json.loads(result.stdout)

                # Common web framework packages
                web_packages = ["fastapi", "flask", "django", "tornado", "aiohttp"]
                db_packages = ["sqlalchemy", "psycopg2", "pymongo", "redis"]
                util_packages = ["requests", "psutil", "pydantic", "uvicorn"]

                found_web = [pkg for pkg in packages if pkg["name"].lower() in web_packages]
                found_db = [pkg for pkg in packages if pkg["name"].lower() in db_packages]
                found_util = [pkg for pkg in packages if pkg["name"].lower() in util_packages]

                self.results["dependencies"] = {
                    "total_packages": len(packages),
                    "web_frameworks": found_web,
                    "database_packages": found_db,
                    "utility_packages": found_util,
                    "package_categories": {
                        "web": len(found_web),
                        "database": len(found_db),
                        "utility": len(found_util),
                        "other": len(packages) - len(found_web) - len(found_db) - len(found_util),
                    },
                }

                print(f"✅ Total Packages: {len(packages)}")
                print(f"✅ Web Frameworks: {len(found_web)}")
                print(f"✅ Database Packages: {len(found_db)}")
                print(f"✅ Utility Packages: {len(found_util)}")

            else:
                self.results["dependencies"] = {"error": "Could not list packages"}
                print("❌ Could not analyze dependencies")

        except Exception as e:
            self.results["dependencies"] = {"error": str(e)}
            print(f"❌ Dependency analysis failed: {e}")

        print()

    def benchmark_system_resources(self):
        """Benchmark system resource usage"""
        print("⚙️ Analyzing System Resources...")

        # CPU information
        cpu_count = psutil.cpu_count()
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memory information
        memory = psutil.virtual_memory()

        # Disk information
        disk = psutil.disk_usage(".")

        # Network (if available)
        network = psutil.net_io_counters() if hasattr(psutil, "net_io_counters") else None

        # Process information
        process = psutil.Process()
        process_memory = process.memory_info()

        # Python performance test
        start_time = time.time()
        result = sum(i * i for i in range(100000))
        cpu_performance = (time.time() - start_time) * 1000

        self.results["system_resources"] = {
            "cpu": {
                "cores": cpu_count,
                "usage_percent": cpu_percent,
                "performance_ms": round(cpu_performance, 2),
            },
            "memory": {
                "total_gb": round(memory.total / 1024**3, 2),
                "available_gb": round(memory.available / 1024**3, 2),
                "usage_percent": memory.percent,
                "process_memory_mb": round(process_memory.rss / 1024**2, 2),
            },
            "disk": {
                "total_gb": round(disk.total / 1024**3, 2),
                "free_gb": round(disk.free / 1024**3, 2),
                "usage_percent": round((disk.used / disk.total) * 100, 2),
            },
            "network": (
                {
                    "bytes_sent": network.bytes_sent if network else 0,
                    "bytes_recv": network.bytes_recv if network else 0,
                }
                if network
                else {"available": False}
            ),
        }

        print(f"✅ CPU: {cpu_count} cores, {cpu_percent}% usage")
        print(f"✅ Memory: {memory.available / 1024**3:.1f}GB available ({memory.percent}% used)")
        print(
            f"✅ Disk: {disk.free / 1024**3:.1f}GB free ({(disk.used / disk.total) * 100:.1f}% used)"
        )
        print(f"✅ CPU Performance: {cpu_performance:.2f}ms\n")

    def calculate_maintainability(
        self, total_lines, code_lines, comment_lines, functions, complexity
    ):
        """Calculate maintainability index (simplified)"""
        if code_lines == 0:
            return 0

        # Simplified maintainability index calculation
        # Based on Halstead Volume, Cyclomatic Complexity, and Lines of Code

        # Volume estimation (simplified)
        volume = code_lines * 4.7  # Rough estimation

        # Complexity penalty
        complexity_penalty = complexity * 0.23

        # Comment bonus
        comment_bonus = (comment_lines / total_lines) * 10 if total_lines > 0 else 0

        # Function organization bonus
        function_bonus = min(functions / (code_lines / 20), 5) if code_lines > 0 else 0

        # Calculate index (0-100 scale)
        maintainability = max(
            0,
            min(
                100,
                171
                - 5.2 * (volume / 1000)
                - 0.23 * complexity_penalty
                + comment_bonus
                + function_bonus,
            ),
        )

        return round(maintainability, 2)

    def generate_benchmark_report(self):
        """Generate comprehensive benchmark report"""
        total_time = round(time.time() - self.start_time, 2)

        print("📊 SERVER BENCHMARK RESULTS")
        print("=" * 50)

        # Startup Performance
        if "startup" in self.results:
            print("\n⚡ STARTUP PERFORMANCE:")
            for server, data in self.results["startup"].items():
                if "startup_time" in data:
                    print(f"{server}: {data['startup_time']}ms ({data['file_size']:.1f}KB)")

        # Memory Performance
        if "memory" in self.results:
            print("\n🧠 MEMORY PERFORMANCE:")
            print(f"List Operations: {self.results['memory']['list_operations']['time_ms']}ms")
            print(f"Dict Operations: {self.results['memory']['dict_operations']['time_ms']}ms")
            print(f"JSON Operations: {self.results['memory']['json_operations']['time_ms']}ms")
            print(f"Memory Efficiency: {self.results['memory']['total_increase_mb']}MB overhead")

        # Request Handling
        if "request_handling" in self.results:
            print("\n🌐 REQUEST HANDLING:")
            print(f"Sequential: {self.results['request_handling']['sequential_rps']:.1f} req/sec")
            print(f"Batch Processing: {self.results['request_handling']['batch_rps']:.1f} req/sec")
            print(
                f"Improvement: {self.results['request_handling']['performance_improvement']:.1f}%"
            )

        # Code Quality
        if "code_analysis" in self.results:
            print("\n🔍 CODE QUALITY:")
            for file_name, data in self.results["code_analysis"].items():
                if "maintainability_score" in data:
                    print(f"{file_name}: {data['maintainability_score']}/100 maintainability")
                    print(f"  Functions: {data['functions']}, Lines: {data['code_lines']}")

        # System Resources
        if "system_resources" in self.results:
            print("\n⚙️ SYSTEM RESOURCES:")
            sys_res = self.results["system_resources"]
            print(f"CPU: {sys_res['cpu']['cores']} cores, {sys_res['cpu']['usage_percent']}% usage")
            print(f"Memory: {sys_res['memory']['available_gb']:.1f}GB available")
            print(f"Performance: {sys_res['cpu']['performance_ms']:.2f}ms CPU test")

        # Overall Score
        score = self.calculate_overall_score()
        print(f"\n🏆 OVERALL SCORE: {score}/100")

        print(f"\n⏱️  Total Benchmark Time: {total_time}s")
        print("=" * 50)

        # Export results
        timestamp = int(time.time())
        output_file = self.base_dir / f"server-benchmark-{timestamp}.json"

        export_data = {
            "timestamp": time.time(),
            "results": self.results,
            "score": score,
            "duration": total_time,
        }

        try:
            with open(output_file, "w") as f:
                json.dump(export_data, f, indent=2)
            print(f"\n📄 Results exported to: {output_file}")
        except Exception as e:
            print(f"❌ Failed to export results: {e}")

        return self.results

    def calculate_overall_score(self):
        """Calculate overall performance score"""
        scores = []

        # Startup score (0-25 points)
        if "startup" in self.results:
            startup_times = []
            for data in self.results["startup"].values():
                if "startup_time" in data:
                    startup_times.append(data["startup_time"])
            if startup_times:
                avg_startup = sum(startup_times) / len(startup_times)
                startup_score = max(0, 25 - (avg_startup / 10))  # Penalty for slow startup
                scores.append(startup_score)

        # Memory score (0-25 points)
        if "memory" in self.results:
            memory_overhead = self.results["memory"]["total_increase_mb"]
            memory_score = max(0, 25 - (memory_overhead / 2))  # Penalty for high memory usage
            scores.append(memory_score)

        # Performance score (0-25 points)
        if "request_handling" in self.results:
            rps = self.results["request_handling"]["batch_rps"]
            performance_score = min(25, rps / 100)  # Up to 25 points for high RPS
            scores.append(performance_score)

        # Code quality score (0-25 points)
        if "code_analysis" in self.results:
            maintainability_scores = []
            for data in self.results["code_analysis"].values():
                if "maintainability_score" in data:
                    maintainability_scores.append(data["maintainability_score"])
            if maintainability_scores:
                avg_maintainability = sum(maintainability_scores) / len(maintainability_scores)
                quality_score = (avg_maintainability / 100) * 25
                scores.append(quality_score)

        return round(sum(scores), 2) if scores else 0


def main():
    """Main benchmark execution"""
    benchmark = ServerBenchmark()
    results = benchmark.run_full_benchmark()
    return results


if __name__ == "__main__":
    main()
