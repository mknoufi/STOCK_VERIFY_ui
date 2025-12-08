#!/usr/bin/env python3
"""
Stock Verify Evaluation Runner
==============================

Unified command-line interface to run all evaluations and generate reports.

Usage:
    python -m backend.tests.evaluation.run_evaluation --all
    python -m backend.tests.evaluation.run_evaluation --performance
    python -m backend.tests.evaluation.run_evaluation --business-logic
    python -m backend.tests.evaluation.run_evaluation --data-quality
    python -m backend.tests.evaluation.run_evaluation --workflow
    python -m backend.tests.evaluation.run_evaluation --report-only
"""

import argparse
import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .metrics_collector import MetricsCollector, EvaluationReport, MetricCategory


class EvaluationRunner:
    """
    Main evaluation runner that orchestrates all evaluation types.
    """

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path("backend/tests/evaluation/reports")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.collector = MetricsCollector()
        self.results: Dict[str, Any] = {}

    def run_pytest_evaluation(
        self,
        markers: List[str],
        name: str,
        verbose: bool = False,
    ) -> Dict[str, Any]:
        """Run pytest with specific markers and capture results."""
        marker_expr = " or ".join(markers)
        cmd = [
            sys.executable, "-m", "pytest",
            "backend/tests/evaluation/",
            "-v" if verbose else "-q",
            f"-m", marker_expr,
            "--tb=short",
            "-x",  # Stop on first failure for efficiency
        ]

        print(f"\n{'='*60}")
        print(f"🧪 Running {name} Evaluation")
        print(f"{'='*60}")
        print(f"Command: {' '.join(cmd)}")

        start_time = datetime.now()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=Path(__file__).resolve().parent.parent.parent.parent,
        )
        duration = (datetime.now() - start_time).total_seconds()

        # Parse results
        passed = result.stdout.count(" PASSED")
        failed = result.stdout.count(" FAILED")
        skipped = result.stdout.count(" SKIPPED")

        evaluation_result = {
            "name": name,
            "markers": markers,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_seconds": duration,
            "return_code": result.returncode,
            "success": result.returncode == 0,
        }

        # Print summary
        if result.returncode == 0:
            print(f"✅ {name}: {passed} passed, {skipped} skipped in {duration:.2f}s")
        else:
            print(f"❌ {name}: {failed} failed, {passed} passed in {duration:.2f}s")
            if verbose:
                print("\nOutput:")
                print(result.stdout)
                if result.stderr:
                    print("\nErrors:")
                    print(result.stderr)

        return evaluation_result

    async def run_standalone_evaluation(
        self,
        evaluation_type: str,
    ) -> Dict[str, Any]:
        """Run standalone evaluation without pytest (for quick checks)."""
        from .evaluators import (
            BusinessLogicEvaluator,
            DataQualityEvaluator,
        )

        self.collector.start_evaluation()

        print(f"\n{'='*60}")
        print(f"🧪 Running Standalone {evaluation_type} Evaluation")
        print(f"{'='*60}")

        if evaluation_type == "business_logic":
            evaluator = BusinessLogicEvaluator(self.collector)
            results = await evaluator.evaluate()
        elif evaluation_type == "data_quality":
            evaluator = DataQualityEvaluator(self.collector)
            results = await evaluator.evaluate(
                mongo_db=None,
                sql_connection=None,
                sample_size=100,
            )
        else:
            results = {}

        report = self.collector.finish_evaluation(metadata={
            "type": evaluation_type,
            "standalone": True,
        })

        report.print_summary()

        return {
            "name": evaluation_type,
            "results": results,
            "success_rate": report.success_rate,
            "passed": report.passed_count,
            "failed": report.failed_count,
        }

    def run_all_evaluations(self, verbose: bool = False) -> Dict[str, Any]:
        """Run all evaluation types."""
        evaluations = [
            (["performance"], "API Performance"),
            (["business_logic"], "Business Logic"),
            (["data_quality"], "Data Quality"),
            (["workflow"], "Workflow"),
        ]

        all_results = {
            "timestamp": datetime.now().isoformat(),
            "evaluations": {},
            "summary": {},
        }

        total_passed = 0
        total_failed = 0
        total_skipped = 0

        for markers, name in evaluations:
            result = self.run_pytest_evaluation(markers, name, verbose)
            all_results["evaluations"][name] = result
            total_passed += result["passed"]
            total_failed += result["failed"]
            total_skipped += result["skipped"]

        all_results["summary"] = {
            "total_passed": total_passed,
            "total_failed": total_failed,
            "total_skipped": total_skipped,
            "overall_success": total_failed == 0,
        }

        return all_results

    def generate_report(
        self,
        results: Dict[str, Any],
        format: str = "json",
    ) -> Path:
        """Generate evaluation report file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "json":
            report_path = self.output_dir / f"evaluation_report_{timestamp}.json"
            with open(report_path, "w") as f:
                json.dump(results, f, indent=2, default=str)
        elif format == "md":
            report_path = self.output_dir / f"evaluation_report_{timestamp}.md"
            with open(report_path, "w") as f:
                f.write(self._generate_markdown_report(results))
        else:
            raise ValueError(f"Unknown format: {format}")

        print(f"\n📄 Report saved to: {report_path}")
        return report_path

    def _generate_markdown_report(self, results: Dict[str, Any]) -> str:
        """Generate markdown report."""
        lines = [
            "# Stock Verify Evaluation Report",
            f"\n**Generated:** {results.get('timestamp', datetime.now().isoformat())}",
            "\n## Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
        ]

        summary = results.get("summary", {})
        lines.append(f"| ✅ Passed | {summary.get('total_passed', 0)} |")
        lines.append(f"| ❌ Failed | {summary.get('total_failed', 0)} |")
        lines.append(f"| ⏭️ Skipped | {summary.get('total_skipped', 0)} |")

        status = "✅ SUCCESS" if summary.get("overall_success") else "❌ NEEDS ATTENTION"
        lines.append(f"| Overall | {status} |")

        lines.append("\n## Detailed Results\n")

        for name, eval_result in results.get("evaluations", {}).items():
            icon = "✅" if eval_result.get("success") else "❌"
            lines.append(f"### {icon} {name}")
            lines.append("")
            lines.append(f"- **Passed:** {eval_result.get('passed', 0)}")
            lines.append(f"- **Failed:** {eval_result.get('failed', 0)}")
            lines.append(f"- **Duration:** {eval_result.get('duration_seconds', 0):.2f}s")
            lines.append("")

        lines.append("\n## Recommendations\n")

        if summary.get("total_failed", 0) > 0:
            lines.append("⚠️ Some evaluations failed. Review the following:")
            lines.append("")
            for name, eval_result in results.get("evaluations", {}).items():
                if not eval_result.get("success"):
                    lines.append(f"- [ ] Fix issues in **{name}** evaluation")
        else:
            lines.append("✅ All evaluations passed! The system is operating correctly.")

        return "\n".join(lines)

    def print_final_summary(self, results: Dict[str, Any]):
        """Print final summary to console."""
        print("\n" + "=" * 60)
        print("📊 EVALUATION COMPLETE")
        print("=" * 60)

        summary = results.get("summary", {})

        print(f"\n✅ Passed:  {summary.get('total_passed', 0)}")
        print(f"❌ Failed:  {summary.get('total_failed', 0)}")
        print(f"⏭️  Skipped: {summary.get('total_skipped', 0)}")

        if summary.get("overall_success"):
            print("\n🎉 All evaluations PASSED!")
        else:
            print("\n⚠️  Some evaluations FAILED - review needed")

        print("\n" + "=" * 60)


def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        description="Stock Verify Evaluation Runner"
    )

    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Run all evaluations",
    )
    parser.add_argument(
        "--performance", "-p",
        action="store_true",
        help="Run API performance evaluation",
    )
    parser.add_argument(
        "--business-logic", "-b",
        action="store_true",
        help="Run business logic evaluation",
    )
    parser.add_argument(
        "--data-quality", "-d",
        action="store_true",
        help="Run data quality evaluation",
    )
    parser.add_argument(
        "--workflow", "-w",
        action="store_true",
        help="Run workflow evaluation",
    )
    parser.add_argument(
        "--standalone", "-s",
        action="store_true",
        help="Run standalone evaluation (no pytest)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="backend/tests/evaluation/reports",
        help="Output directory for reports",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["json", "md"],
        default="json",
        help="Report format",
    )

    args = parser.parse_args()

    runner = EvaluationRunner(output_dir=Path(args.output))

    if args.all:
        results = runner.run_all_evaluations(verbose=args.verbose)
    elif args.standalone:
        # Run standalone evaluations
        async def run_standalone():
            results = {
                "timestamp": datetime.now().isoformat(),
                "evaluations": {},
                "summary": {},
            }

            if args.business_logic or args.all:
                results["evaluations"]["business_logic"] = await runner.run_standalone_evaluation("business_logic")

            if args.data_quality or args.all:
                results["evaluations"]["data_quality"] = await runner.run_standalone_evaluation("data_quality")

            return results

        results = asyncio.run(run_standalone())
    else:
        # Run specific evaluations
        results = {
            "timestamp": datetime.now().isoformat(),
            "evaluations": {},
            "summary": {"total_passed": 0, "total_failed": 0, "total_skipped": 0},
        }

        if args.performance:
            r = runner.run_pytest_evaluation(["performance"], "API Performance", args.verbose)
            results["evaluations"]["performance"] = r
            results["summary"]["total_passed"] += r["passed"]
            results["summary"]["total_failed"] += r["failed"]

        if args.business_logic:
            r = runner.run_pytest_evaluation(["business_logic"], "Business Logic", args.verbose)
            results["evaluations"]["business_logic"] = r
            results["summary"]["total_passed"] += r["passed"]
            results["summary"]["total_failed"] += r["failed"]

        if args.data_quality:
            r = runner.run_pytest_evaluation(["data_quality"], "Data Quality", args.verbose)
            results["evaluations"]["data_quality"] = r
            results["summary"]["total_passed"] += r["passed"]
            results["summary"]["total_failed"] += r["failed"]

        if args.workflow:
            r = runner.run_pytest_evaluation(["workflow"], "Workflow", args.verbose)
            results["evaluations"]["workflow"] = r
            results["summary"]["total_passed"] += r["passed"]
            results["summary"]["total_failed"] += r["failed"]

        results["summary"]["overall_success"] = results["summary"]["total_failed"] == 0

    # Generate report
    if results.get("evaluations"):
        runner.generate_report(results, format=args.format)
        runner.print_final_summary(results)
    else:
        print("No evaluations selected. Use --help for options.")
        sys.exit(1)

    # Exit with error code if any evaluations failed
    if not results.get("summary", {}).get("overall_success", True):
        sys.exit(1)


if __name__ == "__main__":
    main()
