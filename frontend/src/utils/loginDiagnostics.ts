/**
 * Login Page Diagnostics
 * Step-by-step diagnosis tool for the login page
 */

export interface DiagnosticStep {
  step: number;
  name: string;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
  timestamp: string;
}

export class LoginDiagnostics {
  private steps: DiagnosticStep[] = [];
  private currentStep = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
  }

  addStep(name: string, status: DiagnosticStep['status'], message: string, details?: any) {
    this.currentStep++;
    const step: DiagnosticStep = {
      step: this.currentStep,
      name,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    this.steps.push(step);

    const emoji = {
      pending: '⏳',
      checking: '🔍',
      pass: '✅',
      fail: '❌',
      warn: '⚠️',
    }[status];

    __DEV__ &&
      console.log(`${emoji} [DIAG STEP ${this.currentStep}] ${name}: ${message}`, details || '');
    return step;
  }

  getSteps(): DiagnosticStep[] {
    return [...this.steps];
  }

  getSummary() {
    const passed = this.steps.filter((s) => s.status === 'pass').length;
    const failed = this.steps.filter((s) => s.status === 'fail').length;
    const warnings = this.steps.filter((s) => s.status === 'warn').length;
    const pending = this.steps.filter(
      (s) => s.status === 'pending' || s.status === 'checking'
    ).length;

    return {
      total: this.steps.length,
      passed,
      failed,
      warnings,
      pending,
      allPassed: failed === 0 && pending === 0,
    };
  }

  printSummary() {
    const summary = this.getSummary();
    __DEV__ && console.log('\n📊 === LOGIN PAGE DIAGNOSTICS SUMMARY ===');
    __DEV__ && console.log(`Total Steps: ${summary.total}`);
    __DEV__ && console.log(`✅ Passed: ${summary.passed}`);
    __DEV__ && console.log(`❌ Failed: ${summary.failed}`);
    __DEV__ && console.log(`⚠️  Warnings: ${summary.warnings}`);
    __DEV__ && console.log(`⏳ Pending: ${summary.pending}`);
    __DEV__ &&
      console.log(
        `Overall Status: ${summary.allPassed ? '✅ ALL CHECKS PASSED' : '❌ ISSUES DETECTED'}`
      );
    __DEV__ && console.log('==========================================\n');
  }

  printFullReport() {
    __DEV__ && console.log('\n📋 === FULL DIAGNOSTIC REPORT ===');
    this.steps.forEach((step) => {
      const emoji = {
        pending: '⏳',
        checking: '🔍',
        pass: '✅',
        fail: '❌',
        warn: '⚠️',
      }[step.status];
      __DEV__ && console.log(`${emoji} [${step.step}] ${step.name}`);
      __DEV__ && console.log(`   Status: ${step.status}`);
      __DEV__ && console.log(`   Message: ${step.message}`);
      if (step.details) {
        __DEV__ && console.log(`   Details:`, step.details);
      }
      __DEV__ && console.log(`   Time: ${step.timestamp}`);
      __DEV__ && console.log('');
    });
    this.printSummary();
  }
}

// Global diagnostic instance
export const loginDiagnostics = new LoginDiagnostics();

// Diagnostic checks
export async function diagnoseComponentMount(platform: string) {
  loginDiagnostics.addStep(
    'Component Mount',
    'checking',
    'Checking if login component is mounting...',
    { platform }
  );

  // Check if we're in a browser environment
  if (platform === 'web') {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      loginDiagnostics.addStep('Browser Environment', 'pass', 'Browser environment detected', {
        hasWindow: true,
        hasDocument: true,
      });
    } else {
      loginDiagnostics.addStep(
        'Browser Environment',
        'fail',
        'Browser environment not properly initialized',
        { hasWindow: typeof window !== 'undefined', hasDocument: typeof document !== 'undefined' }
      );
    }
  } else {
    loginDiagnostics.addStep('Mobile Environment', 'pass', 'Mobile platform detected', {
      platform,
    });
  }
}

export function diagnoseFormValidation(values: any, errors: any, touched: any) {
  loginDiagnostics.addStep(
    'Form Validation Setup',
    'checking',
    'Checking form validation state...',
    { hasValues: !!values, hasErrors: !!errors, hasTouched: !!touched }
  );

  if (values && typeof values === 'object') {
    loginDiagnostics.addStep('Form Values', 'pass', 'Form values initialized', {
      fields: Object.keys(values),
    });
  } else {
    loginDiagnostics.addStep('Form Values', 'fail', 'Form values not initialized', {});
  }

  if (errors && typeof errors === 'object') {
    const errorCount = Object.keys(errors).filter((k) => errors[k]).length;
    if (errorCount === 0) {
      loginDiagnostics.addStep('Form Errors', 'pass', 'No validation errors', {});
    } else {
      loginDiagnostics.addStep('Form Errors', 'warn', `Found ${errorCount} validation error(s)`, {
        errors,
      });
    }
  }
}

