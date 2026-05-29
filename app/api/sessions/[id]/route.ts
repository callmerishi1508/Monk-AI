import { NextRequest, NextResponse } from "next/server";
import { loadSession } from "@/lib/monk/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = loadSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
