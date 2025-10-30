export interface TestTemplate {
  id: string;
  name: string;
  answerKey: string[];
  points: number[];
}

export interface GradingResult {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  score: number;
  totalPoints: number;
  earnedPoints: number;
}

export interface DetailedResult {
  question: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
}

export interface SavedExam {
  id: string;
  studentName: string;
  templateName: string;
  grade: GradingResult;
  details: DetailedResult[];
  image: string;
  correctionDate: string;
}
