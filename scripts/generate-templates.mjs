/*
 * Generates the downloadable policy templates in public/templates/.
 *
 * Content comes from src/frameworks.js, so each template's policy statements,
 * evidence list and framework mapping match what ARGUS shows in the app.
 *
 * Re-run after editing the catalog:
 *   npm install --no-save docx
 *   node scripts/generate-templates.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, Footer, PageNumber, TabStopType,
} from "docx";
import { RECOMMENDED_POLICIES, FRAMEWORKS } from "../src/frameworks.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "public", "templates");
fs.mkdirSync(OUT, { recursive: true });

const NAVY = "12203A", BLUE = "2F7FD1", GREY = "5B6577", LIGHT = "EEF3F9", LINE = "C9D3E0";
const FONT = "Calibri";
const W = 9360; // content width in DXA for US Letter with 1" margins

const ACTION_TEXT = {
  "BLOCK": "ARGUS blocks the agent action, or prevents activation, when this policy is not met. The event is recorded in the audit trail and the agent owner is notified.",
  "REQUIRE APPROVAL": "ARGUS holds the agent action, or activation, until an authorized approver signs off. Approvals and rejections are recorded in the audit trail.",
  "WARN": "ARGUS allows the action but flags it to the user and the agent owner, and records it in the audit trail for review.",
  "AUDIT": "ARGUS records every relevant action in the audit trail for periodic review. No action is blocked.",
};

/* ---------- small builders ---------- */
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.italics, color: o.color });
const p = (children, o = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [run(children, o)],
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 },
  alignment: o.align, numbering: o.numbering, keepNext: o.keepNext,
});
const h1 = text => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(text, { size: 28, bold: true, color: NAVY })], spacing: { before: 280, after: 120 }, keepNext: true });
const bullet = text => p([run(text)], { numbering: { reference: "bullets", level: 0 }, after: 80 });
const numbered = (text, ref) => p([run(text)], { numbering: { reference: ref, level: 0 }, after: 100 });

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (text, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders,
  shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [p([run(text, { bold: o.bold, size: o.size ?? 20, color: o.color, italics: o.italics })], { after: 0 })],
});
const table = (widths, rows, headerRow = true) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: widths,
  rows: rows.map((r, i) => new TableRow({
    tableHeader: headerRow && i === 0,
    children: r.map((t, j) => cell(t, widths[j], headerRow && i === 0 ? { bold: true, fill: LIGHT, color: NAVY } : { italics: t.startsWith("[") })),
  })),
});
const kvTable = rows => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 6560],
  rows: rows.map(([k, v]) => new TableRow({ children: [cell(k, 2800, { bold: true, fill: LIGHT, color: NAVY }), cell(v, 6560, { italics: v.startsWith("[") })] })),
});
const callout = lines => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: W, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: BLUE }, bottom: border, left: border, right: border },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F4F8FD" },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: lines.map((l, i) => p([run(l, { size: 20, bold: i === 0, color: i === 0 ? BLUE : "333333" })], { after: i === lines.length - 1 ? 0 : 60 })),
  })] })],
});

const reqRows = closeKeys => closeKeys.map(k => {
  const [fwId, i] = k.split("|");
  const f = FRAMEWORKS.find(x => x.id === fwId);
  const q = f.requirements[Number(i)];
  return [f.name, q.id, q.title];
});

