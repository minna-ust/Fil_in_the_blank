import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = process.cwd();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // API endpoint to generate lyrics/sentences and split them into structured objects
  app.post('/api/lyrics/generate', async (req, res) => {
    try {
      const { songTitle, artist, prompt } = req.body;
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured in Secrets.' });
      }

      const model = 'gemini-3.5-flash';
      // If no songTitle is specified, we generate default dictation sentences
      const titleQuery = songTitle ? `"${songTitle}"` : 'a classic song';
      const artistQuery = artist ? ` by "${artist}"` : '';
      
      const userPrompt = prompt 
        ? prompt 
        : `Generate study lyrics/sentences for the song ${titleQuery}${artistQuery}. If it is not a well-known real song or is a general query, generate a customized listening dictation material with 8-12 sentences on the theme/title ${titleQuery}.`;

      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: `You are an expert English listening education specialist and dictation curriculum designer.
Generate structured lyric/sentence dictation practice materials in JSON format.
The output MUST be a JSON object with the following fields:
- title: string (the name of the song or material, e.g. "Yesterday")
- artist: string (the artist or theme, e.g. "The Beatles")
- difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
- description: string (a short introduction of what phonetic or linguistic features to pay attention to in this song/text, e.g., "Focus on reductions like 'going to' -> 'gonna' and linking consonants to vowels.")
- sentences: array of objects, where each object has:
  - id: number (sequential 1, 2, 3...)
  - text: string (the English sentence/lyric, with normal casing and punctuation. Keep sentences relatively short and natural, typically 5-15 words. Each sentence should represent a clear logical phrase that can be played on a single audio loop)
  - translation: string (accurate and natural Chinese translation of this sentence)
  - audioDurationSec: number (estimate of how long this sentence takes to read at normal speech rate, e.g., 3.8)
  - pronunciationTips: string (detailed explanation of speech assimilation, liaison/linking, elision, or reductions occurring in this sentence, e.g., "The 'd' in 'and' is elided, and the 'n' links to 'I': 'an-I'.")
  - blanks: array of numbers (the 0-indexed indices of the words that should be blanked out for dictation in this sentence. Pick 2-4 important vocabulary words, high-frequency expressions, or words that are tricky to hear. Note: indices refer to the words of the sentence when split by whitespace after stripping non-alphanumeric characters, so ensure they are valid indices).

CRITICAL: Return ONLY raw JSON matching the schema. Do NOT wrap the JSON in markdown code blocks like \`\`\`json.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              description: { type: Type.STRING },
              sentences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    text: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    audioDurationSec: { type: Type.NUMBER },
                    pronunciationTips: { type: Type.STRING },
                    blanks: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER }
                    }
                  },
                  required: ['id', 'text', 'translation', 'audioDurationSec', 'pronunciationTips', 'blanks']
                }
              }
            },
            required: ['title', 'artist', 'difficulty', 'description', 'sentences']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No text returned from Gemini API.');
      }

      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error('Error generating lyrics:', error);
      res.status(500).json({ error: error.message || 'Failed to generate dictation materials.' });
    }
  });

  // API endpoint for AI dictionary / sentence explanation
  app.post('/api/lyrics/explain', async (req, res) => {
    try {
      const { sentence, word } = req.body;
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured in Secrets.' });
      }

      const prompt = word
        ? `Explain the word "${word}" in the context of this English sentence: "${sentence}". Provide its phonetic symbols, Chinese definition, grammatical role here, common synonyms, and an educational example sentence.`
        : `Explain the grammar structure, sentence patterns, and idioms in this English sentence: "${sentence}". Highlight key learning points for non-native English learners.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an elite bilingual English teacher. Provide explanations in beautiful, encouraging Chinese, formatted cleanly in Markdown with clear typography and styled lists.',
        }
      });

      res.json({ explanation: response.text });
    } catch (error: any) {
      console.error('Error explaining lyric:', error);
      res.status(500).json({ error: error.message || 'Failed to generate explanation.' });
    }
  });

  // Serve static assets in production, or use Vite dev server in development
  if (process.env.NODE_ENV === 'production') {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      // If it looks like an API route, let it pass (it will 404 or match above)
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In dev mode, use Vite Dev Server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Handle any remaining errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
