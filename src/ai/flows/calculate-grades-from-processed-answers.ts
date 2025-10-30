'use server';
/**
 * @fileOverview Calculates the grades from processed answers by comparing them to an answer key and considering individual question points.
 *
 * - calculateGrades - A function that calculates the grades based on processed answers, an answer key, and points for each question.
 * - CalculateGradesInput - The input type for the calculateGrades function.
 * - CalculateGradesOutput - The return type for the calculateGrades function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateGradesInputSchema = z.object({
  extractedAnswers: z.array(z.string()).describe('The answers extracted from the image.'),
  answerKey: z.array(z.string()).describe('The correct answers for the test.'),
  points: z.array(z.number()).describe('The points for each question.'),
});
export type CalculateGradesInput = z.infer<typeof CalculateGradesInputSchema>;

const CalculateGradesOutputSchema = z.object({
  correctAnswers: z.number().describe('The number of correct answers.'),
  incorrectAnswers: z.number().describe('The number of incorrect answers.'),
  totalQuestions: z.number().describe('The total number of questions.'),
  score: z.number().describe('The calculated score as a percentage.'),
  totalPoints: z.number().describe('The total possible points.'),
  earnedPoints: z.number().describe('The points earned by the student.'),
});
export type CalculateGradesOutput = z.infer<typeof CalculateGradesOutputSchema>;

export async function calculateGrades(input: CalculateGradesInput): Promise<CalculateGradesOutput> {
  return calculateGradesFlow(input);
}

const calculateGradesFlow = ai.defineFlow(
  {
    name: 'calculateGradesFlow',
    inputSchema: CalculateGradesInputSchema,
    outputSchema: CalculateGradesOutputSchema,
  },
  async input => {
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let earnedPoints = 0;
    const totalQuestions = input.answerKey.length;
    const totalPoints = input.points.reduce((sum, p) => sum + p, 0);

    for (let i = 0; i < totalQuestions; i++) {
      if (input.extractedAnswers[i] === input.answerKey[i]) {
        correctAnswers++;
        earnedPoints += input.points[i] || 0;
      } else {
        incorrectAnswers++;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    return {
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      score,
      totalPoints,
      earnedPoints,
    };
  }
);
