export type Reservation = {
  currency: string;
  amount_usd: number | null;
  amount_ars: number | null;
  exchange_rate: number | null;
  cleaning_fee_ars: number | null;
  booking_commission_usd: number | null;
  booking_commission_ars: number | null;
  admin_percentage: number;
  supplies_cost_ars: number | null;
};

export function totalArs(r: Reservation): number {
  if (r.currency === "USD" && r.amount_usd && r.exchange_rate) {
    return Number(r.amount_usd) * Number(r.exchange_rate);
  }
  return Number(r.amount_ars ?? 0);
}

export function adminAmount(r: Reservation): number {
  const base = totalArs(r) - Number(r.booking_commission_ars ?? 0);
  return (base * Number(r.admin_percentage ?? 0)) / 100;
}

export function ownerNet(r: Reservation): number {
  return (
    totalArs(r) -
    Number(r.cleaning_fee_ars ?? 0) -
    Number(r.booking_commission_ars ?? 0) -
    adminAmount(r) -
    Number(r.supplies_cost_ars ?? 0)
  );
}

export function fmtARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export const PLATFORMS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking", label: "Booking" },
  { value: "direct", label: "Directa" },
  { value: "youtube", label: "Youtube" },
  { value: "other", label: "Otra" },
] as const;

export const platformColor: Record<string, string> = {
  airbnb: "bg-primary text-primary-foreground",
  booking: "bg-blue-600 text-white",
  direct: "bg-emerald-600 text-white",
  youtube: "bg-red-600 text-white",
  other: "bg-muted text-foreground",
};
