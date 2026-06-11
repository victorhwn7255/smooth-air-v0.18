import type { Airport, FlightEntry } from "@/lib/types";
import airportsGenerated from "./airports-generated.json";
import airportsCurated from "./airports.json";
import flightsGenerated from "./flights-generated.json";
import flightsCurated from "./flights.json";

/**
 * Combined flight/airport lookup: the curated family files always win over
 * the generated Changi database (tools/flight-db/build-sin.ts).
 */
export const FLIGHTS: Record<string, FlightEntry> = {
  ...(flightsGenerated as Record<string, FlightEntry>),
  ...(flightsCurated as Record<string, FlightEntry>),
};

export const AIRPORTS: Record<string, Airport> = {
  ...(airportsGenerated as Record<string, Airport>),
  ...(airportsCurated as Record<string, Airport>),
};

export const CURATED_FLIGHT_NOS = Object.keys(flightsCurated);
export const GENERATED_FLIGHT_COUNT = Object.keys(flightsGenerated).length;
