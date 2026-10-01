# Critical dependency remediation — 2026-10-01

This records the nine open critical Dependabot alerts reviewed on 2026-10-01 and the corresponding bounded dependency updates, plus one additional critical finding discovered by a fresh npm audit. It is a record of this remediation, not a claim that all dependencies are vulnerability-free. Current findings are tracked in [Dependabot](https://github.com/nawodyaishan/ar-fashion-tryon/security/dependabot).

## Changes

| Alerts                 | Component                              | Update                                                                                                                       | Advisory                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #326, #327, #328, #329 | Active frontend                        | Next.js 15.5.19 → 15.5.24; align eslint-config-next to 15.5.24 and regenerate pnpm lock                                      | [Windows server RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)         |
| #333                   | Active garment API                     | AnyIO 4.13.0 → 4.14.2; add a uv constraint preventing resolution below the patched version                                   | [TLS hostname handling](https://github.com/agronholm/anyio/security/advisories/GHSA-82r6-8w77-94w6)                                                                                                         |
| #212, #335             | Legacy NestJS development dependencies | @xhmikosr/decompress 10.1.0 → 10.2.2 through a Yarn resolution and regenerated lock                                          | [Archive traversal](https://github.com/XhmikosR/decompress/security/advisories/GHSA-mp2f-45pm-3cg9), [symlink-chain bypass](https://github.com/XhmikosR/decompress/security/advisories/GHSA-hrh2-vp3x-79xf) |
| #17                    | Legacy ML requirements                 | python-jose[cryptography] 3.3.0 → 3.4.0                                                                                      | [OpenSSH key algorithm confusion](https://github.com/advisories/GHSA-6c5p-j8vq-pqhj)                                                                                                                        |
| #81                    | Removed ML manifest path               | The alert names ml-backend/requirements.txt, absent from the default branch. Its relocated manifest is covered by #17 above. | Same python-jose advisory                                                                                                                                                                                   |

The Next.js patch stays on the 15.5 maintenance line. Upstream disables AVIF image optimization as part of its security mitigation; this is a deliberate behavior change described in the [security release](https://nextjs.org/blog/august-2026-security-release). The application build and mocked photo journey pass with the patch.

A fresh frontend npm audit also identified [GHSA-23hp-3jrh-7fpw](https://github.com/isaacs/node-tar/security/advisories/GHSA-23hp-3jrh-7fpw) in Tailwind build tooling. A scoped pnpm override updates `@tailwindcss/oxide > tar` from 7.4.3 to 7.5.19.

## Verification

Verified locally with Node 22.23.3, pnpm 10.13.1, Python 3.11.15, uv 0.11.1, and Yarn 1.22.22 for the legacy NestJS service:

- Fresh frontend `pnpm audit --json`: zero critical findings; high, moderate, and low findings remain outside this critical-only update.
- Frozen installation from updated pnpm and uv locks.
- `make verify workflow-check`: lint, formatting, type checking, lock freshness, secret scanning, 9 frontend tests, and 12 API tests passed.
- `make build` and `make test-e2e`: production build and Chromium photo journey passed.
- Legacy NestJS frozen Yarn installation, build, unit test, and HTTP end-to-end test passed.
- Isolated python-jose checks passed for HS256, RS256, and ES256 round trips, audience validation, and rejection of OpenSSH ECDSA public keys as HMAC secrets.
- Archive extraction checks passed for a normal TAR and containment of traversal and symlink fixtures in a disposable directory.

The API and browser suites replace model/provider boundaries. They do not validate live inference quality or hosted provider access. The legacy ML runtime was not started; its changed JWT dependency was checked in isolation, and repository search found no Python imports of jose or jwt in that service.

Dependabot recalculates alerts after the manifests reach the default branch. A removed-path alert may require closing as no longer used, with the relocation evidence recorded in the alert. No vulnerability suppression is added to application checks or dependency manifests.
