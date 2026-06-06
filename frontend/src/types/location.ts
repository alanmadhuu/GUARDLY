export type LocationWarningRequest = {
  city: string;
  location_name: string;
};

export type ScamWarning = {
  scam_type: string;
  risk_level: string;
  warning_message: string;
};

export type LocationWarningResponse = {
  city: string;
  location_name: string;
  risk_score: number;
  warnings: ScamWarning[];
};
