interface GeocodeResult {
  country: string;
  formattedAddress: string;
}

export async function getCountryFromCoordinates(
  lat: number,
  lng: number
): Promise<GeocodeResult> {
  const apiKey = process.env.LOCATIONIQ_KEY;
  if (!apiKey) throw new Error("Missing LOCATIONIQ_KEY");

  const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to contact LocationIQ");
  }

  const data = await response.json();

  // LocationIQ format
  const country = data.address?.country ?? "Unknown";
  const formattedAddress = data.display_name ?? "Unknown Address";

  return {
    country,
    formattedAddress,
  };
}
