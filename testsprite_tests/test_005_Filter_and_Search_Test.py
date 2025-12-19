import asyncio
import sys
import os
from playwright import async_api
from playwright.async_api import expect

# Add test_helpers to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_helpers import login_user


async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",  # Set the browser window size
                "--disable-dev-shm-usage",  # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",  # Use host-level IPC for better stability
                "--single-process",  # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(30000)  # Increased from 5000 to 30000

        # Open a new page in the browser context
        page = await context.new_page()

        # Navigate to login page and perform authentication
        await page.goto("http://localhost:19006/login", wait_until="networkidle", timeout=60000)
        await page.wait_for_load_state("networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Perform login
        login_success = await login_user(page, role="staff", timeout=30000)

        if not login_success:
            raise AssertionError(
                "Test case failed: Login required before testing filter and search functionality."
            )

        # Navigate to scan screen where filtering/search is available
        await page.goto(
            "http://localhost:19006/staff/scan", wait_until="networkidle", timeout=60000
        )
        await page.wait_for_load_state("networkidle", timeout=30000)
        await asyncio.sleep(3)

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(
                frame.locator("text=No items found matching your filters").first
            ).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError(
                "Test case failed: The test plan to verify filtering and search functionality on the items screen did not pass as expected results were not displayed."
            )
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
