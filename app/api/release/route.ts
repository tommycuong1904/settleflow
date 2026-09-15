import { NextResponse } from "next/server";

/** Legacy money-movement endpoint disabled; use the v1 release flow. */
export async function POST(_request?: Request) {
  return NextResponse.json(
    { error: "The legacy release endpoint is disabled. Use the v1 release flow." },
    { status: 410 },
  );
}

export const dynamic = "force-dynamic";

export default POST;
