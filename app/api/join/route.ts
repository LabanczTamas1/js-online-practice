import { NextRequest, NextResponse } from "next/server";
import { reserveNameAndAddPlayer } from "@/lib/store";
import { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Student joins the lobby with a display name. Returns a playerId. */
export async function POST(req: NextRequest) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 24);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const playerId = randomId();
  const player: Player = { id: playerId, name, joinedAt: Date.now() };

  const reserved = await reserveNameAndAddPlayer(player);
  if (!reserved) {
    return NextResponse.json(
      { error: "That name is already taken. Please pick another." },
      { status: 409 }
    );
  }

  return NextResponse.json({ playerId, name });
}
