import { NextResponse } from "next/server";
import { sessionCookieName, verifyFirebaseIdToken } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "ID token is required." }, { status: 400 });
    }

    const user = await verifyFirebaseIdToken(idToken);
    const response = NextResponse.json(user);
    response.cookies.set(sessionCookieName, idToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create session." },
      { status: 401 }
    );
  }
}
