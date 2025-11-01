import { config } from 'dotenv';
config();

import '@/ai/flows/process-image-and-extract-answers.ts';
import '@/ai/flows/calculate-grades-from-processed-answers.ts';
import '@/ai/flows/extract-key-from-image.ts';
