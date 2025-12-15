import { test, expect } from "@playwright/test";

test.describe("Core User Flow", () => {
  test("Login -> Create Session -> Scan -> Verify", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    // Debug Network & Errors
    page.on("requestfailed", (request) =>
      console.log(`Request failed: ${request.url()} ${request.failure()?.errorText}`),
    );
    page.on("pageerror", (exception) => console.log(`Page Error: ${exception}`));
    page.on("console", (msg) => console.log(`Browser console: ${msg.text()}`));

    // 1. Navigation
    console.log("Navigating to / ...");
    await page.goto("/");

    // Check for Welcome, Login, or Home
    // App initialization logs confirmed it loads.
    // Proceed directly to element detection.

    // Check for Welcome, Login, or Home
    const welcomeTitle = page.getByText("Lavanya E-Mart", { exact: true });
    const signInButton = page.getByRole("button", { name: "Sign In" });
    const newCountArea = page.getByText("New Count Area", { exact: true });

    // Wait for any to appear
    // Verify app rendered something
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 10000 });

    const rootHtml = await page.locator("#root").innerHTML();
    console.log("Root HTML:", rootHtml.substring(0, 1000));

    try {
      await Promise.race([
        welcomeTitle.waitFor({ state: "visible", timeout: 10000 }),
        signInButton.waitFor({ state: "visible", timeout: 10000 }),
        newCountArea.waitFor({ state: "visible", timeout: 10000 }),
      ]);
    } catch (e) {
      console.log("Timeout waiting for specific elements");
      console.log("Timeout waiting for initial meaningful paint");
      console.log(
        "Subtitle:",
        await page
          .locator("title")
          .innerText()
          .catch(() => "No title tag"),
      );
      const body = await page.evaluate(() => document.body.innerHTML);
      console.log("Body HTML:", body.substring(0, 1000));
      const scripts = await page.evaluate(() =>
        Array.from(document.querySelectorAll("script")).map((s) => s.src),
      );
      console.log("Scripts:", scripts);
    }

    if (await newCountArea.isVisible()) {
      console.log("Already logged in");
    } else {
      if (await welcomeTitle.isVisible()) {
        console.log("On Welcome Screen");
        await page.getByText("Get Started").click();
        // Wait for Login screen
        await expect(signInButton).toBeVisible();
      } else {
        console.log("Logging in from Login Screen...");
        // Ensure inputs are visible
        await expect(signInButton).toBeVisible();
      }

      await page.getByPlaceholder("Username").fill("staff_test");
      await page.getByPlaceholder("Enter your password").fill("password");
      await signInButton.click();

      await expect(newCountArea).toBeVisible({ timeout: 10000 });
    }

    // 2. Create Session
    console.log("Creating Session...");
    await page.getByPlaceholder("e.g. 1, G").fill("F1");
    await page.getByPlaceholder("e.g. A1, B2").fill("R1");
    await page.getByText("Start Counting").click();

    // 3. Scan Screen
    console.log("Scanning...");
    await expect(page.getByText("Scan Items")).toBeVisible();

    await page.getByPlaceholder("Enter barcode or item name...").fill("513456");
    await page.keyboard.press("Enter");

    // 4. Item Details
    console.log("Verifying Details...");
    await expect(page.getByText("Item Details")).toBeVisible();
    await expect(page.getByText("513456")).toBeVisible();

    // 5. Submit Count
    console.log("Submitting Count...");
    const qtyInput = page.locator('input[value="1"]').first();
    await qtyInput.fill("10");

    page.on("dialog", async (dialog) => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.getByText("Submit Count").click();

    // Wait for navigation back to Scan Screen
    await expect(page.getByText("Scan Items")).toBeVisible();
    console.log("Flow Completed Successfully");
  });
});
