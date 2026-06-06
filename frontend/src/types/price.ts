export type PriceCheckRequest = {
  city: string;
  category: string;
  quoted_price: number;
  distance_km: number;
};

export type PriceCheckResponse = {
  city: string;
  category: string;
  quoted_price: number;
  expected_range: string;
  risk_level: string;
  overcharge_percentage: number;
  message: string;
};
