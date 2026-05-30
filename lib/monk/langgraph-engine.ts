import { StateGraph, END, Annotation } from "@langchain/langgraph";
import type { StartupDocument } from "./types";
import { gpt } from "./agents";
import { mockTeamOutput, mockWebsiteCode } from "./mock-engine";

// Define the LangGraph State Annotation
const StateAnnotation = Annotation.Root({
  doc: Annotation<StartupDocument>(),
  iteration: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
  websiteCode: Annotation<string>({
    reducer: (x, y) => y, // Always take the newest code
    default: () => "",
  }),
  trd: Annotation<string>({
    reducer: (x, y) => y, // Always take the newest TRD
    default: () => "",
  }),
  qaFeedback: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  passedQA: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false,
  }),
});

async function developerNode(state: typeof StateAnnotation.State) {
  const { doc, iteration, qaFeedback, trd, websiteCode } = state;

  // Only write TRD on the first iteration
  const trdReq = iteration === 0
    ? gpt<{ trd: string }>(
      `You are an elite CTO with 30+ years of professional work experience. Write a TRD in clean markdown with system architecture, API design, DB schema.
Respond with JSON: { "trd": "full markdown" }`,
      `TRD for: ${doc.executiveSummary}\nStack: ${JSON.stringify(doc.techStack)}`,
      2000
    )
    : Promise.resolve({ trd });

  const codeReq = gpt<{ code: string }>(
    `You are a legendary senior full-stack engineer and visionary UI designer with 30+ years of professional work experience. Write a complete working Next.js 14 TypeScript landing page using TailwindCSS.
${iteration > 0 ? `CRITICAL QA FEEDBACK to fix: ${qaFeedback}\nFIX THE ISSUES IN THE CODE NOW.` : `DO NOT just use the standard, boring Hero -> Features -> Pricing layout. Invent a unique, highly creative layout.`}
Respond with JSON: { "code": "complete Next.js page code" }`,
    `Startup: ${doc.suggestedLabel || "Startup"}\nSummary: ${doc.executiveSummary}`,
    3000
  );

  const [trdR, webR] = await Promise.all([trdReq, codeReq]);

  return {
    websiteCode: webR.code,
    trd: trdR.trd,
    iteration: 1 // Reduces by adding 1
  };
}

async function qaNode(state: typeof StateAnnotation.State) {
  const { websiteCode } = state;

  const r = await gpt<{ passed: boolean; feedback: string }>(
    `You are an elite QA Engineer. Review this Next.js React code.
Check for: valid Tailwind classes, correct syntax, and high aesthetic quality.
If perfect, set passed: true. If flaws exist, set passed: false and write detailed feedback.
Return JSON: { "passed": boolean, "feedback": "string" }`,
    `Code to review:\n\n${websiteCode.slice(0, 4000)}`,
    1000
  );

  return {
    passedQA: r.passed,
    qaFeedback: r.feedback
  };
}

function shouldContinue(state: typeof StateAnnotation.State) {
  if (state.passedQA || state.iteration >= 2) {
    return END;
  }
  return "developer";
}

export async function runLangGraphEngineering(doc: StartupDocument, isOffline = false) {
  if (isOffline) {
    return { trd: mockTeamOutput("ENGINEERING", doc), websiteCode: mockWebsiteCode(doc) };
  }

  const workflow = new StateGraph(StateAnnotation)
    .addNode("developer", developerNode)
    .addNode("qa", qaNode)
    .addEdge("__start__", "developer") // Start edge
    .addEdge("developer", "qa")
    .addConditionalEdges("qa", shouldContinue);

  const app = workflow.compile();

  try {
    const finalState = await app.invoke({
      doc,
      iteration: 0,
      websiteCode: "",
      trd: "",
      qaFeedback: "",
      passedQA: false,
    });

    return {
      trd: finalState.trd,
      websiteCode: finalState.websiteCode,
    };
  } catch (e) {
    console.error("LangGraph Engine failed:", e);
    // Graceful fallback to mock data if the API limit or timeout hits during loop
    return { trd: mockTeamOutput("ENGINEERING", doc), websiteCode: mockWebsiteCode(doc) };
  }
}
