# End-to-End Testing with Maestro

This project uses [Maestro](https://maestro.mobile.dev/) for End-to-End (E2E) testing. Maestro is a simple and effective UI testing framework for mobile apps.

## Prerequisites

1.  **Install Maestro CLI:**
    ```bash
    curl -Ls "https://get.maestro.mobile.dev" | bash
    ```

2.  **Running the App:**
    Ensure your app is running in a simulator/emulator.
    ```bash
    npm run ios  # or npm run android
    ```

## Writing Flows

Create `.yaml` files in this directory to define your test flows.

**Example: `login_flow.yaml`**

```yaml
appId: com.stockverify.app
---
- launchApp
- assertVisible: "Login"
- tapOn: "Username"
- inputText: "admin"
- tapOn: "Password"
- inputText: "admin123"
- tapOn: "Sign In"
- assertVisible: "Dashboard"
```

## Running Tests

To run a specific flow:
```bash
maestro test e2e/login_flow.yaml
```

To run all flows:
```bash
maestro test e2e/
```

## CI Integration

Maestro can be integrated into CI/CD pipelines (GitHub Actions, etc.) using Maestro Cloud or by running the CLI in a containerized environment.
