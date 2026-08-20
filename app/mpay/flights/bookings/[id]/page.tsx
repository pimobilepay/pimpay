import { FlightBookingDetails } from "@/components/mpay/flight-trips";
export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FlightBookingDetails id={id} />; }
