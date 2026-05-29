import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/monk/orchestrator";
import { listSessions } from "@/lib/monk/storage";
import { z } from "zod";

const CreateSchema = z.object({
  idea: z.string().min(5).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
    }
    const session = await createSession(parsed.data.idea);
    return NextResponse.json({ session }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/sessions error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessions = listSessions();
    return NextResponse.json({ sessions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