/* ---------- document ---------- */
function buildDoc(t) {
  const blank = !t;
  const name = blank ? "[Policy Title]" : t.name;
  const nRef = "statements";

  const children = [
    p([run(blank ? "AI GOVERNANCE POLICY TEMPLATE" : "AI GOVERNANCE POLICY", { size: 18, bold: true, color: BLUE })], { after: 60 }),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(name, { size: 40, bold: true, color: NAVY })], spacing: { after: 80 } }),
    p([run("[Organization Name]", { size: 22, color: GREY, italics: true })], { after: 240 }),
    callout([
      "How to use this template",
      "Replace every [bracketed] field with your organization's details and review each policy statement against your environment.",
      "Route the completed draft to the approver, then upload the signed version in ARGUS (Policy Engine, Create Policy) and mark it approved. Drafts do not count toward framework coverage.",
      "Delete this box before publishing.",
    ]),
    p("", { after: 120 }),
    h1("Document control"),
    kvTable([
      ["Policy ID", "[e.g. AI-POL-007]"],
      ["Version", "1.0 (draft)"],
      ["Policy owner", blank ? "[Accountable role]" : `${t.owner} (suggested)`],
      ["Approved by", "[Approving role or committee]"],
      ["Approval date", "[YYYY-MM-DD]"],
      ["Effective date", "[YYYY-MM-DD]"],
      ["Next review date", "[Approval date + 12 months]"],
      ["Enforcement in ARGUS", blank ? "[Block / Require approval / Warn / Audit]" : t.action.charAt(0) + t.action.slice(1).toLowerCase()],
    ]),

    h1("1. Purpose"),
    p(blank ? "[Describe the risk this policy addresses and the outcome it is meant to achieve.]" : t.desc),
    p(blank ? "" : "This policy sets the minimum requirements [Organization Name] applies to AI agents to manage this risk and to demonstrate compliance with the frameworks listed in section 7."),

    h1("2. Scope"),
    p("This policy applies to all AI agents registered in [Organization Name]'s agent inventory, including agents built in-house and agents provided by third parties, and to the employees and contractors who own, operate or approve them."),
    p("[List any agents, business units or jurisdictions that are explicitly out of scope.]"),

    h1("3. Policy statements"),
    ...(blank
      ? ["[Policy statement 1. Use “must” for mandatory requirements.]", "[Policy statement 2.]", "[Policy statement 3.]"].map(s => numbered(s, nRef))
      : t.statements.map(s => numbered(s, nRef))),

    h1("4. Roles and responsibilities"),
    table([2800, 6560], [
      ["Role", "Responsibilities"],
      ["Policy owner" + (blank ? "" : ` (${t.owner})`), "Maintains this policy, monitors compliance, approves exceptions and reports on effectiveness."],
      ["AI Governance Committee", "Approves this policy and material changes to it; resolves escalations."],
      ["Agent owners", "Ensure each agent they own meets this policy before and during use, and retain the required evidence."],
      ["Internal Audit", "Independently tests the design and operating effectiveness of this control."],
    ]),

    h1("5. Enforcement"),
    p(blank ? "[Describe how the control is enforced and what happens when it is not met.]" : ACTION_TEXT[t.action]),
    p("Violations are recorded in the ARGUS audit trail. Repeated or critical violations may lead to suspension of the agent under the Auto-Suspend Rogue Agents policy and to disciplinary action under [Organization Name]'s code of conduct."),

    h1("6. Evidence to retain"),
    p("The following records demonstrate that this control is operating. Retain them for at least [three] years, or longer where law requires."),
    ...(blank ? [bullet("[Evidence item 1]"), bullet("[Evidence item 2]")] : t.evidence.split(/,\s*/).map(e => bullet(e.charAt(0).toUpperCase() + e.slice(1)))),

    h1("7. Framework mapping"),
    p(blank ? "List the framework requirements this policy satisfies. ARGUS uses this mapping to calculate coverage." : "This policy is mapped in ARGUS to the following requirements. Adopting it closes each of these gaps once the policy is approved and enabled."),
    table([3000, 1700, 4660], [["Framework", "Reference", "Requirement"], ...(blank ? [["[Framework]", "[Ref]", "[Requirement]"]] : reqRows(t.closeKeys))]),

    h1("8. Exceptions"),
    p("Exceptions must be requested in writing, include a risk assessment and compensating controls, be approved by the policy owner, and expire after no more than [12] months. Approved exceptions are recorded in ARGUS against the affected agent."),

    h1("9. Review"),
    p("The policy owner reviews this policy at least annually, and sooner after a significant incident, a material change to applicable law or regulation, or a significant change in how AI agents are used."),

    h1("Approval"),
    table([2600, 2600, 2360, 1800], [
      ["Role", "Name", "Signature", "Date"],
      ["Policy owner", "[Name]", "", "[YYYY-MM-DD]"],
      ["Approver", "[Name]", "", "[YYYY-MM-DD]"],
    ]),
    p("", { after: 120 }),
    h1("Revision history"),
    table([1300, 1800, 3660, 2600], [
      ["Version", "Date", "Summary of changes", "Approved by"],
      ["1.0", "[YYYY-MM-DD]", "Initial version", "[Approver]"],
    ]),
  ];

  return new Document({
    creator: "ARGUS", title: blank ? "AI Governance Policy Template" : t.name,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
        { reference: nRef, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "3.%1", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 620 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: W }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } },
        children: [
          run(`${blank ? "AI Governance Policy Template" : t.name}  ·  Template from ARGUS`, { size: 16, color: GREY }),
          new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
        ],
      })] }) },
      children,
    }],
  });
}

const jobs = [...RECOMMENDED_POLICIES.map(t => [t.id, t]), ["argus-policy-template", null]];
for (const [id, t] of jobs) {
  fs.writeFileSync(path.join(OUT, `${id}.docx`), await Packer.toBuffer(buildDoc(t)));
}
console.log(`Wrote ${jobs.length} templates to ${OUT}`);
