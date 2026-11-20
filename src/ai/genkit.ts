import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
<<<<<<< HEAD
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
=======
  plugins: [
    googleAI({
      defaultModel: 'gemini-1.5-flash' // 🔥 INI KUNCINYA
    })
  ],
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
});