import { GoogleGenAI, Type } from "@google/genai";
import { FEDERAL_POVERTY_LEVELS, FPL_ADDITIONAL_PERSON_AMOUNT } from '../src/constants';
import type { UploadedFile, AnalysisResult } from "../src/types";

// This is a Vercel Serverless Function
// https://vercel.com/docs/functions/serverless-functions
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { files } = request.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return response.status(400).json({ message: 'No files provided.' });
  }

  // Securely initialize GenAI on the server with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  const fplDataString = JSON.stringify(FEDERAL_POVERTY_LEVELS);
  
  const prompt = `
    You are an expert financial analyst specializing in verifying income for government assistance programs. Your task is to determine if an applicant's household income is at or below 200% of the Federal Poverty Level (FPL).

    Here are the 2024 FPL guidelines for the 48 contiguous states and D.C.:
    ${fplDataString}
    For households with more than 8 persons, add $${FPL_ADDITIONAL_PERSON_AMOUNT} for each additional person.

    Analyze the provided document(s) and perform the following steps:
    1. Identify the type of document(s) provided (e.g., W-2, 1040 Tax Return, SNAP/TANF benefit letter, pay stub, application form, etc.). If multiple documents are present, list them all.
    2. **Cross-Verification (Crucial):** If multiple documents or pages are provided (e.g., an application form with self-reported income AND a pay stub/payment statement), you MUST cross-verify the numbers.
       - Prioritize the income figures from official documents (W-2, tax return, pay stub) over self-reported numbers.
       - If a Year-to-Date (YTD) income is provided on a pay stub, annualize it to get a projected annual income. For example, if a pay stub from June 30th shows $25,000 YTD, the projected annual income is approximately $50,000. Use the date of the document to make an accurate projection.
       - In your reasoning, explicitly state whether the self-reported income aligns with the income calculated from the supporting documents. The final income determination must be based on the official documents if there's a discrepancy.
    3. Extract the applicant's final, verified annual gross income. **IMPORTANT: When calculating income, you MUST only include base pay or regular wages. Exclude any payments specifically identified as 'Overtime,' 'Bonus,' 'Commission,' or other non-recurring, non-guaranteed payments. Your calculation should reflect the applicant's standard, predictable income.** If income is presented weekly, bi-weekly, or monthly, you must annualize it. Use the result from the cross-verification step if applicable.
    4. Determine the household size. Infer from tax filing status (e.g., 'Single' is 1, 'Married Filing Jointly' is 2) and add any dependents listed. If household size cannot be determined, assume 1.
    5. Calculate the 200% FPL threshold for the determined household size.
    6. Compare the applicant's annual income to this threshold.
    7. If the document is a letter confirming participation in a government assistance program like SNAP, TANF, WIC, or Medicaid, the applicant is automatically eligible regardless of income shown elsewhere. State this in your reasoning.
    
    Return your analysis ONLY in the specified JSON format.
  `;

  const fileParts = (files as UploadedFile[]).map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.data,
    },
  }));

  const textPart = { text: prompt };

  try {
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, ...fileParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isEligible: { type: Type.BOOLEAN, description: "True if annual income is at or below 200% of FPL, or if they are on government assistance." },
            annualIncome: { type: Type.NUMBER, description: "The calculated total annual gross income based ONLY on regular pay (excluding overtime/bonuses). Null if not found." },
            householdSize: { type: Type.NUMBER, description: "The determined household size. Null if not found." },
            povertyLevel: { type: Type.NUMBER, description: "The 100% FPL amount for the household size. Null if household size is unknown." },
            povertyThreshold: { type: Type.NUMBER, description: "The 200% FPL threshold for the household size. Null if household size is unknown." },
            reasoning: { type: Type.STRING, description: "A detailed step-by-step explanation of how the conclusion was reached, including the cross-verification process and specific exclusion of non-standard income." },
            documentType: { type: Type.STRING, description: "The type of document(s) identified (e.g., 'W-2 and Pay Stub', 'Tax Return 1040')." },
          },
          required: ["isEligible", "annualIncome", "householdSize", "povertyLevel", "povertyThreshold", "reasoning", "documentType"]
        },
      },
    });

    const jsonText = geminiResponse.text.trim();
    const result = JSON.parse(jsonText);
    
    // Send the successful result back to the frontend
    response.status(200).json(result as AnalysisResult);

  } catch (error) {
    console.error("Gemini API call failed in serverless function:", error);
    // Send an error response back to the frontend
    response.status(500).json({ message: "Failed to analyze documents with AI. The model may have had trouble processing the file(s)." });
  }
}