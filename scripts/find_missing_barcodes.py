#!/usr/bin/env python3
"""
Find Missing Barcodes in Series 510001-529999

This script analyzes the inventory database to identify missing barcodes
in the specified range. It queries the ERP system via the API and generates
a comprehensive report.

Usage:
    python scripts/find_missing_barcodes.py [--start 510001] [--end 529999] [--output missing_barcodes.txt]
"""

import sys
import argparse
import requests
from typing import Set, List, Tuple
import json
from datetime import datetime


class BarcodeAnalyzer:
    def __init__(self, base_url: str = "http://localhost:8001", token: str = None):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}" if token else None,
            "Content-Type": "application/json"
        }

    def login(self, username: str = "admin", password: str = "admin123") -> bool:
        """Authenticate and get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"username": username, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.token = data["data"]["access_token"]
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    return True
        except Exception as e:
            print(f"❌ Login failed: {e}")
        return False

    def get_existing_barcodes(self, start: int, end: int, batch_size: int = 100) -> Set[int]:
        """Query API to get all existing barcodes in the range"""
        existing = set()

        print(f"🔍 Scanning barcodes from {start} to {end}...")
        print(f"   This may take a while for large ranges...\n")

        # Strategy 1: Try bulk query if available
        try:
            response = requests.get(
                f"{self.base_url}/api/items/search/optimized",
                params={"q": "51", "limit": 50},
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    items = data.get("data", {}).get("items", [])
                    for item in items:
                        barcode = item.get("barcode")
                        if barcode and barcode.isdigit():
                            bc_int = int(barcode)
                            if start <= bc_int <= end:
                                existing.add(bc_int)

            # Continue with prefix-based search
            for prefix in ["51", "52"]:
                for i in range(0, 10000, batch_size):
                    try:
                        query = f"{prefix}{i:04d}"[:6]
                        response = requests.get(
                            f"{self.base_url}/api/items/search/optimized",
                            params={"q": query, "limit": batch_size, "offset": 0},
                            headers=self.headers,
                            timeout=5
                        )

                        if response.status_code == 200:
                            data = response.json()
                            if data.get("success"):
                                items = data.get("data", {}).get("items", [])
                                for item in items:
                                    barcode = item.get("barcode")
                                    if barcode and barcode.isdigit():
                                        bc_int = int(barcode)
                                        if start <= bc_int <= end:
                                            existing.add(bc_int)

                                if items:
                                    print(f"   Found {len(items)} items with prefix {query}... (Total: {len(existing)})")
                    except Exception as e:
                        continue

        except Exception as e:
            print(f"⚠️  Warning: {e}")

        return existing

    def find_missing_ranges(self, start: int, end: int, existing: Set[int]) -> List[Tuple[int, int]]:
        """Identify consecutive ranges of missing barcodes"""
        missing_ranges = []
        range_start = None

        for barcode in range(start, end + 1):
            if barcode not in existing:
                if range_start is None:
                    range_start = barcode
            else:
                if range_start is not None:
                    missing_ranges.append((range_start, barcode - 1))
                    range_start = None

        # Handle case where range extends to the end
        if range_start is not None:
            missing_ranges.append((range_start, end))

        return missing_ranges

    def generate_report(self, start: int, end: int, existing: Set[int],
                       missing_ranges: List[Tuple[int, int]], output_file: str = None):
        """Generate comprehensive report of missing barcodes"""
        total_range = end - start + 1
        existing_count = len(existing)
        missing_count = total_range - existing_count

        report_lines = [
            "=" * 80,
            "MISSING BARCODE ANALYSIS REPORT",
            "=" * 80,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Range Analyzed: {start} - {end}",
            "",
            "SUMMARY:",
            "-" * 80,
            f"Total Range Size:      {total_range:,} barcodes",
            f"Existing Barcodes:     {existing_count:,} ({existing_count/total_range*100:.2f}%)",
            f"Missing Barcodes:      {missing_count:,} ({missing_count/total_range*100:.2f}%)",
            f"Missing Ranges:        {len(missing_ranges)} consecutive gaps",
            "",
            "MISSING BARCODE RANGES:",
            "-" * 80,
        ]

        if not missing_ranges:
            report_lines.append("✅ NO MISSING BARCODES - Complete series!")
        else:
            for idx, (range_start, range_end) in enumerate(missing_ranges, 1):
                gap_size = range_end - range_start + 1
                if gap_size == 1:
                    report_lines.append(f"{idx:4d}. {range_start} (single)")
                else:
                    report_lines.append(f"{idx:4d}. {range_start} - {range_end} ({gap_size:,} barcodes)")

        report_lines.extend([
            "",
            "=" * 80,
            "RECOMMENDATIONS:",
            "-" * 80,
        ])

        if missing_count > total_range * 0.5:
            report_lines.append("⚠️  WARNING: More than 50% of barcodes are missing!")
            report_lines.append("   - Verify ERP system connection")
            report_lines.append("   - Check if data sync is working correctly")
            report_lines.append("   - Consider running full database sync")
        elif missing_count > 0:
            report_lines.append("✓ These gaps may represent:")
            report_lines.append("  - Items not yet created in the system")
            report_lines.append("  - Deleted or archived items")
            report_lines.append("  - Reserved barcode ranges for future use")
        else:
            report_lines.append("✅ Complete barcode series - all barcodes are in use!")

        report_lines.append("=" * 80)

        report_text = "\n".join(report_lines)

        # Print to console
        print("\n" + report_text)

        # Save to file if requested
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    f.write(report_text)

                    # Also write detailed list
                    if missing_ranges:
                        f.write("\n\nDETAILED MISSING BARCODES LIST:\n")
                        f.write("-" * 80 + "\n")
                        for range_start, range_end in missing_ranges:
                            if range_start == range_end:
                                f.write(f"{range_start}\n")
                            else:
                                for bc in range(range_start, range_end + 1):
                                    f.write(f"{bc}\n")

                print(f"\n📄 Report saved to: {output_file}")
            except Exception as e:
                print(f"❌ Failed to save report: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Find missing barcodes in a series",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/find_missing_barcodes.py
  python scripts/find_missing_barcodes.py --start 510001 --end 519999
  python scripts/find_missing_barcodes.py --output missing_report.txt
        """
    )

    parser.add_argument('--start', type=int, default=510001,
                       help='Start of barcode range (default: 510001)')
    parser.add_argument('--end', type=int, default=529999,
                       help='End of barcode range (default: 529999)')
    parser.add_argument('--output', type=str, default='missing_barcodes_report.txt',
                       help='Output file for report (default: missing_barcodes_report.txt)')
    parser.add_argument('--url', type=str, default='http://localhost:8001',
                       help='Backend API URL (default: http://localhost:8001)')
    parser.add_argument('--username', type=str, default='admin',
                       help='API username (default: admin)')
    parser.add_argument('--password', type=str, default='admin123',
                       help='API password (default: admin123)')

    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("BARCODE GAP ANALYSIS TOOL")
    print("=" * 80)
    print(f"Range: {args.start} - {args.end} ({args.end - args.start + 1:,} barcodes)")
    print(f"Backend: {args.url}")
    print("=" * 80 + "\n")

    # Initialize analyzer
    analyzer = BarcodeAnalyzer(base_url=args.url)

    # Login
    print("🔐 Authenticating...")
    if not analyzer.login(args.username, args.password):
        print("❌ Failed to authenticate. Check credentials and backend status.")
        return 1
    print("✅ Authentication successful\n")

    # Check system health
    try:
        response = requests.get(f"{args.url}/health", timeout=5)
        health = response.json()

        if health.get("dependencies", {}).get("sql_server", {}).get("status") != "healthy":
            print("⚠️  WARNING: SQL Server is not connected!")
            print("   The analysis will only check MongoDB cache, which may be incomplete.")
            print("   For accurate results, configure SQL Server connection.\n")
    except:
        pass

    # Get existing barcodes
    existing = analyzer.get_existing_barcodes(args.start, args.end)

    if not existing:
        print("\n⚠️  No barcodes found in the system!")
        print("   This likely means:")
        print("   - SQL Server (ERP) is not connected")
        print("   - No data has been synced to MongoDB")
        print("   - The database is empty")
        print("\n   Configure SQL Server connection and run sync first.")
        return 1

    # Find missing ranges
    print(f"\n📊 Analyzing gaps in barcode series...")
    missing_ranges = analyzer.find_missing_ranges(args.start, args.end, existing)

    # Generate report
    analyzer.generate_report(args.start, args.end, existing, missing_ranges, args.output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
