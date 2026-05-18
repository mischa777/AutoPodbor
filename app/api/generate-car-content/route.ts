import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { generateCarContent } from "@/lib/aiCarContent";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminRequest(request);
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const input = await request.json();
    const content = await generateCarContent(input);
    return NextResponse.json(content);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate content." },
      { status: 400 }
    );
  }
}
