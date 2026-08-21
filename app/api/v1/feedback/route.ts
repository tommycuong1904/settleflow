import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, message, rating, userEmail, userAddress, role, attachedImage } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    // Store feedback locally in JSON and save attached image
    console.log("[User Feedback Received]", {
      category: category || "general",
      rating: rating || 5,
      message: message.trim(),
      userEmail: userEmail || "Anonymous",
      userAddress: userAddress || "Not connected",
      role: role || "guest",
      attachedImage,
      timestamp: new Date().toISOString(),
    });

    // Write to local feedback storage
    try {
      const { appendFeedback } = await import("@/lib/local/feedback");
      await appendFeedback({
        timestamp: new Date().toISOString(),
        category: category || "general",
        rating: rating || 5,
        message: message.trim(),
        userEmail: userEmail || "Anonymous",
        userAddress: userAddress || "Not connected",
        role: role || "guest",
        attachedImagePath: attachedImage,
      });
    } catch (err) {
      console.warn("Failed to write feedback locally:", err);
    }

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
