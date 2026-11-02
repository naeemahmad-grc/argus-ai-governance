# ARGUS — Agentic AI Governance Platform

**Live demo: [Launch ARGUS](https://claude.ai/public/artifacts/cef37607-191d-4aae-8c6b-4e58d90736a3) — runs in the browser, no install required.

ARGUS is an MVP exploring what enterprise governance tooling for AI agents should look like: a single control plane to inventory deployed agents, enforce behavioral policies, track violations, and surface risk — before an autonomous agent becomes an incident.

> Named for Argus Panoptes, the hundred-eyed watchman of Greek myth. All data in the demo is synthetic.

## What it does

- **Dashboard** — fleet-level KPIs (active agents, framework coverage, critical risk, control gaps), a Risk Field bubble view where bubble size scales with each agent's risk score, and a live alert feed.
- **Agent Registry** — directory of all deployed AI agents with a description, model, department, owner, autonomy level, status and risk, filterable by risk, status and framework scope. Each agent's characteristics (decisions about people, personal or health data, EU use, tool access, code execution and so on) drive transparent rules that map it to the frameworks and policies that apply, with the reason for each. Mappings that don't fit can be excluded with a logged justification, and missing controls can be created from a template in place. The rules live in `src/agentMapping.js`.
- **Policy Engine** — governance rules with enforcement actions (BLOCK, REQUIRE APPROVAL, WARN, AUDIT), including AI-specific controls for prompt injection, tool scope, secret leakage, rogue-agent suspension and third-party model vetting. Each policy's framework tags come from the requirement crosswalk.
- **Policy lifecycle** — each policy has an owner and an approver chosen from governance roles, an optional uploaded policy document, and a draft or approved status. Drafts don't count toward coverage until approved, and the approver must differ from the owner.
- **Policy templates** — downloadable Word templates for every recommended control, plus a general template, each with document control, policy statements, roles, enforcement, evidence to retain, framework mapping and approval sign-off. Generated from the catalog by `scripts/generate-templates.mjs`.
- **Frameworks** — requirement-to-control traceability across 14 frameworks. Each requirement shows the policies and platform capabilities that satisfy it; every gap comes with a recommended control (the policy to add, its enforcement action, the evidence to retain, and which other gaps it closes), added and mapped in one click. A ranked plan shows which recommendations close the most gaps across frameworks.
- **Audit Trail** — log of every platform event (registrations, policy changes, control mappings, violations) with CSV export.
- **Risk Radar** — polar view where distance from center is aggregated risk, sectors are departments, and agents drifting past the critical threshold ring pulse for attention. A grid view is available for raw score scanning.

The demo walks through a full governance loop: FinanceBot Alpha commits three critical policy violations in a six-hour window and is automatically suspended, with every step recorded in the audit trail.

## Frameworks covered

| Group | Frameworks |
|---|---|
| AI regulation | EU AI Act; US regulatory guidance (Colorado SB 26-189, NYC Local Law 144, sector rules) |
| AI standards & principles | NIST AI RMF, ISO/IEC 42001, OECD AI Principles |
| AI security & threats | OWASP Top 10 for LLM Applications (2025), OWASP Top 10 for Agentic Applications (2026), CSA AI Controls Matrix, CSA AI Security Maturity Model, MITRE ATLAS |
| Security & privacy baseline | ISO/IEC 27001, SOC 2, GDPR, HIPAA |

Each framework lists a curated set of requirements relevant to governing AI agents, not the full text. A requirement counts as covered when an enabled policy or an always-on platform capability maps to it. The catalog lives in `src/frameworks.js`.

The app is responsive: on phones the sidebar becomes a slide-out menu, tables become cards, and the visualizations resize their labels.

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

- EU AI Act risk-tier classification per agent (prohibited / high-risk / limited / minimal)
- Risk velocity trails on the radar (direction and speed of score changes)
- Real enforcement integration via policy-as-code (OPA)

---

Built by Naeem Ahmad · [LinkedIn](https://www.linkedin.com/in/naeemahmad1)
