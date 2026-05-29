import { NextRequest, NextResponse } from "next/server";
import { answerQuestion, skipAllQuestions } from "@/lib/monk/orchestrator";
import { z } from "zod";

const Schema = z.object({
  questionId: z.string().optional(),
  answer: z.string().nullable().optional(),
  skipped: z.boolean().optional(),
  skipAll: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    if (parsed.data.skipAll) {
      const session = await skipAllQuestions(id);
      return NextResponse.json({ session });
    }

    if (!parsed.data.questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

    const session = await answerQuestion(id, {
      questionId: parsed.data.questionId,
      answer: parsed.data.answer ?? null,
      skipped: parsed.data.skipped ?? false,
    });
    return NextResponse.json({ session });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
