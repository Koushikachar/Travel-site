import { auth } from "@/auth";
import { getCountryFromCoordinates } from "@/lib/actions/geocode";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Helper to run async tasks in limited concurrency.
 * Processes `items` in batches of size `limit`.
 */
async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  while (i < items.length) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(
      batch.map((item, idx) => mapper(item, i + idx))
    );
    results.push(...batchResults);
    i += limit;
  }
  return results;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    // fetch locations for the current user's trips
    const locations = await prisma.location.findMany({
      where: {
        trip: {
          userId: session.user?.id,
        },
      },
      select: {
        locationTitle: true,
        lat: true,
        lng: true,
        trip: {
          select: {
            title: true,
          },
        },
      },
    });

    // In-request cache to avoid duplicate reverse lookups for same coords
    const cache = new Map<
      string,
      { country: string; formattedAddress: string }
    >();

    // Limit concurrency (e.g., 5 at a time). Adjust per your LocationIQ plan.
    const CONCURRENCY = 5;

    const transformedLocations = await mapWithConcurrencyLimit(
      locations,
      CONCURRENCY,
      async (loc) => {
        const key = `${loc.lat},${loc.lng}`;

        // If cached, use cached value
        if (cache.has(key)) {
          const cached = cache.get(key)!;
          return {
            name: `${loc.trip.title} - ${cached.formattedAddress}`,
            lat: loc.lat,
            lng: loc.lng,
            country: cached.country,
          };
        }

        // For safety, ensure lat/lng are present
        if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
          return {
            name: `${loc.trip.title} - Unknown location`,
            lat: loc.lat,
            lng: loc.lng,
            country: "Unknown",
          };
        }

        try {
          const geocodeResult = await getCountryFromCoordinates(
            loc.lat,
            loc.lng
          );

          // store in cache for further reuse
          cache.set(key, {
            country: geocodeResult.country,
            formattedAddress: geocodeResult.formattedAddress,
          });

          return {
            name: `${loc.trip.title} - ${geocodeResult.formattedAddress}`,
            lat: loc.lat,
            lng: loc.lng,
            country: geocodeResult.country,
          };
        } catch (err) {
          // Log the error server-side and return a graceful fallback for this location
          console.error("Reverse geocode failed for", key, err);
          return {
            name: `${loc.trip.title} - Unknown address`,
            lat: loc.lat,
            lng: loc.lng,
            country: "Unknown",
          };
        }
      }
    );

    return NextResponse.json(transformedLocations);
  } catch (err) {
    console.error("GET /locations error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
