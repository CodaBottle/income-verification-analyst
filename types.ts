
export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string;
}

export interface AnalysisResult {
  isEligible: boolean;
  annualIncome: number | null;
  householdSize: number | null;
  povertyLevel: number | null;
  povertyThreshold: number | null;
  reasoning: string;
  documentType: string;
}
