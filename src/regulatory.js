/*
 * ARGUS regulatory content record
 *
 * Versioned separately from application behavior. For each framework: where it
 * comes from, what kind of instrument it is (binding law, certifiable standard,
 * voluntary guidance...), which version ARGUS uses, the dates that matter, and
 * when ARGUS last checked it. Time-sensitive claims are listed individually
 * with their verification status.
 *
 * Verification statuses
 *   verified   checked against the official text or the publisher's own page
 *   secondary  official text is paywalled or unavailable; checked against reputable secondary sources
 *   pending    not yet checked; shown in the app as "Needs review"
 *
 * Requirement titles in frameworks.js are ARGUS's short summaries for mapping
 * controls, not the official wording. ARGUS doesn't give legal advice, and
 * nothing here establishes compliance.
 */

export const CONTENT_VERSION = "2026.11.1";
export const CONTENT_REVIEWED = "2026-11-03";

export const VERIFICATION = {
  verified: { label: "Verified", detail: "Checked against the official text or the publisher's own page" },
  secondary: { label: "Checked (secondary)", detail: "Official text is paywalled or unavailable; checked against reputable secondary sources" },
  pending: { label: "Needs review", detail: "Not yet checked against a primary source" },
};

export const FORCE = {
  law: "Binding law",
  amendment: "Amending law",
  standard: "Certifiable standard (voluntary)",
  framework: "Voluntary framework",
  principles: "Intergovernmental principles (non-binding)",
  guidance: "Industry guidance (non-binding)",
  knowledge: "Threat knowledge base",
  criteria: "Attestation criteria",
};

/*
 * Per-framework record. `url` is the primary source; `dates` are the ones that
 * affect obligations; `claims` lists every time-sensitive or identifier claim
 * the app makes, with its own verification status and the source that settles it.
 */
