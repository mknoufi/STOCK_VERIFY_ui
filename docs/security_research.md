# Security Research: Request Signing & SSL Pinning

## Executive Summary
This document evaluates the necessity of implementing Request Signing and SSL Pinning for the Stock Verify application.

**Recommendation:**
- **SSL Pinning:** **DO NOT IMPLEMENT** at this stage.
- **Request Signing:** **DEFER** until external public access is required.

## 1. SSL Pinning

### Analysis
SSL Pinning hardcodes the backend's public key or certificate in the mobile app, ensuring it only communicates with the designated server, preventing Man-in-the-Middle (MITM) attacks.

### Pros
- High protection against MITM attacks, even if a user installs a malicious root certificate.

### Cons
- **High Maintenance:** Certificate rotation requires a mandatory app update. If the cert expires or changes on the server and the app isn't updated, the app breaks completely.
- **Expo Complexity:** Requires development builds (EAS Build) and custom config plugins. It complicates the development workflow significantly compared to Expo Go.
- **Internal Use Case:** The application is primarily designed for internal warehouse use, often on controlled networks (LAN/VPN).

### Conclusion
Given the operational risk of "bricking" the app during certificate rotation and the internal nature of the tool, standard HTTPS (TLS 1.2+) is sufficient. The complexity/risk trade-off does not favor pinning.

## 2. Request Signing (HMAC)

### Analysis
Request signing involves creating a hash (HMAC) of the request body/params using a secret key shared between client and server.

### Pros
- **Integrity:** Guarantees the request payload hasn't been tampered with.
- **Replay Protection:** Usually combined with a timestamp/nonce to prevent replay attacks.

### Cons
- **Key Management:** The client needs a secret key to sign requests. Storing this secret securely on a mobile device is difficult (white-box cryptography is hard). If the secret is extracted, the protection is void.
- **Redundancy:** We are already using short-lived JWTs (Access Tokens) over HTTPS. HTTPS provides integrity. JWTs provide authentication.

### Conclusion
Since we rely on JWTs for auth and HTTPS for transport security, Request Signing adds significant complexity for marginal gain in this specific threat model. It is better to focus on:
1. Short-lived Access Tokens (15-30 mins).
2. Secure Refresh Token rotation.
3. Proper scope/permission checks (RBAC).

## 3. Action Plan
1. **Enforce HTTPS:** Ensure the backend only accepts secure connections (or is behind a reverse proxy that does).
2. **Secure Storage:** Ensure JWTs are stored in `Expo SecureStore` (iOS Keychain / Android Keystore).
3. **Token Management:** Verify Refresh Token rotation logic is robust.
