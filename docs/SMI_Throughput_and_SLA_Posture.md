# SMI Throughput and SLA Posture

## Purpose

This document defines SMI's official posture on ingestion throughput, SLA commitments, and production capacity for the current pilot phase. It provides the language to use when reviewers ask about data volume, latency, or operational guarantees.

---

## Ingestion Posture Statement

> The current prototype demonstrates deterministic validation using synthetic and JSON-backed data. Production ingestion SLAs, throughput limits, bulk-processing capacity, and retention policies would be established during a scoped technical pilot based on event volume, latency requirements, data sensitivity, and deployment architecture.

This statement should be used verbatim when addressing questions about:
- How many events per second SMI can process
- What the end-to-end ingestion latency is
- What retention periods are supported
- What throughput guarantees apply in production

---

## Metadata-first Approach Statement

> SMI does not require raw enterprise traffic for initial validation. The preferred pilot approach is metadata-first: baseline IDs, model/prompt/policy versions, tool-call metadata, guardrail events, workflow outcomes, timestamps, and selected de-identified summaries.

This statement should be used verbatim when addressing questions about:
- Whether SMI needs access to production AI traffic
- What data must be shared during a pilot
- How to handle privacy-sensitive or regulated workflows
- Minimum data requirements for a meaningful pilot result

---

## Bulk / Historical Replay Statement

> For large historical datasets, SMI would use filtering, normalization, batch replay, and customer-defined sampling windows. The goal is to process relevant continuity signals rather than unnecessary raw data.

This statement should be used verbatim when addressing questions about:
- How SMI handles existing event archives
- Whether SMI requires full event history
- How historical baselines are established
- What sampling approach is used for large datasets

---

## What the Prototype Demonstrates

The current SMI Continuity Assurance Pilot Console demonstrates:

- Deterministic validation of AI workflow state against a captured baseline anchor
- Scoring of behavioral drift using a defined deduction table (no random values)
- Normalization of 16 raw event types from 6 simulated ingestion modes
- Schema validation at the intake boundary
- Hash-chained audit ledger generation
- Drift detection with named, categorized findings
- Pilot report generation for XOps sign-off
- F5-style simulated event mapping (demonstration layer only)

---

## What a Scoped Technical Pilot Would Establish

A production-scoped technical pilot engagement would define:

| Parameter | Approach |
|-----------|----------|
| Event volume | Measured from customer's actual AI gateway and guardrail telemetry |
| Ingestion latency SLA | Defined based on use case (real-time alerting vs. batch audit) |
| Throughput capacity | Scaled to observed peak event rates with agreed headroom |
| Retention policy | Defined by customer's data governance and compliance requirements |
| Connector architecture | Metadata-only adapter vs. normalized event forwarding vs. direct API |
| Sampling strategy | Customer-defined windows for historical replay |
| Data residency | Customer cloud, on-premises, or SMI-hosted depending on requirements |

None of these parameters are claimed, assumed, or implied by the current prototype.

---

## What Is Not Claimed

The SMI Continuity Assurance Pilot does not claim:

- Terabyte-scale throughput or big-data processing capability
- Sub-millisecond ingestion latency
- 99.x% uptime or availability SLA
- Real-time enterprise stream processing guarantee
- Official integration with F5 Networks, F5 ADSP, or any F5 product
- Raw traffic inspection or full packet capture capability
- Compliance with any specific regulatory framework (SOC 2, HIPAA, GDPR, etc.) in the current prototype

These claims would require a separate scoped engagement, security review, and infrastructure assessment.

---

## F5 ADSP Disclaimer

The F5 ADSP Simulation Connector is a demonstration layer using mock event structures to illustrate how SMI could interoperate with AI gateway, guardrail, red-team, and XOps event streams. It is not an official F5 integration.

Any reference to F5-style events in this prototype uses synthetic data structured to resemble F5 ADSP telemetry for demonstration purposes only. No F5 APIs, F5 infrastructure, or F5 proprietary formats are used.
