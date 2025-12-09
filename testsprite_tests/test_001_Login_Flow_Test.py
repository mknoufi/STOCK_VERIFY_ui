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

        # Navigate to login page
        await page.goto("http://localhost:19006/login", wait_until="networkidle", timeout=60000)

        # Wait for application to fully initialize
        await page.wait_for_load_state("networkidle", timeout=30000)
        await asyncio.sleep(2)  # Additional wait for React Native Web to render

        # Perform login using helper function
        login_success = await login_user(page, role="staff", timeout=30000)
        
        if not login_success:
            raise AssertionError(
                "Test case failed: Login process did not complete successfully. Unable to authenticate user."
            )

        # Wait for successful login and navigation
        await asyncio.sleep(3)

        # --> Assertions to verify final state - check for home page or welcome message
        try:
            # Try multiple possible success indicators
            success_indicators = [
                'text="Home"',
                'text="Dashboard"',
                'text="Welcome"',
                'text="Stock Verify"',
            ]
            
            found_success = False
            for indicator in success_indicators:
                try:
                    await expect(page.locator(indicator).first).to_be_visible(timeout=10000)
                    found_success = True
                    break
                except AssertionError:
                    continue
            
            if not found_success:
                # Check if we're no longer on login page (indicates successful redirect)
                current_url = page.url
                if "/login" not in current_url:
                    found_success = True
            
            if not found_success:
                raise AssertionError(
                    "Test case failed: User authentication and login flow did not succeed as expected. The home screen or welcome message was not found after login."
                )
        except AssertionError as e:
            raise AssertionError(
                f"Test case failed: User authentication and login flow did not succeed as expected. {str(e)}"
            )
        
        await asyncio.sleep(2)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


asyncio.run(run_test())
