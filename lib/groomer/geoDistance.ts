export type DistanceResult = {
  distanceKm: number;
  source: "maps_api" | "haversine";
};

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road distance multiplier when falling back to haversine
const ROAD_MULTIPLIER = 1.3;

export async function calculateRoadDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DistanceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const origin = `${fromLat},${fromLng}`;
      const destination = `${toLat},${toLng}`;
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(origin)}` +
        `&destinations=${encodeURIComponent(destination)}` +
        `&mode=driving` +
        `&key=${apiKey}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          status: string;
          rows: Array<{
            elements: Array<{
              status: string;
              distance?: { value: number };
            }>;
          }>;
        };
        const element = data?.rows?.[0]?.elements?.[0];
        if (
          data.status === "OK" &&
          element?.status === "OK" &&
          element.distance
        ) {
          return {
            distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
            source: "maps_api",
          };
        }
      }
    } catch {
      // fall through to haversine
    }
  }

  const straight = haversineKm(fromLat, fromLng, toLat, toLng);
  return {
    distanceKm: Math.round(straight * ROAD_MULTIPLIER * 10) / 10,
    source: "haversine",
  };
}

export function calculateFuelCost(
  distanceKm: number,
  ratePerLitre: number,
  kmPerLitre = 35
): { litres: number; fuelCost: number } {
  const litres = Math.round((distanceKm / kmPerLitre) * 100) / 100;
  const fuelCost = Math.round(litres * ratePerLitre);
  return { litres, fuelCost };
}

// Client-side haversine (no API key needed in browser)
export function clientHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * ROAD_MULTIPLIER * 10) / 10;
}
