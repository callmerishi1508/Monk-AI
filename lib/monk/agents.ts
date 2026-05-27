import { ComplianceResult, ProductIntent, ProposedMutation } from "./types";

const regulatedTerms = [
  "diagnosis",
  "medical",
  "patient",
  "prescription",
  "loan approval",
  "credit score",
  "insurance underwriting",
  "legal advice",
  "crypto custody",
  "minor",
  "children",
];

export function planProductIntent(idea: string): ProductIntent {
  const lower = idea.toLowerCase();

  if (lower.includes("invoice") || lower.includes("billing") || lower.includes("payment")) {
    return {
      vertical: "invoice",
      targetUser: "Freelancers and small service businesses",
      workflow: "Create invoices, track payment status, and review outstanding revenue.",
      entities: ["Invoice", "Client", "Payment"],
      routes: ["/", "/invoices", "/api/invoices"],
      businessRequirements: [
        "Invoice records must include client, amount, due date, and payment status.",
        "Dashboard must highlight paid, pending, and overdue invoices.",
        "API route must expose invoice data for the micro-SaaS foundation.",
      ],
    };
  }

  if (lower.includes("task") || lower.includes("kanban") || lower.includes("project")) {
    return {
      vertical: "task",
      targetUser: "Startup operators and product teams",
      workflow: "Create tasks, move work across a kanban board, and track ownership.",
      entities: ["Task", "Board", "Assignee"],
      routes: ["/", "/tasks", "/api/tasks"],
      businessRequirements: [
        "Task records must include title, owner, status, priority, and due date.",
        "Dashboard must show kanban lanes for Todo, In Progress, and Done.",
        "API route must expose task data for the micro-SaaS foundation.",
      ],
    };
  }

  return {
    vertical: "generic",
    targetUser: "Early-stage startup teams",
    workflow: "Capture customer records, track operating status, and review core metrics.",
    entities: ["Customer", "Workspace", "Activity"],
    routes: ["/", "/workspace", "/api/workspace"],
    businessRequirements: [
      "Workspace records must include customer, owner, status, and next action.",
      "Dashboard must reflect the submitted startup idea in the product copy.",
      "API route must expose workspace data for the micro-SaaS foundation.",
    ],
  };
}

export function reviewCompliance(idea: string): ComplianceResult {
  const lower = idea.toLowerCase();
  const reviewedTerms = regulatedTerms.filter((term) => lower.includes(term));

  if (reviewedTerms.length > 0) {
    return {
      severity: "CRITICAL",
      approved: false,
      reviewedTerms,
      reason: `Compliance blocked execution due to regulated workflow terms: ${reviewedTerms.join(", ")}.`,
    };
  }

  if (lower.includes("finance") || lower.includes("health") || lower.includes("contract")) {
    return {
      severity: "HIGH",
      approved: true,
      reviewedTerms,
      reason: "Approved for MVP scaffolding with caution: avoid regulated decisions and keep outputs operational.",
    };
  }

  return {
    severity: "LOW",
    approved: true,
    reviewedTerms,
    reason: "Approved. No blocking regulated workflow detected for this MVP scaffold.",
  };
}

export function proposeEngineeringMutations(intent: ProductIntent, idea: string): ProposedMutation[] {
  const timestamp = new Date().toISOString();
  const commonPackage = JSON.stringify(
    {
      name: `${intent.vertical}-micro-saas-foundation`,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "16.2.6",
        react: "19.2.4",
        "react-dom": "19.2.4",
      },
      devDependencies: {
        typescript: "^5.0.0",
      },
    },
    null,
    2
  );

  if (intent.vertical === "invoice") {
    return [
      mutation("package.json", commonPackage, timestamp, "Created runnable Next.js package for invoice SaaS foundation.", "Added invoice SaaS package manifest"),
      mutation("lib/schema.ts", invoiceSchema(), timestamp, "Defined invoice, client, and payment status fields from product intent.", "Added invoice schema with payment status field"),
      mutation("app/page.tsx", invoiceDashboard(idea), timestamp, "Generated invoice dashboard copy and metrics specific to billing workflows.", "Created invoice dashboard route"),
      mutation("app/invoices/page.tsx", invoiceList(), timestamp, "Added invoice route for reviewing paid, pending, and overdue records.", "Created invoices route"),
      mutation("app/api/invoices/route.ts", invoiceApi(), timestamp, "Added invoice API handler returning business-specific sample invoice data.", "Created invoice API route"),
    ];
  }

  if (intent.vertical === "task") {
    return [
      mutation("package.json", commonPackage, timestamp, "Created runnable Next.js package for task manager SaaS foundation.", "Added task SaaS package manifest"),
      mutation("lib/schema.ts", taskSchema(), timestamp, "Defined task, board, assignee, status, and priority fields from product intent.", "Added task schema with kanban status fields"),
      mutation("app/page.tsx", taskDashboard(idea), timestamp, "Generated task dashboard copy and kanban metrics specific to project workflows.", "Created task dashboard route"),
      mutation("app/tasks/page.tsx", taskBoard(), timestamp, "Added task route with Todo, In Progress, and Done kanban lanes.", "Created kanban tasks route"),
      mutation("app/api/tasks/route.ts", taskApi(), timestamp, "Added task API handler returning business-specific sample task data.", "Created task API route"),
    ];
  }

  return [
    mutation("package.json", commonPackage, timestamp, "Created runnable Next.js package for a generic micro-SaaS foundation.", "Added generic SaaS package manifest"),
    mutation("lib/schema.ts", genericSchema(), timestamp, "Defined workspace, customer, activity, status, and next action fields.", "Added workspace schema"),
    mutation("app/page.tsx", genericDashboard(idea), timestamp, "Generated dashboard copy tied to the submitted startup idea.", "Created workspace dashboard route"),
    mutation("app/workspace/page.tsx", genericWorkspace(), timestamp, "Added workspace route for customer operating records.", "Created workspace route"),
    mutation("app/api/workspace/route.ts", genericApi(), timestamp, "Added workspace API handler returning operating records.", "Created workspace API route"),
  ];
}

