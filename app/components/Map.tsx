import React from "react";
import { Location } from "../generated/prisma/client";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

interface MapProps {
  itineraries: Location[];
}
const Map = ({ itineraries }: MapProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY!,
  });
  if (loadError) return <div> Error loading maps</div>;
  if (!isLoaded) return <div> Loading maps...</div>;

  const center =
    itineraries.length > 0
      ? { lat: itineraries[0].lat, lng: itineraries[0].lng }
      : { lat: 0, lng: 0 };
  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      zoom={8}
      center={center}
    >
      {itineraries.map((location, key) => (
        <Marker
          key={key}
          position={{ lat: location.lat, lng: location.lng }}
          title={location.locationTitle}
        />
      ))}
    </GoogleMap>
  );
};

export default Map;