export function diagnoseInputFields(platform: string) {
  if (platform !== 'web') {
    loginDiagnostics.addStep(
      'Input Fields (Mobile)',
      'pass',
      'Mobile platform - inputs handled natively',
      {}
    );
    return;
  }

  loginDiagnostics.addStep(
    'Input Fields (Web)',
    'checking',
    'Checking input field accessibility...',
    {}
  );

  setTimeout(() => {
    if (typeof document !== 'undefined') {
      const usernameInput = document.querySelector(
        'input[placeholder*="Username" i], input[autocomplete="username"]'
      );
      const passwordInput = document.querySelector(
        'input[type="password"], input[autocomplete="current-password"]'
      );

      if (usernameInput) {
        const styles = window.getComputedStyle(usernameInput as Element);
        loginDiagnostics.addStep('Username Input', 'pass', 'Username input found', {
          pointerEvents: styles.pointerEvents,
          userSelect: styles.userSelect,
          cursor: styles.cursor,
        });
      } else {
        loginDiagnostics.addStep('Username Input', 'fail', 'Username input not found in DOM', {});
      }

      if (passwordInput) {
        const styles = window.getComputedStyle(passwordInput as Element);
        loginDiagnostics.addStep('Password Input', 'pass', 'Password input found', {
          pointerEvents: styles.pointerEvents,
          userSelect: styles.userSelect,
          cursor: styles.cursor,
        });
      } else {
        loginDiagnostics.addStep('Password Input', 'fail', 'Password input not found in DOM', {});
      }
    }
  }, 500);
}

export function diagnoseEventHandlers(platform: string) {
  if (platform !== 'web') {
    return;
  }

  loginDiagnostics.addStep('Event Handlers', 'checking', 'Checking web event handlers...', {});

  if (typeof document !== 'undefined') {
    // Check if selectstart handler is registered
    // Note: We can't directly check event listeners, but we can verify the CSS is injected
    const styleElement = document.getElementById('login-web-styles');
    if (styleElement) {
      loginDiagnostics.addStep('CSS Injection', 'pass', 'Web-specific CSS styles injected', {
        styleId: 'login-web-styles',
      });
    } else {
      loginDiagnostics.addStep('CSS Injection', 'fail', 'Web-specific CSS styles not found', {});
    }
  }
}

export async function diagnoseNetworkConnectivity() {
  loginDiagnostics.addStep(
    'Network Connectivity',
    'checking',
    'Checking backend connectivity...',
    {}
  );

  try {
    const { getBackendURL } = await import('../utils/backendUrl');
    const backendUrl = await getBackendURL();
    const apiUrl = `${backendUrl}/api/health`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      await response.json();
      loginDiagnostics.addStep('Backend Health', 'pass', 'Backend is reachable and healthy', {
        url: backendUrl,
        status: response.status,
      });
    } else {
      loginDiagnostics.addStep(
        'Backend Health',
        'warn',
        'Backend responded but with non-OK status',
        { url: backendUrl, status: response.status }
      );
    }
  } catch (error: any) {
    loginDiagnostics.addStep('Backend Health', 'fail', 'Cannot connect to backend', {
      error: error.message,
      type: error.name,
    });
  }
}

export function diagnoseAuthState(user: any, isLoading: boolean) {
  loginDiagnostics.addStep('Auth State', 'checking', 'Checking authentication state...', {
    hasUser: !!user,
    isLoading,
  });

  if (isLoading) {
    loginDiagnostics.addStep('Auth Loading', 'checking', 'Authentication state is loading...', {});
  } else {
    loginDiagnostics.addStep('Auth Loading', 'pass', 'Authentication state loaded', {});
  }

  if (user) {
    loginDiagnostics.addStep(
      'User Session',
      'warn',
      'User is already logged in - should redirect',
      { username: user.username, role: user.role }
    );
  } else {
    loginDiagnostics.addStep(
      'User Session',
      'pass',
      'No active user session - login page is appropriate',
      {}
    );
  }
}

export function diagnoseRedirectLogic(segments: string[], user: any, platform: string) {
  loginDiagnostics.addStep('Redirect Logic', 'checking', 'Checking redirect logic...', {
    segments,
    hasUser: !!user,
    platform,
  });

  const currentRoute = segments[0];
  const isLoginPage = currentRoute === 'login';

  if (user && isLoginPage) {
    loginDiagnostics.addStep(
      'Redirect Needed',
      'warn',
      'User is logged in but on login page - redirect should occur',
      { currentRoute, userRole: user.role }
    );
  } else if (!user && isLoginPage) {
    loginDiagnostics.addStep(
      'Redirect Status',
      'pass',
      'No user and on login page - correct state',
      {}
    );
  }
}

// Run full diagnostic suite
export async function runFullDiagnostics(
  platform: string,
  values: any,
  errors: any,
  touched: any,
  user: any,
  isLoading: boolean,
  segments: string[]
) {
  __DEV__ && console.log('\n🔍 === STARTING LOGIN PAGE DIAGNOSTICS ===\n');
  loginDiagnostics.reset();

  // Step 1: Component mounting
  await diagnoseComponentMount(platform);

  // Step 2: Form validation
  diagnoseFormValidation(values, errors, touched);

  // Step 3: Input fields
  diagnoseInputFields(platform);

  // Step 4: Event handlers
  diagnoseEventHandlers(platform);

  // Step 5: Network connectivity
  await diagnoseNetworkConnectivity();

  // Step 6: Auth state
  diagnoseAuthState(user, isLoading);

  // Step 7: Redirect logic
  diagnoseRedirectLogic(segments, user, platform);

  // Print summary
  loginDiagnostics.printSummary();

  return loginDiagnostics.getSteps();
}