function mutation(path: string, content: string, timestamp: string, reasoningSummary: string, diffSummary: string): ProposedMutation {
  return {
    path,
    content,
    timestamp,
    reasoningSummary,
    diffSummary,
    sourceAgent: "ENGINEERING_EXECUTOR",
  };
}

function invoiceSchema() {
  return `export type PaymentStatus = "paid" | "pending" | "overdue";

export type Invoice = {
  id: string;
  clientName: string;
  amountCents: number;
  dueDate: string;
  paymentStatus: PaymentStatus;
};

export const invoiceFields = ["clientName", "amountCents", "dueDate", "paymentStatus"];
`;
}

function taskSchema() {
  return `export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  owner: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
};

export const kanbanStatuses: TaskStatus[] = ["todo", "in-progress", "done"];
`;
}

function genericSchema() {
  return `export type WorkspaceRecord = {
  id: string;
  customer: string;
  owner: string;
  status: "active" | "at-risk" | "complete";
  nextAction: string;
};

export const workspaceFields = ["customer", "owner", "status", "nextAction"];
`;
}

function invoiceDashboard(idea: string) {
  return `const metrics = [
  { label: "Pending invoices", value: "$18,400" },
  { label: "Paid this month", value: "$42,900" },
  { label: "Overdue", value: "$3,200" },
];

export default function InvoiceDashboard() {
  return (
    <main>
      <h1>Invoice SaaS Command Center</h1>
      <p>${escapeForTsx(idea)}</p>
      <section>{metrics.map((metric) => <article key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></article>)}</section>
    </main>
  );
}
`;
}

function invoiceList() {
  return `const invoices = [
  { id: "INV-1001", clientName: "Northstar Studio", amount: "$4,800", paymentStatus: "pending" },
  { id: "INV-1002", clientName: "BrightOps", amount: "$9,600", paymentStatus: "paid" },
  { id: "INV-1003", clientName: "Atlas Labs", amount: "$3,200", paymentStatus: "overdue" },
];

export default function InvoicesPage() {
  return <main><h1>Invoices</h1>{invoices.map((invoice) => <div key={invoice.id}>{invoice.id} {invoice.clientName} {invoice.amount} {invoice.paymentStatus}</div>)}</main>;
}
`;
}

function invoiceApi() {
  return `import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    invoices: [
      { id: "INV-1001", clientName: "Northstar Studio", amountCents: 480000, paymentStatus: "pending", dueDate: "2026-06-15" },
      { id: "INV-1002", clientName: "BrightOps", amountCents: 960000, paymentStatus: "paid", dueDate: "2026-06-01" }
    ]
  });
}
`;
}

function taskDashboard(idea: string) {
  return `const lanes = ["Todo", "In Progress", "Done"];

export default function TaskDashboard() {
  return (
    <main>
      <h1>Task Manager Operating Board</h1>
      <p>${escapeForTsx(idea)}</p>
      <section>{lanes.map((lane) => <article key={lane}><h2>{lane}</h2><p>Kanban lane for startup execution.</p></article>)}</section>
    </main>
  );
}
`;
}

function taskBoard() {
  return `const tasks = [
  { id: "TASK-1", title: "Launch onboarding", owner: "PM", status: "todo", priority: "high" },
  { id: "TASK-2", title: "Review activation metrics", owner: "Ops", status: "in-progress", priority: "medium" },
  { id: "TASK-3", title: "Publish first workflow", owner: "Eng", status: "done", priority: "low" },
];

export default function TasksPage() {
  return <main><h1>Kanban Tasks</h1>{tasks.map((task) => <div key={task.id}>{task.title} {task.owner} {task.status} {task.priority}</div>)}</main>;
}
`;
}

function taskApi() {
  return `import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    tasks: [
      { id: "TASK-1", title: "Launch onboarding", owner: "PM", status: "todo", priority: "high", dueDate: "2026-06-05" },
      { id: "TASK-2", title: "Review activation metrics", owner: "Ops", status: "in-progress", priority: "medium", dueDate: "2026-06-08" }
    ]
  });
}
`;
}

function genericDashboard(idea: string) {
  return `export default function WorkspaceDashboard() {
  return (
    <main>
      <h1>Micro-SaaS Workspace</h1>
      <p>${escapeForTsx(idea)}</p>
      <section><article><strong>12</strong><span>Active customers</span></article><article><strong>4</strong><span>Next actions due</span></article></section>
    </main>
  );
}
`;
}

function genericWorkspace() {
  return `export default function WorkspacePage() {
  return <main><h1>Workspace Records</h1><p>Track customer status, owner, and next action.</p></main>;
}
`;
}

function genericApi() {
  return `import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    records: [
      { id: "REC-1", customer: "Acme", owner: "Founder", status: "active", nextAction: "Schedule onboarding" }
    ]
  });
}
`;
}

function escapeForTsx(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/</g, "&lt;");
}
