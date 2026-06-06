import type { LocationWarningRequest, LocationWarningResponse } from "../types/location";
import type { PickupOptimizeRequest, PickupOptimizeResponse } from "../types/pickup";
import type { PriceCheckRequest, PriceCheckResponse } from "../types/price";
import type { RouteCheckRequest, RouteCheckResponse } from "../types/route";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type ValidationError = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

type ApiErrorPayload = {
  detail?: string | ValidationError[];
};

export class ApiError extends Error {
  status: number;
  details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function formatValidationError(error: ValidationError): string {
  const field = error.loc?.filter((part) => part !== "body").join(".") ?? "request";
  return `${field}: ${error.msg ?? "Invalid value"}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    return new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  if (Array.isArray(payload.detail)) {
    const details = payload.detail.map(formatValidationError);
    return new ApiError("Please fix the highlighted API validation errors.", response.status, details);
  }

  if (typeof payload.detail === "string") {
    return new ApiError(payload.detail, response.status);
  }

  return new ApiError(`Request failed with status ${response.status}`, response.status);
}

async function postJson<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as TResponse;
}

export function checkPrice(payload: PriceCheckRequest): Promise<PriceCheckResponse> {
  return postJson<PriceCheckRequest, PriceCheckResponse>("/check-price", payload);
}

export function checkRoute(payload: RouteCheckRequest): Promise<RouteCheckResponse> {
  return postJson<RouteCheckRequest, RouteCheckResponse>("/check-route", payload);
}

export function checkLocationWarning(
  payload: LocationWarningRequest,
): Promise<LocationWarningResponse> {
  return postJson<LocationWarningRequest, LocationWarningResponse>("/location-warning", payload);
}

export function optimizePickup(
  payload: PickupOptimizeRequest,
): Promise<PickupOptimizeResponse> {
  return postJson<PickupOptimizeRequest, PickupOptimizeResponse>("/optimize-pickup", payload);
}
