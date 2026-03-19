import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dni = searchParams.get("dni");

  if (!dni) {
    return NextResponse.json({ error: "Falta parámetro dni" }, { status: 400 });
  }

  const token = process.env.DECOLECTA_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Token de Decolecta no configurado" },
      { status: 500 },
    );
  }

  const url = `https://api.decolecta.com/v1/reniec/dni?numero=${dni}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Error de búsqueda", detail: text },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error de búsqueda" },
      { status: 502 },
    );
  }
}

