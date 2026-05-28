export type RunState =
  | "INTAKE"
  | "PLANNING"
  | "COMPLIANCE_REVIEW"
  | "BLOCKED"
  | "WAITING_APPROVAL"
  | "ENGINEERING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED";

export type AgentName =
  | "PRODUCT_MANAGER"
  | "COMPLIANCE_GATEKEEPER"
  | "ENGINEERING_EXECUTOR"
  | "HUMAN_APPROVAL"
  | "VERIFICATION"
  | "TELEMETRY"
  | "ORCHESTRATOR";

export type ComplianceSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FailureReason =
  | "FAILED_VALIDATION"
  | "FAILED_ENGINEERING"
  | "FAILED_TRANSITION"
  | "FAILED_APPROVAL";

export type ProductVertical = "invoice" | "task" | "generic";

export type Transition = {
  previousState: RunState;
  nextState: RunState;
  reason: string;
  timestamp: string;
  triggeringAgent: AgentName;
};

export type TelemetryEvent = {
  id: string;
  timestamp: string;
  agent: AgentName;
  event: string;
  detail: string;
};

export type ProductIntent = {
  vertical: ProductVertical;
  targetUser: string;
  workflow: string;
  entities: string[];
  routes: string[];
  businessRequirements: string[];
};

export type ComplianceResult = {
  severity: ComplianceSeverity;
  approved: boolean;
  reason: string;
  reviewedTerms: string[];
};

export type ProposedMutation = {
  path: string;
  content: string;
  sourceAgent: AgentName;
  timestamp: string;
  reasoningSummary: string;
  diffSummary: string;
};

export type ArtifactRecord = ProposedMutation & {
  commitId: string;
  verificationStatus: "PENDING" | "PASSED" | "FAILED";
};

export type VerificationCheckType =
  | "FILE_EXISTS"
  | "ROUTE_MATCH"
  | "SCHEMA_TERM"
  | "REQUIRED_TERM"
  | "PACKAGE_JSON"
  | "CONTENT_VALID";

export type VerificationCheck = {
  type: VerificationCheckType;
  name: string;
  passed: boolean;
  detail: string;
  expected?: string;
  actual?: string;
};

export type VerificationEvidence = {
  generatedFiles: string[];
  matchedRoutes: string[];
  matchedSchemas: string[];
  telemetrySnapshot: {
    eventCount: number;
    transitionCount: number;
    artifactCount: number;
  };
  verificationSummary: string;
  humanReadableSummary: string;
  checks: VerificationCheck[];
  passedCount: number;
  failedCount: number;
  verifiedAt: string;
};

export type ApprovalStatus = {
  required: boolean;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
};

export type MonkRun = {
  stateVersion: number;
  orchestratorVersion: string;
  runId: string;
  runLabel: string;
  runStatusMessage: string;
  lastCheckpoint?: string;
  idea: string;
  state: RunState;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  revisionCycles: number;
  maxRevisionCycles: number;
  approval: ApprovalStatus;
  productIntent?: ProductIntent;
  compliance?: ComplianceResult;
  proposedMutations: ProposedMutation[];
  artifacts: ArtifactRecord[];
  telemetry: TelemetryEvent[];
  transitions: Transition[];
  evidence?: VerificationEvidence;
  failureReason?: FailureReason;
};
