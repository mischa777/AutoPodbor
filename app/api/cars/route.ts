import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { createCar, getAllCars } from "@/lib/cars";

export async function GET() {
  const cars = await getAllCars();
  return NextResponse.json(cars);
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminRequest(request);
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const data = await request.json();
    const car = await createCar(data);
    return NextResponse.json(car, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create car" }, { status: 400 });
  }
}
