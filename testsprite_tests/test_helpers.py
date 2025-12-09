"""
Test helper functions for TestSprite tests
"""
import asyncio
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError


# Test credentials (default users from backend initialization)
TEST_CREDENTIALS = {
    "staff": {"username": "staff1", "password": "staff123"},
    "supervisor": {"username": "supervisor", "password": "super123"},
    "admin": {"username": "admin", "password": "admin123"},
}


async def login_user(
    page: Page,
    username: str = None,
    password: str = None,
    role: str = "staff",
    timeout: int = 30000,
) -> bool:
    """
    Helper function to login a user in the application.

    Args:
        page: Playwright page object
        username: Username to login (optional, uses role default if not provided)
        password: Password to login (optional, uses role default if not provided)
        role: User role (staff, supervisor, admin) - used to get default credentials
        timeout: Timeout in milliseconds for login operations

    Returns:
        bool: True if login successful, False otherwise
    """
    try:
        # Navigate to login page
        await page.goto("http://localhost:19006/login", wait_until="networkidle", timeout=timeout)

        # Wait for login form to be visible
        # Try multiple selectors for React Native Web components
        login_form_visible = False
        selectors_to_try = [
            'text="Welcome Back"',
            'text="Sign in to your account"',
            'input[placeholder*="username" i]',
            'input[placeholder*="Username" i]',
            'input[type="text"]',
        ]

        for selector in selectors_to_try:
            try:
                await page.wait_for_selector(selector, timeout=10000, state="visible")
                login_form_visible = True
                break
            except PlaywrightTimeoutError:
                continue

        if not login_form_visible:
            raise Exception("Login form not found")

        # Get credentials
        if not username or not password:
            creds = TEST_CREDENTIALS.get(role, TEST_CREDENTIALS["staff"])
            username = username or creds["username"]
            password = password or creds["password"]

        # Wait a bit for form to be fully interactive
        await asyncio.sleep(1)

        # Fill username field - try multiple selectors
        username_filled = False
        username_selectors = [
            'input[placeholder*="username" i]',
            'input[placeholder*="Username" i]',
            'input[type="text"]:first-of-type',
            'input[autocomplete="username"]',
        ]

        for selector in username_selectors:
            try:
                username_input = page.locator(selector).first
                if await username_input.is_visible(timeout=5000):
                    await username_input.fill(username)
                    username_filled = True
                    break
            except PlaywrightTimeoutError:
                continue

        if not username_filled:
            raise Exception("Username input field not found")

        # Fill password field - try multiple selectors
        password_filled = False
        password_selectors = [
            'input[type="password"]',
            'input[placeholder*="password" i]',
            'input[placeholder*="Password" i]',
            'input[autocomplete="password"]',
        ]

        for selector in password_selectors:
            try:
                password_input = page.locator(selector).first
                if await password_input.is_visible(timeout=5000):
                    await password_input.fill(password)
                    password_filled = True
                    break
            except PlaywrightTimeoutError:
                continue

        if not password_filled:
            raise Exception("Password input field not found")

        # Click login button - try multiple selectors
        login_clicked = False
        button_selectors = [
            'button:has-text("Sign In")',
            'button:has-text("Signing in")',
            'button[type="submit"]',
            'text="Sign In"',
        ]

        for selector in button_selectors:
            try:
                login_button = page.locator(selector).first
                if await login_button.is_visible(timeout=5000) and await login_button.is_enabled(timeout=5000):
                    await login_button.click()
                    login_clicked = True
                    break
            except PlaywrightTimeoutError:
                continue

        if not login_clicked:
            raise Exception("Login button not found or not enabled")

        # Wait for navigation after login (redirect to home/dashboard)
        # Wait for URL to change or for home page elements to appear
        try:
            await page.wait_for_url(
                lambda url: "/login" not in url or "/home" in url or "/dashboard" in url or "/staff" in url,
                timeout=timeout
            )
        except PlaywrightTimeoutError:
            # If URL doesn't change, wait for home page elements
            home_selectors = [
                'text="Home"',
                'text="Dashboard"',
                'text="Welcome"',
            ]
            for selector in home_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=10000, state="visible")
                    break
                except PlaywrightTimeoutError:
                    continue

        # Additional wait for app to fully load
        await asyncio.sleep(2)

        return True

    except Exception as e:
        print(f"Login failed: {str(e)}")
        return False

