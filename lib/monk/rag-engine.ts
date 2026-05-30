import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

// Force Next.js to invalidate its cache and recompile
// (Turbopack was stuck caching the old broken import)
// Dummy documents to simulate our highly-curated backend data
const KNOWLEDGE_BASE = [
  { id: "1", text: "SEC Compliance 2024: All FinTech startups handling user funds must implement KYC/AML protocols compliant with the Bank Secrecy Act and use SOC2 certified infrastructure.", metadata: { category: "legal", domain: "fintech" } },
  { id: "2", text: "HIPAA Guidelines 2024: HealthTech platforms must enforce end-to-end encryption for all PHI (Protected Health Information) and maintain audit logs for 6 years.", metadata: { category: "legal", domain: "healthtech" } },
  { id: "3", text: "SaaS Market Report Q3: The median CAC for B2B SaaS is $1,200. Projected LTV:CAC ratio should be at least 3:1. Average enterprise contract ACV is $25,000.", metadata: { category: "finance", domain: "saas" } },
  { id: "4", text: "Web3 Regulatory Update: Token offerings are increasingly classified as securities. Startups must prepare a Reg D or Reg A+ exemption filing.", metadata: { category: "legal", domain: "web3" } },
  { id: "5", text: "E-Commerce Finance Benchmarks: Average gross margin is 45%. Shipping and fulfillment logistics account for 15% of COGS.", metadata: { category: "finance", domain: "ecommerce" } }
];

let vectorStore: MemoryVectorStore | null = null;

async function initVectorStore(apiKey: string) {
  if (vectorStore) return vectorStore;

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
  });

  vectorStore = await MemoryVectorStore.fromTexts(
    KNOWLEDGE_BASE.map(doc => doc.text),
    KNOWLEDGE_BASE.map(doc => doc.metadata),
    embeddings
  );
  return vectorStore;
}

export async function queryRAG(query: string, apiKey: string | undefined, isOffline = false): Promise<string> {
  if (isOffline || !apiKey || apiKey === "mock") {
    return "MOCK RAG RETRIEVAL: [Offline Demo Mode] Live embedding bypassed. Injecting deterministic compliance and financial constants.";
  }

  try {
    const store = await initVectorStore(apiKey);
    const results = await store.similaritySearch(query, 2);
    if (!results || results.length === 0) return "No specific vector knowledge found.";
    return results.map((r, i) => `[Vector Source ${i + 1}]: ${r.pageContent}`).join("\n\n");
  } catch (e) {
    console.error("RAG Embedding Error:", e);
    // If the embedding fails (e.g. invalid API key or lack of quota for ada-002), we gracefully fallback.
    return "MOCK RAG RETRIEVAL: Embedding API unavailable. Injecting deterministic compliance and financial constants.";
  }
}
