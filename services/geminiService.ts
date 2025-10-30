import type { UploadedFile, AnalysisResult } from "../types";

export const analyzeDocuments = async (files: UploadedFile[]): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
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