import asyncio
import sys
from pathlib import Path  # noqa: E402

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.config import settings  # noqa: E402


async def check_continuity():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
    collection = db["erp_items"]

    print(f"Checking barcode continuity in {settings.DB_NAME}.erp_items...")

    # Get all barcodes that look like numbers
    cursor = collection.find({}, {"barcode": 1, "_id": 0})
    barcodes = []
    async for doc in cursor:
        bc = doc.get("barcode")
        if bc and bc.isdigit():
            barcodes.append(int(bc))

    if not barcodes:
        print("No numeric barcodes found.")
        return

    barcodes.sort()
    min_bc = min(barcodes)
    max_bc = max(barcodes)

    print(f"Total barcodes found: {len(barcodes)}")
    print(f"Min barcode in DB: {min_bc}")
    print(f"Max barcode in DB: {max_bc}")

    barcodes_6_digit = [b for b in barcodes if 100000 <= b <= 999999]
    if barcodes_6_digit:
        print(f"Max 6-digit barcode: {max(barcodes_6_digit)}")

    start_range = 510000
    end_range = 5301000  # User's requested end range

    print(f"Checking range: {start_range} to {end_range}")

    barcode_set = set(barcodes)
    in_range = [b for b in barcodes if start_range <= b <= end_range]
    print(f"Barcodes found in this range: {len(in_range)}")

    missing = []

    # To avoid huge output, we'll find missing ranges
    current_missing_start = None

    for i in range(start_range, end_range + 1):
        if i not in barcode_set:
            if current_missing_start is None:
                current_missing_start = i
        else:
            if current_missing_start is not None:
                missing.append((current_missing_start, i - 1))
                current_missing_start = None

    if current_missing_start is not None:
        missing.append((current_missing_start, end_range))

    if not missing:
        print("No gaps found in the specified range!")
    else:
        print(f"Found {len(missing)} gaps.")

        # Save to file
        output_file = project_root / "barcode_gaps.txt"
        with open(output_file, "w") as f:
            f.write("Barcode Continuity Report\n")
            f.write(f"Range: {start_range} to {end_range}\n")
            f.write(f"Total barcodes in range: {len(in_range)}\n")
            f.write(f"Total gaps found: {len(missing)}\n\n")
            f.write("Detailed Gaps:\n")
            for start, end in missing:
                if start == end:
                    f.write(f"Missing: {start}\n")
                else:
                    f.write(f"Missing range: {start} - {end}\n")

        print(f"Detailed report saved to: {output_file}")

        # Show first few gaps in console
        print("\nFirst 10 gaps:")
        for start, end in missing[:10]:
            if start == end:
                print(f"  Missing: {start}")
            else:
                print(f"  Missing range: {start} - {end}")


if __name__ == "__main__":
    asyncio.run(check_continuity())
