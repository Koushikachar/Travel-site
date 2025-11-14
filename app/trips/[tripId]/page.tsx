import TripDetailsClients from "@/app/components/trip-details";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import React from "react";

export default async function TripDetails({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await auth();
  if (!session) {
    return <div> Please Sing in</div>;
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: session?.user?.id },
    include: { locations: true },
  });

  if (!trip) {
    return <div> Trip not found</div>;
  }

  return <TripDetailsClients trip={trip} />;
}
