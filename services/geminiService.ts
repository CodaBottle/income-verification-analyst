import type { UploadedFile, AnalysisResult } from "../types";
import { authFetch } from "../App";

export const analyzeDocuments = async (files: UploadedFile[], householdSize: number): Promise<AnalysisResult> => {
  try {
    const response = await authFetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files, householdSize }),
    });

    if (!response.ok) {
      // Try to parse as JSON first
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      } else {
        // If not JSON, get the text response for better error messages
        const errorText = await response.text();
        throw new Error(`Request failed (${response.status}): ${errorText.substring(0, 100)}`);
      }
    }

    const result: AnalysisResult = await response.json();
    return result;

  } catch (error) {
    console.error("API call to serverless function failed:", error);
    if (error instanceof Error) {
       throw new Error(`Failed to analyze documents: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the analysis service.");
  }
};