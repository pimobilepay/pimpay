import type { Metadata } from "next";
import { FlightSearch } from "@/components/mpay/flight-search";

export const metadata: Metadata = {
  title: "Flight Tickets | PIMOBIPAY",
  description: "Search flights worldwide from PiMobiPay.",
};

export default function FlightsPage() {
  return <FlightSearch />;
}
