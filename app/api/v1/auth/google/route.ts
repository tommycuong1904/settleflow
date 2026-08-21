import { NextResponse } from "next/server";
import { deriveSmartAccountAddress } from "@/lib/auth/smart-account";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      sub?: string;
      name?: string;
      picture?: string;
    };

    if (!body.email) {
      return NextResponse.json({ error: "Missing required user email." }, { status: 400 });
    }

    const smartAccountAddress = deriveSmartAccountAddress(body.sub || body.email);

    return NextResponse.json({
      success: true,
      user: {
        email: body.email,
        name: body.name || body.email.split("@")[0],
        picture: body.picture || null,
        smartAccountAddress,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Google authentication." },
      { status: 500 }
    );
  }
}
