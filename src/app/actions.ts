'use server';

import { processImageAndExtractAnswers } from '@/ai/flows/process-image-and-extract-answers';
import { calculateGrades } from '@/ai/flows/calculate-grades-from-processed-answers';
import type { GradingResult, DetailedResult } from '@/lib/types';

export async function gradeExamAction(
  photoDataUri: string,
  answerKey: string[],
  points: number[]
): Promise<{ grade: GradingResult; details: DetailedResult[] } | null> {
  try {
    const { extractedAnswers } = await processImageAndExtractAnswers({ photoDataUri });
    const grade = await calculateGrades({ extractedAnswers, answerKey, points });

    const details: DetailedResult[] = answerKey.map((correctAnswer, index) => {
      const studentAnswer = extractedAnswers[index] || '';
      const isCorrect = studentAnswer === correctAnswer;
      const questionPoints = points[index] || 0;
      return {
        question: index + 1,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        points: questionPoints,
        earnedPoints: isCorrect ? questionPoints : 0,
      };
    });

    return { grade, details };
  } catch (error) {
    console.error('Error in gradeExamAction:', error);
    return null;
  }
}
