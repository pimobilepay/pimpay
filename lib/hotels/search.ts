import { getHotelProvider } from "./provider";
import type { HotelSearchRequest } from "./types";

export async function searchHotels(request: HotelSearchRequest) {
  return getHotelProvider().searchHotels(request);
}
