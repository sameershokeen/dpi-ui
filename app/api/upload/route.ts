import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed." },
        { status: 400 }
      );
    }

    const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 3MB limit." },
        { status: 400 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials not configured on the server. Please check your .env file." },
        { status: 500 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();

    // Sign request parameters
    // Cloudinary signature must be SHA-1 hex of: parameter1=value1&parameter2=value2<api_secret>
    // Sorted alphabetically: timestamp
    const signatureStr = `timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(signatureStr).digest("hex");

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("api_key", apiKey);
    cloudinaryFormData.append("timestamp", timestamp);
    cloudinaryFormData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: cloudinaryFormData,
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
      return NextResponse.json(
        { error: errorData.error?.message || "Cloudinary upload failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
