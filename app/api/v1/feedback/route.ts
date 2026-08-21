import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, message, rating, userEmail, userAddress, role } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    // In a production environment, this can be saved to PostgreSQL via Prisma
    // or dispatched to a Discord/Slack webhook.
    console.log("[User Feedback Received]:", {
      category: category || "general",
      rating: rating || 5,
      message: message.trim(),
      userEmail: userEmail || "Anonymous",
      userAddress: userAddress || "Not connected",
      role: role || "guest",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback has been recorded.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process feedback." },
      { status: 500 }
    );
  }
}
