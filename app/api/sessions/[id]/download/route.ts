import { NextRequest, NextResponse } from "next/server";
import { loadSession } from "@/lib/monk/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = loadSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const url = new URL(req.url);
    const outputType = url.searchParams.get("type");
    const teamId = url.searchParams.get("team");

    if (!outputType && !teamId) {
      const outputs = session.teamOutputs.map(o => ({
        teamId: o.teamId,
        outputType: o.outputType,
        title: o.title,
        completedAt: o.completedAt,
        wordCount: o.wordCount,
        contentLength: o.content.length,
      }));
      return NextResponse.json({ outputs, startupDocument: session.startupDocument });
    }

    const output = session.teamOutputs.find(o =>
      (!outputType || o.outputType === outputType) &&
      (!teamId || o.teamId === teamId)
    );

    if (!output) return NextResponse.json({ error: "Output not found" }, { status: 404 });

    const isCode = output.outputType === "WEBSITE_CODE";
    const ext = isCode ? ".tsx" : ".md";
    const filename = `${output.teamId.toLowerCase()}-${output.title.replace(/\s+/g, "-").toLowerCase()}${ext}`;

    return new NextResponse(output.content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
