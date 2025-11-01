'use server';
/**
 * @fileOverview This file defines a Genkit flow to process an image of an answer key and extract the correct answers.
 *
 * - extractKeyFromImage - A function that takes an image of an answer key and returns the extracted answers.
 * - ExtractKeyFromImageInput - The input type for the extractKeyFromImage function.
 * - ExtractKeyFromImageOutput - The return type for the extractKeyFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeyFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an answer key sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractKeyFromImageInput = z.infer<typeof ExtractKeyFromImageInputSchema>;

const ExtractKeyFromImageOutputSchema = z.object({
  extractedAnswers: z
    .array(z.string())
    .describe('The answers extracted from the answer key sheet.'),
});
export type ExtractKeyFromImageOutput = z.infer<typeof ExtractKeyFromImageOutputSchema>;

export async function extractKeyFromImage(input: ExtractKeyFromImageInput): Promise<ExtractKeyFromImageOutput> {
  return extractKeyFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeyFromImagePrompt',
  input: {schema: ExtractKeyFromImageInputSchema},
  output: {schema: ExtractKeyFromImageOutputSchema},
  prompt: `You are an AI assistant designed to extract correct answers from an answer key sheet.

Analyze the image provided and extract the answers for each question.

For each question, identify the marked answer (e.g., 'A', 'B', 'C', 'D', 'E').
- If you cannot read the answer for a question, classify it as "ANULADA".

Return the answers as a JSON array of strings in the 'extractedAnswers' field.

Image: {{media url=photoDataUri}}
  `,
});

const extractKeyFromImageFlow = ai.defineFlow(
  {
    name: 'extractKeyFromImageFlow',
    inputSchema: ExtractKeyFromImageInputSchema,
    outputSchema: ExtractKeyFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