export const REGULATORY = {
  "eu-ai-act": {
    official: "Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act)",
    publisher: "European Parliament and Council of the EU", jurisdiction: "European Union", force: "law",
    version: "Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744 (Digital Omnibus on AI, adopted July 8, 2026)",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    dates: [
      { label: "Entered into force", date: "2024-08-01" },
      { label: "Prohibitions and AI literacy (Art. 4) apply", date: "2025-02-02" },
      { label: "General-purpose AI model obligations apply", date: "2025-08-02" },
      { label: "Digital Omnibus on AI (Regulation (EU) 2026/1744) entered into force", date: "2026-07-27" },
      { label: "Transparency obligations (Art. 50) apply", date: "2026-08-02" },
      { label: "Annex III high-risk obligations apply (as amended)", date: "2027-12-02" },
      { label: "Annex I product-regulated high-risk obligations apply (as amended)", date: "2028-08-02" },
    ],
    claims: [
      { id: "eu-omnibus", text: "The Digital Omnibus on AI (Regulation (EU) 2026/1744, adopted July 8, 2026, in force July 27, 2026) moves Annex III high-risk obligations from Aug 2, 2026 to Dec 2, 2027, and Annex I product-regulated systems to Aug 2, 2028.", kind: "amendment status and dates", verification: "secondary", checkedOn: "2026-11-03", finding: "Confirmed and made more precise. The Digital Omnibus on AI is Regulation (EU) 2026/1744 of July 8, 2026, in force July 27, 2026 (EUR-Lex). The new dates, Dec 2, 2027 for Annex III and Aug 2, 2028 for Annex I, come from legal commentary on the final text; EUR-Lex's page for the act shows metadata only, so those dates are checked against secondary sources.", sources: [{ label: "EUR-Lex: Regulation (EU) 2026/1744", url: "https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=en" }, { label: "National Law Review: Digital Omnibus on AI enters into force", url: "https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force" }] },
      { id: "eu-articles", text: "Article numbers and subjects: Art. 4 AI literacy, 9 risk management, 12 record-keeping, 14 human oversight, 15 accuracy/robustness/cybersecurity, 26 deployer obligations, 27 fundamental rights impact assessment, 50 transparency.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "Article titles match. The Omnibus kept Article 4 as a duty on providers and deployers, reworded from ensuring 'to their best extent' a sufficient level of AI literacy to taking 'measures to support the development of AI literacy'; ARGUS's requirement title was updated to match.", sources: [{ label: "AI Act Explorer: table of contents", url: "https://artificialintelligenceact.eu/?p=2970" }, { label: "IAPP: AI Act literacy changes (Sept 23, 2026)", url: "https://iapp.org/news/a/eu-ai-act-literacy-changes-may-complicate-more-than-simplify-compliance" }] },
    ],
  },
  "us-guidance": {
    official: "Selected US state, local and sector requirements",
    publisher: "Various", jurisdiction: "United States (state, local and sector)", force: "law",
    version: "Colorado SB 26-189; NYC Local Law 144 of 2021; HIPAA (45 CFR 160, 164)",
    url: "https://leg.colorado.gov/bills/sb26-189",
    dates: [
      { label: "Colorado SB 26-189 signed", date: "2026-05-14" },
      { label: "Colorado SB 26-189 takes effect", date: "2027-01-01" },
      { label: "NYC Local Law 144 enforcement began", date: "2023-07-05" },
    ],
    claims: [
      { id: "co-sb189", text: "Colorado SB 26-189 (signed May 14, 2026) replaced the 2024 Colorado AI Act with a narrower automated decision-making law effective Jan 1, 2027.", kind: "enactment status and dates", verification: "secondary", checkedOn: "2026-11-03", finding: "Confirmed. The Colorado General Assembly's bill page shows SB 26-189 passed both chambers (May 7 and 9, 2026) and 'repeals and reenacts' the 2024 provisions; the May 14, 2026 signing and Jan 1, 2027 effective date come from legal commentary.", sources: [{ label: "Colorado General Assembly: SB26-189", url: "https://leg.colorado.gov/bills/SB26-189" }, { label: "National Law Review: Colorado's SB 26-189", url: "https://natlawreview.com/article/colorados-sb-26-189-understanding-new-automated-decision-making-technology-law" }] },
      { id: "co-sb189-duties", text: "SB 26-189 requires notice when automated decision-making influences a consequential decision, meaningful human review of adverse decisions on request, and retention of decision records for at least three years.", kind: "obligations", verification: "verified", checkedOn: "2026-11-03", finding: "Confirmed on the bill page: notice at the point of interaction and a plain-language explanation within 30 days of an adverse decision; a right to request meaningful human review and reconsideration; records kept for at least 3 years. The bill creates no new private right of action.", sources: [{ label: "Colorado General Assembly: SB26-189", url: "https://leg.colorado.gov/bills/SB26-189" }] },
      { id: "nyc-ll144", text: "NYC Local Law 144 requires an independent bias audit for automated employment decision tools.", kind: "obligations", verification: "secondary", checkedOn: "2026-11-03", finding: "Confirmed: employers and employment agencies must have a bias audit of automated employment decision tools conducted by an independent auditor; enforcement began July 5, 2023. The city's own page wasn't reachable from this session.", sources: [{ label: "Hunton: NYC DCWP adopts rules and sets July enforcement date", url: "https://www.hunton.com/privacy-and-cybersecurity-law-blog/2023/04/26/nyc-dcwp-adopts-rules-to-implement-law-governing-automated-employment-decision-tools-and-sets-july-enforcement-date/" }], url: "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page" },
      { id: "us-federal", text: "There is no comprehensive federal AI statute; obligations come from state laws and existing agency authority.", kind: "status", verification: "secondary", checkedOn: "2026-11-03", finding: "Confirmed as of the latest reporting found: Congress has not passed a comprehensive federal AI statute, and federal preemption of state AI laws remains a proposal.", sources: [{ label: "CFO Dive: Federal AI legislation faces 'very bleak' prospects (Mar 31, 2026)", url: "https://www.cfodive.com/news/states-rights-battle-dims-outlook-federal-ai-law/816169/" }] },
    ],
  },
  "nist-ai-rmf": {
    official: "Artificial Intelligence Risk Management Framework (AI RMF 1.0), NIST AI 100-1", publisher: "NIST", jurisdiction: "United States (voluntary)", force: "framework",
    version: "AI RMF 1.0 (January 2023); Generative AI Profile NIST AI 600-1 (July 2024)",
    url: "https://doi.org/10.6028/NIST.AI.100-1",
    dates: [{ label: "AI RMF 1.0 released", date: "2023-01-26" }, { label: "Generative AI Profile (AI 600-1) released", date: "2024-07-26" }],
    claims: [
      { id: "nist-subcats", text: "Subcategory identifiers and subjects: GOVERN 1.6, GOVERN 6.1, MAP 1.1, MEASURE 2.5, MEASURE 2.7, MEASURE 2.11, MANAGE 2.4, MANAGE 4.1.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "All eight subcategory identifiers and subjects match the AI RMF 1.0 text as reproduced by a control catalog; NIST's own playbook site wasn't reachable from this session.", sources: [{ label: "STIG Viewer: NIST AI RMF 1.0 catalog", url: "https://www.stigviewer.com/controls/ai-rmf/catalog" }] },
      { id: "nist-version", text: "AI RMF 1.0 is the current version.", kind: "version", verification: "verified", checkedOn: "2026-11-03", finding: "Confirmed: AI RMF 1.0 (Jan 26, 2023) is current. NIST says it is being revised under the White House AI Action Plan but has published no revised version. The Generative AI Profile (NIST AI 600-1) was released July 26, 2024.", sources: [{ label: "NIST: AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" }] },
    ],
  },
  "iso-42001": {
    official: "ISO/IEC 42001:2023 Information technology — Artificial intelligence — Management system", publisher: "ISO/IEC", jurisdiction: "International", force: "standard",
    version: "ISO/IEC 42001:2023", url: "https://www.iso.org/standard/42001",
    dates: [{ label: "Published", date: "2023-12-18" }],
    claims: [{ id: "iso42001-controls", text: "Clause 6.1 and Annex A controls A.5.2, A.6.2.6, A.6.2.8, A.9.2 and A.10.3 and their subjects.", kind: "identifiers", verification: "pending", checkedOn: "2026-11-03", finding: "Not settled. The standard is paywalled, and three secondary sources disagree on the Annex A titles: one matches ARGUS exactly, two give different titles for the same numbers. Left unchanged until checked against the purchased standard.", sources: [{ label: "RiskProfs: ISO 42001 Annex A controls list", url: "https://riskprofs.com/iso-42001-annex-a-controls-list/" }, { label: "Bastion: ISO 42001 Annex A controls", url: "https://bastion.tech/learn/iso42001/annex-a-controls" }] }],
  },
  "oecd": {
    official: "Recommendation of the Council on Artificial Intelligence (OECD/LEGAL/0449)", publisher: "OECD", jurisdiction: "OECD members and adherents", force: "principles",
    version: "Adopted May 2019, revised May 2024", url: "https://legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0449",
    dates: [{ label: "Adopted", date: "2019-05-22" }, { label: "Revised by the OECD Ministerial Council", date: "2024-05-03" }],
    claims: [{ id: "oecd-principles", text: "Principles 1.1 to 1.5 and their subjects, as revised in 2024.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "Principles 1.1 to 1.5 and their 2024 titles match; 1.2 is 'Respect for the rule of law, human rights and democratic values, including fairness and privacy'. Sources differ on the revision date by a day (May 2 or 3, 2024); ARGUS uses May 3, the Ministerial Council date.", sources: [{ label: "ETO AGORA: OECD AI Principles (May 2024 update)", url: "https://agora.eto.tech/instrument/1396" }, { label: "AI-Regulation.com: OECD revises its AI principles", url: "https://ai-regulation.com/oecd-revises-its-ai-principles/" }] }],
  },
  "owasp-llm": {
    official: "OWASP Top 10 for LLM Applications 2025", publisher: "OWASP GenAI Security Project", jurisdiction: "International", force: "guidance",
    version: "2025 edition", url: "https://genai.owasp.org/llm-top-10/",
    dates: [{ label: "2025 edition published", date: "2024-11-18" }],
    claims: [{ id: "owasp-llm-ids", text: "LLM01 to LLM10 names in the 2025 edition.", kind: "identifiers", verification: "verified", checkedOn: "2026-11-03", finding: "All ten LLM01:2025 to LLM10:2025 titles match the OWASP project's own source files.", sources: [{ label: "OWASP Top 10 for LLM Applications repository (2_0_vulns)", url: "https://github.com/OWASP/www-project-top-10-for-large-language-model-applications" }] }],
  },
  "owasp-agentic": {
    official: "OWASP Top 10 for Agentic Applications 2026", publisher: "OWASP GenAI Security Project", jurisdiction: "International", force: "guidance",
    version: "2026 edition", url: "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
    dates: [{ label: "Published", date: "2025-12-09" }],
    claims: [{ id: "owasp-asi-ids", text: "ASI01 to ASI10 names in the 2026 edition.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "All ten names match; the official title of ASI05 is 'Unexpected Code Execution (RCE)', now used in ARGUS. Published Dec 9, 2025. OWASP's own page wasn't reachable from this session.", sources: [{ label: "Modulos: OWASP Top 10 for Agentic Applications", url: "https://docs.modulos.ai/frameworks/owasp-top-10-agentic" }] }],
  },
  "csa-aicm": {
    official: "CSA AI Controls Matrix (AICM)", publisher: "Cloud Security Alliance", jurisdiction: "International", force: "guidance",
    version: "AICM v1.1", url: "https://cloudsecurityalliance.org/artifacts/ai-controls-matrix-v1-1",
    dates: [{ label: "v1.1 released", date: "2026-06-22" }],
    claims: [
      { id: "aicm-counts", text: "AICM v1.1 has 247 control objectives across 18 domains.", kind: "counts", verification: "verified", checkedOn: "2026-11-03", finding: "Confirmed on CSA's page: 247 control objectives across 18 security domains. Correction: v1.1 was released June 22, 2026 (ARGUS previously said July).", sources: [{ label: "CSA: AI Controls Matrix v1.1", url: "https://cloudsecurityalliance.org/artifacts/ai-controls-matrix-v1-1" }] },
      { id: "aicm-domains", text: "Domain codes and names GRC, IAM, DSP, LOG, MDS, STA, SEF, TVM.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "All eight domain codes exist among AICM's 18 domains. The domain names shown are ARGUS's short forms; the full official names are in CSA's AICM spreadsheet.", sources: [{ label: "Open Security Architecture: CSA AICM", url: "https://opensecurityarchitecture.org/frameworks/csa-aicm" }] },
    ],
  },
  "csa-aismm": {
    official: "CSA AI Security Maturity Model (AISMM)", publisher: "Cloud Security Alliance", jurisdiction: "International", force: "guidance",
    version: "Initial release (living document)", url: "https://cloudsecurityalliance.org/artifacts/ai-security-maturity-model",
    dates: [{ label: "Released", date: "2026-05-19" }],
    claims: [{ id: "aismm", text: "Released May 19, 2026 as a program-level model with five maturity levels (L1 Initial to L5 Efficient), aligned with the AI Controls Matrix; CSA describes it as a living document.", kind: "status", verification: "verified", checkedOn: "2026-11-03", finding: "Corrected. CSA released the AISMM on May 19, 2026, with five levels (L1 Initial to L5 Efficient), aligned with the AI Controls Matrix and structured like CSA's Cloud Security Maturity Model. CSA doesn't describe it as CCM-aligned or in public review, so those statements were removed; CSA calls it a living document.", sources: [{ label: "CSA: AI Security Maturity Model", url: "https://cloudsecurityalliance.org/artifacts/ai-security-maturity-model" }] }],
  },
  "mitre-atlas": {
    official: "MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems)", publisher: "MITRE", jurisdiction: "International", force: "knowledge",
    version: "Release 2026.10 (data format 6.1.0)", url: "https://github.com/mitre-atlas/atlas-data",
    dates: [{ label: "Release 2026.10 published", date: "2026-10-28" }],
    claims: [{ id: "atlas-ids", text: "Technique IDs and names: AML.T0051, AML.T0053, AML.T0085.003, AML.T0085.002, AML.T0010, AML.T0034.002, AML.T0070, AML.T0080.", kind: "identifiers", verification: "verified", checkedOn: "2026-11-03", finding: "Corrected against MITRE's ATLAS data, release 2026.10 (Oct 28, 2026). AML.T0056 'Extract LLM System Prompt' moved to AML.T0085.003 'Data from AI Services: System Instructions', AML.T0057 'LLM Data Leakage' moved to AML.T0085.002 'Data from AI Services: Conversation Context and Memory', and AML.T0010 is now 'Supply Chain Compromise'. AML.T0051, AML.T0053, AML.T0034.002, AML.T0070 and AML.T0080 are unchanged.", sources: [{ label: "MITRE ATLAS data (release 2026.10)", url: "https://github.com/mitre-atlas/atlas-data" }] }],
  },
  "iso-27001": {
    official: "ISO/IEC 27001:2022 Information security management systems — Requirements", publisher: "ISO/IEC", jurisdiction: "International", force: "standard",
    version: "ISO/IEC 27001:2022 (Annex A)", url: "https://www.iso.org/standard/27001",
    dates: [{ label: "Published", date: "2022-10-25" }],
    claims: [{ id: "iso27001-controls", text: "Annex A controls A.5.15 access control, A.5.34 privacy and protection of PII, A.8.15 logging.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "Titles match: 5.15 Access control, 5.34 Privacy and protection of PII, 8.15 Logging. The standard itself is paywalled.", sources: [{ label: "ISMS Directory: ISO 27001:2022 Annex A controls", url: "https://ismsdirectory.com/iso-27001-controls" }] }],
  },
  "soc2": {
    official: "AICPA Trust Services Criteria (TSP section 100)", publisher: "AICPA", jurisdiction: "United States (attestation)", force: "criteria",
    version: "2017 Trust Services Criteria with revised points of focus (2022)", url: "https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022",
    dates: [],
    claims: [{ id: "soc2-cc", text: "Criteria CC6.1 logical access, CC7.2 monitoring for anomalies, CC8.1 change management.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "Criteria subjects match: CC6.1 logical access security, CC7.2 monitoring of system components for anomalies, CC8.1 authorized and documented changes.", sources: [{ label: "The Art of Service: SOC 2 criteria", url: "https://compliance.theartofservice.com/frameworks/soc-2" }] }],
  },
  "gdpr": {
    official: "Regulation (EU) 2016/679 (General Data Protection Regulation)", publisher: "European Parliament and Council of the EU", jurisdiction: "European Union / EEA", force: "law",
    version: "Regulation (EU) 2016/679", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    dates: [{ label: "Applies", date: "2018-05-25" }],
    claims: [{ id: "gdpr-articles", text: "Articles 17 right to erasure, 22 automated individual decision-making, 25 data protection by design and by default, 32 security of processing.", kind: "identifiers", verification: "secondary", checkedOn: "2026-11-03", finding: "Article subjects match (Art. 22 is 'Automated individual decision-making, including profiling'). EUR-Lex wasn't reachable from this session for the consolidated text.", sources: [{ label: "GDPR Local: Article 22", url: "https://gdprlocal.com/automated-decision-making-gdpr/" }] }],
  },
  "hipaa": {
    official: "HIPAA Privacy and Security Rules, 45 CFR Parts 160 and 164", publisher: "US Department of Health and Human Services", jurisdiction: "United States (health sector)", force: "law",
    version: "45 CFR Parts 160 and 164 as currently in effect (eCFR, up to date as of July 9, 2026)", url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312",
    dates: [],
    claims: [
      { id: "hipaa-sections", text: "Sections 164.312(a)(1) access control, 164.312(b) audit controls, 164.502(b) minimum necessary.", kind: "identifiers", verification: "verified", checkedOn: "2026-11-03", finding: "164.312(a)(1) 'Standard: Access control' and 164.312(b) 'Standard: Audit controls' confirmed on eCFR (up to date as of July 9, 2026). 164.502(b) is the minimum necessary standard per HHS guidance.", sources: [{ label: "eCFR: 45 CFR 164.312", url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312" }, { label: "HHS: Minimum necessary requirement", url: "https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement" }] },
      { id: "hipaa-nprm", text: "The HIPAA Security Rule update proposed in January 2025 has not been finalized (expected July 2027); the requirements shown reflect the rule currently in effect.", kind: "rulemaking status", verification: "secondary", checkedOn: "2026-11-03", finding: "Confirmed: the Security Rule update proposed in January 2025 has not been finalized, and the regulatory agenda lists July 2027 for the final rule.", sources: [{ label: "Physicians Practice: HIPAA Security Rule postponed (July 24, 2026)", url: "https://www.physicianspractice.com/view/hipaa-security-rule-postponed-privacy-rule-imminent" }] },
    ],
  },
};

// Status of each framework's record itself (official title, version, source link and dates above)
export const RECORD_VERIFICATION = {
  "eu-ai-act": "verified", "us-guidance": "verified", "nist-ai-rmf": "verified", "iso-42001": "secondary", "oecd": "secondary",
  "owasp-llm": "verified", "owasp-agentic": "secondary", "csa-aicm": "verified", "csa-aismm": "verified", "mitre-atlas": "verified",
  "iso-27001": "secondary", "soc2": "secondary", "gdpr": "secondary", "hipaa": "verified",
};

// claims behind the risk scenarios' framework references (riskLibrary.js)
export const SCENARIO_REFERENCE_CLAIMS = [
  { id: "nist-measure-2-5", text: "NIST AI RMF MEASURE 2.5 concerns validity and reliability.", verification: "secondary", checkedOn: "2026-11-03", finding: "MEASURE 2.5: 'The AI system to be deployed is demonstrated to be valid and reliable.'", sources: [{ label: "STIG Viewer: NIST AI RMF 1.0 catalog", url: "https://www.stigviewer.com/controls/ai-rmf/catalog" }] },
  { id: "sox-itgc", text: "SOX ITGC is an ARGUS interpretation: IT general controls (access and change management) are how auditors test systems that support internal control over financial reporting under Sarbanes-Oxley section 404.", verification: "secondary", checkedOn: "2026-11-03", finding: "Reasonable as an ARGUS interpretation: IT general controls come from audit practice under section 404, not from the statute's text.", sources: [{ label: "Secureframe: SOX ITGCs", url: "https://secureframe.com/blog/sox-itgc.md" }] },
];

export const regulatoryFor = id => REGULATORY[id] || null;
export const claimsFor = id => (REGULATORY[id]?.claims || []);
// overall state for a framework: the weakest of its record and its claims
export const reviewState = id => {
  const states = [RECORD_VERIFICATION[id] || "pending", ...claimsFor(id).map(c => c.verification)];
  if (states.includes("pending")) return "pending";
  return states.every(x => x === "verified") ? "verified" : "secondary";
};
export const allClaims = () => [
  ...Object.entries(REGULATORY).flatMap(([fw, r]) => r.claims.map(c => ({ ...c, framework: fw }))),
  ...SCENARIO_REFERENCE_CLAIMS.map(c => ({ ...c, framework: "risk-scenarios" })),
];
