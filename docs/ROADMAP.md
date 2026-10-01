# Engineering and Platform Roadmap

Revision: R1, 2026-10-01. Planning status: approved R1; stage 1 engineering foundation implemented and reviewed.

## Direction and decisions

Build a maintainable portfolio application around the active Next.js frontend,
FastAPI garment API, and CatVTON inference integration described in
[PROJECT_SPEC.md](PROJECT_SPEC.md). The first milestone is the engineering foundation, using Makefile as the
command interface and local/CI verification as the delivery target.
No cloud budget, deployment date, or provider has been committed.

This is the canonical roadmap. It replaces the historical prototype schedule
and proposed NestJS architecture previously in this file; that content remains
in Git history. Product capabilities remain defined by PROJECT_SPEC.md.
Future platform choices below are proposals requiring their own feature review.

## Ordered outcomes

| Stage | Outcome                                                                                            | Completion evidence                                                                                                         | State                                                      |
| ----- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1     | Engineering foundation: contributor/agent guidance, Makefile, reproducible setup, hooks, tests, CI | Clean checkout passes documented local checks and equivalent PR jobs without cloud credentials or model downloads           | [Feature 001](../specs/001-engineering-foundation/spec.md) |
| 2     | Reproducible application containers and artifact supply chain                                      | CPU service containers run locally; image scans, SBOMs and signed provenance are demonstrated against immutable digests     | Future                                                     |
| 3     | Headless asynchronous inference on an external GPU provider                                        | Job contracts and recovery tested; measured quality, latency, cold starts and cost justify provider/GPU/scheduler selection | Future                                                     |
| 4     | Declarative CPU platform and GitOps                                                                | Reviewed IaC provisions an explicitly authorized environment; routing, secrets, backups and rollback demonstrated           | Future                                                     |
| 5     | Observability and reliability evidence                                                             | Queue/API/inference metrics and traces feed dashboards; measured SLIs establish SLOs and tested runbooks                    | Future                                                     |
| 6     | Portfolio delivery evidence                                                                        | Bounded load/failure experiment, model regression evidence, architecture tradeoffs and reproducible demo                    | Future                                                     |

Stage 1 is the only detailed feature in this approval package. Each later stage
gets its own spec, plan and tasks when selected. Dates and paid resources are
assigned at that stage's review, using actual capacity and budget.

## Platform design direction

The platform proposals inform stages 2–6. Price, latency, quality and version
figures require current primary sources and measurements before implementation.

- Evaluate Modal with cached weights and scale-to-zero for stage 3; benchmark
  L4/L40S and any scheduler/step reduction before selecting production defaults.
  RunPod is a candidate alternative, not an automatic failover commitment.
- Evaluate OpenTofu, a small CPU Kubernetes cluster, Argo CD and Gateway API
  for stage 4. Provider, versions, state backend and budget remain undecided.
- Add supply-chain controls incrementally: pinned CI actions now; image/model
  signing, provenance and admission verification when those artifacts exist.
- Select a small observability stack and inference-specific SLIs from measured
  traffic; establish latency targets from benchmarks before making guarantees.
- Review upstream model and dataset licenses before distributing weights or
  describing permitted deployment uses. Do not change the repository's own
  license or redistribute model weights in stage 1.

Primary references for future design validation:
[Modal GPU documentation](https://modal.com/docs/guide/gpu),
[Modal memory snapshots](https://modal.com/docs/guide/memory-snapshots),
[CatVTON upstream](https://github.com/Zheng-Chong/CatVTON), and
[Kubernetes Ingress NGINX retirement statement](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/).
Confirm current pricing, compatibility and versions when drafting each stage.

## Workflow

Use [Agentic SDD](https://github.com/nawodyaishan/agentic-sdd): draft one feature's
spec, plan and tasks; obtain one combined approval; execute one authorized
batch; verify and stop for human review. Small fixes may use the direct-fix
path. A successful check does not authorize another batch or a deployment.
