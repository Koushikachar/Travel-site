"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Geocode using LocationIQ (OpenStreetMap data).
 * Requires LOCATIONIQ_KEY in environment variables.
 */
async function geocodeAddress(address: string) {
  const apiKey = process.env.LOCATIONIQ_KEY;
  if (!apiKey) {
    console.error("Missing LOCATIONIQ_KEY env var");
    throw new Error("Geocoding is not available (missing LOCATIONIQ_KEY).");
  }

  // Masked logging to confirm which key is used (development only)
  console.log("LOCATIONIQ_KEY (masked):", "****" + apiKey.slice(-4));

  const url = `https://us1.locationiq.com/v1/search?key=${encodeURIComponent(
    apiKey
  )}&q=${encodeURIComponent(address)}&format=json&limit=1`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("LocationIQ fetch failed:", res.status, res.statusText, text);
    throw new Error("Failed to contact geocoding service.");
  }

  const data = await res.json().catch((err) => {
    console.error("Failed to parse LocationIQ JSON:", err);
    throw new Error("Invalid response from geocoding service.");
  });

  if (!Array.isArray(data) || data.length === 0) {
    console.error("LocationIQ returned no results for:", address, data);
    throw new Error("No results found for the given address.");
  }

  const item = data[0];
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon ?? item.lon);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    console.error("LocationIQ returned invalid coordinates:", item);
    throw new Error("Geocoding returned invalid coordinates.");
  }

  return { lat, lng };
}

export async function addLocation(formData: FormData, tripId: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const address = formData.get("address")?.toString();
  if (!address) {
    throw new Error("Missing address");
  }

  // Do work inside try/catch
  try {
    const { lat, lng } = await geocodeAddress(address);

    const count = await prisma.location.count({
      where: { tripId },
    });

    await prisma.location.create({
      data: {
        locationTitle: address,
        lat,
        lng,
        tripId,
        order: count,
      },
    });
  } catch (err: any) {
    console.error("addLocation error:", err);
    // Surface a user-friendly error (do not swallow redirect)
    throw new Error(err?.message ?? "Failed to add location");
  }

  // Call redirect OUTSIDE the try/catch so the NEXT_REDIRECT control flow isn't swallowed
  redirect(`/trips/${tripId}`);
}
