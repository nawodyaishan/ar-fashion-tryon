# Security reporting

Report suspected vulnerabilities through [GitHub's private vulnerability report form](https://github.com/nawodyaishan/ar-fashion-tryon/security/advisories/new). Private reporting is enabled for this repository; the report goes to the repository maintainers.

Keep vulnerability details out of public issues, pull requests, and discussions. If you cannot access the private form, open an issue asking for a private contact method without describing the vulnerability.

## What to include

- The affected commit or version and component.
- A description of the impact and the conditions needed to reproduce it.
- Minimal reproduction steps or a proof of concept using synthetic data.
- Relevant environment details and sanitized logs.
- Suggested mitigations, if known.

Do not include working credentials, private environment files, or real user photos. If a credential was exposed, revoke or rotate it through its provider and describe the exposure without repeating the secret.

## Scope and coordination

Identify whether the report concerns the active frontend, garment API, CatVTON integration, or repository tooling. Reports about historical code in `deprecated-backends/` should name that path explicitly. For a third-party dependency, identify both the dependency and how this application is affected.

Use the private report thread to coordinate reproduction, remediation, and disclosure with maintainers. Response and fix times depend on maintainer availability and the issue's impact.

For ordinary bugs and feature requests, use the [public issue tracker](https://github.com/nawodyaishan/ar-fashion-tryon/issues).
