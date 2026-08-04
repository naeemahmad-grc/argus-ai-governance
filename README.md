# ARGUS — Agentic AI Governance Platform

**Live demo: [Launch ARGUS](https://claude.ai/public/artifacts/cef37607-191d-4aae-8c6b-4e58d90736a3) — runs in the browser, no install required.

ARGUS is an MVP exploring what enterprise governance tooling for AI agents should look like: a single control plane to inventory deployed agents, enforce behavioral policies, track violations, and surface risk — before an autonomous agent becomes an incident.

> Named for Argus Panoptes, the hundred-eyed watchman of Greek myth. All data in the demo is synthetic.

## What it does

- **Dashboard** — fleet-level KPIs (active agents, compliance score, critical risk), a Risk Field bubble view where bubble size scales with each agent's risk score, and a live alert feed.
- **Agent Registry** — directory of all deployed AI agents with model, department, owner, autonomy level, status, and risk. New agents enter as *pending* until security review.
- **Policy Engine** — governance rules with enforcement actions (BLOCK, REQUIRE APPROVAL, WARN, AUDIT), each mapped to the compliance frameworks it supports (EU AI Act, NIST AI RMF, ISO 42001, ISO 27001, SOC 2, GDPR, HIPAA). Toggling policies recalculates the compliance score.
- **Audit Trail** — immutable ledger of every platform event with CSV export.
- **Risk Radar** — polar view where distance from center is aggregated risk, sectors are departments, and agents drifting past the critical threshold ring pulse for attention. A grid view is available for raw score scanning.

The demo walks through a full governance loop: FinanceBot Alpha commits three critical policy violations in a six-hour window and is automatically suspended, with every step recorded in the audit trail.

## Why this matters

Enterprises are deploying AI agents faster than they're building the infrastructure to govern them. Most organizations still lack a systematic inventory of their AI systems — the prerequisite for every framework obligation now arriving: EU AI Act conformity, ISO 42001 certification, NIST AI RMF adoption, and US state-level laws like Colorado's AI Act. ARGUS prototypes the control layer those obligations assume exists.

## Stack

React (single-component MVP) · d3 (circle packing) · lucide-react (icons) · custom SVG visualizations · full dark/light theme system

## Running locally

```bash
npm install
npm run dev
```

## Feedback

This is an early exploration and feedback genuinely shapes it — especially from GRC, security, compliance, and platform teams. Use the in-app feedback button or open an issue.

## Roadmap ideas

- Framework coverage view (requirement-to-control traceability per framework)
- EU AI Act risk-tier classification per agent (prohibited / high-risk / limited / minimal)
- Risk velocity trails on the radar (direction and speed of score changes)
- Real enforcement integration via policy-as-code (OPA)

---

Built by Naeem Ahmad · [LinkedIn](https://www.linkedin.com/in/YOUR-HANDLE)
