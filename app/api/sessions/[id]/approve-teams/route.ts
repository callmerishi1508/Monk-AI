import { NextRequest, NextResponse } from "next/server";
import { approveTeams } from "@/lib/monk/orchestrator";
import { z } from "zod";

const Schema = z.object({
  teams: z.array(z.string()).min(1),
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

    const session = await approveTeams(id, { teams: parsed.data.teams as any });
    return NextResponse.json({ session });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
