import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { deleteCar, getCarById, updateCar } from "@/lib/cars";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getCarById(id);
  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });
  return NextResponse.json(car);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminRequest(request);
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const { id } = await params;
    const data = await request.json();
    const car = await updateCar(id, data);
    return NextResponse.json(car);
  } catch {
    return NextResponse.json({ error: "Unable to update car" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminRequest(_request);
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const { id } = await params;
    await deleteCar(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete car" }, { status: 400 });
  }
}
