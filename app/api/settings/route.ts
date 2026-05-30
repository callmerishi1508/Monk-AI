import { NextRequest, NextResponse } from "next/server";
import { configureOpenAI } from "@/lib/monk/agents";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, baseUrl, geminiKey } = await req.json();
    configureOpenAI(apiKey, baseUrl, geminiKey);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
