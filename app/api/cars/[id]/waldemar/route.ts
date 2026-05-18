import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebaseAdmin";
import { getCarById } from "@/lib/cars";
import { askWaldemar } from "@/lib/waldemar";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to ask Waldemar." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const car = await getCarById(id);
    if (!car) return NextResponse.json({ error: "Car not found." }, { status: 404 });

    const { question } = await request.json();
    if (!question || typeof question !== "string" || question.trim().length < 2) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const answer = await askWaldemar(car, question.trim().slice(0, 500));
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Waldemar is unavailable." },
      { status: 400 }
    );
  }
}
