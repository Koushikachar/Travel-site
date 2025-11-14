"use server";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./lib/prisma";

export async function createTrip(formData: FormData) {
  const session = await auth();
  if (!session || !session.user?.id) {
    throw new Error("Not auth");
  }
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const startDateStr = formData.get("startDate")?.toString();
  const imageUrl = formData.get("imageUrl")?.toString();
  const endDateStr = formData.get("endDate")?.toString();

  if (!title || !description || !startDateStr || !endDateStr || !imageUrl) {
    throw new Error("all the fields are required");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  await prisma.trip.create({
    data: {
      title,
      description,
      startDate,
      endDate,
      imageUrl,
      userId: session.user?.id,
    },
  });

  redirect("/trips");
}
