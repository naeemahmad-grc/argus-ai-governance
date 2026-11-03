# ARGUS — Agentic AI Governance Platform

**Live demo: [argus-ai-governance.vercel.app](https://argus-ai-governance.vercel.app)** — runs in the browser, no install required.

ARGUS is an MVP exploring what enterprise governance tooling for AI agents should look like: a single control plane to inventory deployed agents, enforce behavioral policies, track violations, and surface risk — before an autonomous agent becomes an incident.

> Named for Argus Panoptes, the hundred-eyed watchman of Greek myth. All data in the demo is synthetic.

## What it does

- **Dashboard** — fleet-level KPIs (active agents and gate conflicts, items needing a decision, untreated critical scenarios, mapped control coverage and requirement fulfillment), a Risk Field bubble view where bubble size scales with each agent's risk score, and an alert feed with full dates, time zone, age and each event's current state (open, resolved, historical value versus current).
- **Two assessment measures, one engine** — *mapped control coverage* (does an enabled, approved control exist for the requirement?) and *requirement fulfillment* (is there evidence it is met? Met 1, Partially met 0.5) are reported side by side with numerators, denominators, partials, exclusions, the assessment time and the method. The Dashboard, Frameworks, gap assessment and report all read the same assessment (`src/assessment.js`). Each framework is a curated subset of requirements; the figures track control readiness and are not a legal compliance determination.
- **Operating gates** — an agent's aggregate score averages its worst risks, so the worst individual scenario is shown beside it everywhere. Configurable gates check activation and continued operation (untreated critical risk, score, open critical violations). An active agent that fails a gate is flagged as a gate conflict, never switched off silently: someone fixes the blocker, approves a time-limited exception (independent approver, reason, at most 90 days) or suspends it (`src/gates.js`).
- **Needs my decision** — one queue of gate conflicts, untreated critical scenarios, pending approvals, failed or switched-off controls, and overdue reviews, ranked by severity, agents affected, how overdue and how old, each with owner, age, due date, reason and a direct next action (`src/decisions.js`).
- **Agent Registry** — directory of all deployed AI agents with a description, model, department, owner, autonomy level, status and risk, filterable by risk, status and framework scope. Each agent's characteristics (decisions about people, personal or health data, EU use, tool access, code execution and so on) drive transparent rules that map it to the frameworks and policies that apply, with the reason for each. Mappings that don't fit can be excluded with a logged justification, and missing controls can be created from a template in place. The rules live in `src/agentMapping.js`.
- **Policy Engine** — governance rules with enforcement actions (BLOCK, REQUIRE APPROVAL, WARN, AUDIT), including AI-specific controls for prompt injection, tool scope, secret leakage, rogue-agent suspension and third-party model vetting. Each policy's framework tags come from the requirement crosswalk.
- **Policy lifecycle** — each policy has an owner and an approver chosen from governance roles, an optional uploaded policy document, and a draft or approved status. Drafts don't count toward coverage until approved, and the approver must differ from the owner.
- **Policy templates** — downloadable Word templates for every recommended control, plus a general template, each with document control, policy statements, roles, enforcement, evidence to retain, framework mapping and approval sign-off. Generated from the catalog by `scripts/generate-templates.mjs`.
- **Frameworks** — requirement-to-control traceability across 14 frameworks. Each requirement shows the policies and platform capabilities that satisfy it; every gap comes with a recommended control (the policy to add, its enforcement action, the evidence to retain, and which other gaps it closes), added and mapped in one click. A ranked plan shows which recommendations close the most gaps across frameworks.
- **Risk & Gap Assessment** — an AI risk register of 22 scenarios across a 10-category taxonomy, each scored likelihood × impact on 5-point scales for inherent, residual and target risk, with treatment (mitigate, accept, transfer, avoid), owners, review dates and justified, independently approved acceptance. Inherent and residual 5×5 matrices show what the controls are worth. A requirement-by-requirement gap assessment marks each framework requirement Met, Partially met, Not met or Not applicable from the evidence, with remediation owners and target dates. Both export to CSV, and a point-in-time report prints to PDF. Scoring rules live in `src/riskLibrary.js`.
- **Agent architecture** — each agent's profile has a data-flow diagram with trust boundaries, a step-by-step workflow showing human checkpoints and the controls enforced at each step, and an AgBOM-style component inventory (based on the OWASP Agent Observability Standard) that exports to JSON. Clicking a component shows its threats and the controls that cover them. JobFit, ClaimsGuide and FinanceBot have declared architectures; the rest are generated from their characteristics (`src/architecture.js`).
- **Agent risk scores** — calculated, not entered: the average of an agent's three highest residual risks scaled to 100, plus points for policy violations on record. A control the agent has violated doesn't count toward reducing its risk until the violation is root-caused and the control re-tested; resolved violations stay in the history but stop adding points.
- **Agent lifecycle** — pending and suspended agents show a status card with a live checklist of what's blocking them and one-click fixes. The owner submits, and an independent approver activates, approves with conditions (open items due within 90 days), or returns it with a reason. A suspended agent shows when, by what and why it was suspended, and can only be reinstated once every violation is root-caused, the broken controls are re-tested, required controls are in place, high risks are treated, autonomy is reduced and the score is below critical. Reinstated agents go on 30-day probation. Every step is logged in the audit trail (`src/lifecycle.js`).
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

## What's real and what's simulated

- **Real in the browser:** every score, assessment, gate, queue item and checklist is calculated live from the current state, and every governance action is written to the audit trail.
- **Simulated:** all agents, violations, alerts and evidence are synthetic. Seeded history is dated relative to today (`src/timeline.js`). There is no backend, login or database: the signed-in user, approver roles and separation-of-duties checks are enforced only in the browser, and everything resets on refresh. Nothing is enforced at agent runtime and no telemetry integration is connected.

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
- Credit an agent's own built-in safeguards (for example JobFit's no-fabrication rule) as control evidence
- Risk velocity trails on the radar (direction and speed of score changes)
- Real enforcement integration via policy-as-code (OPA)

---

Built by Naeem Ahmad · [LinkedIn](https://www.linkedin.com/in/naeemahmad1)
