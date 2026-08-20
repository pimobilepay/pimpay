import { FlightTicket } from "@/components/mpay/flight-trips";
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FlightTicket id={id} />; }
