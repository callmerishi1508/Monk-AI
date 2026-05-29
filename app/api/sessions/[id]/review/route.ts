import { NextRequest, NextResponse } from "next/server";
import { reviewDocument } from "@/lib/monk/orchestrator";
import { z } from "zod";

const Schema = z.object({
  action: z.enum(["APPROVE", "MODIFY", "REFRAME"]),
  modifications: z.string().optional(),
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

    const session = await reviewDocument(id, parsed.data);
    return NextResponse.json({ session });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
