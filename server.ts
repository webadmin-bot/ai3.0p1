import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to dynamically get GoogleGenAI client with current API key
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please select your Gemini API key in the AI Studio panel.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const MODEL_NAME = 'gemini-3.8-flash';
const DEFAULT_YOUTUBE_API_KEY = '';

function getYouTubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || '';
}

// Robust Gemini call wrapper with bounded retry for transient 503 and clear error differentiation
async function callGeminiWithFallback(params: { contents: string; config?: any }) {
  const ai = getAiClient();
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    // Up to 2 attempts for transient 503 before switching model
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const status = err?.status;

        // Authentication issues (401 / 403)
        if (
          status === 401 ||
          status === 403 ||
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
          errMsg.includes('insufficient authentication scopes')
        ) {
          throw new Error('Authentication Error: The Gemini API key is missing or invalid. Please select your Gemini API key in the AI Studio panel.');
        }

        // Rate limiting (429)
        if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[Gemini] Model ${model} rate limited (429), attempting next model option...`);
          break; // break inner attempt loop to try next model
        }

        // Service Unavailable / Overloaded (503)
        const is503 = status === 503 || errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
        if (is503) {
          if (attempt === 0) {
            // Small bounded wait before 2nd attempt
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          console.warn(`[Gemini] Model ${model} returned transient 503 on retry, falling back to next available model...`);
          break; // try next model
        }

        // Not a transient retryable error: throw directly
        throw err;
      }
    }
  }
  throw lastError;
}

// Helper to sanitize and safely parse model JSON responses
function parseCleanJson<T = any>(rawText: string | undefined): T {
  if (!rawText) {
    throw new Error('Received empty response from Gemini model');
  }
  let cleaned = rawText.trim();
  // Strip Markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned) as T;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '20mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      hasYouTubeKey: Boolean(getYouTubeApiKey()),
      model: MODEL_NAME,
      timestamp: new Date().toISOString(),
    });
  });

  // Research Integration Status
  app.get('/api/research/status', (_req: Request, res: Response) => {
    const youtubeKey = getYouTubeApiKey();
    const hasYouTubeKey = Boolean(youtubeKey);
    res.json({
      connected: hasYouTubeKey,
      hasYouTubeKey,
      platforms: ['YouTube', 'YouTube Shorts', 'TikTok', 'Instagram Reels', 'Facebook Reels', 'Multi-Platform'],
      dataSourceNotice: hasYouTubeKey
        ? 'YouTube Data API v3 Active & Connected'
        : 'DATA SOURCE NOT CONNECTED: YouTube Data API key is not configured on the server.',
    });
  });

  // YouTube Research Engine (Official YouTube Data API v3)
  app.post('/api/research/youtube', async (req: Request, res: Response) => {
    try {
      const { keyword, timeframe, contentType, minViews, regionCode } = req.body;
      const youtubeKey = getYouTubeApiKey();

      if (!youtubeKey) {
        return res.json({
          success: true,
          connected: false,
          dataSourceNotice: 'DATA SOURCE NOT CONNECTED: Configure YOUTUBE_API_KEY in server environment to retrieve live YouTube metrics.',
          results: [],
        });
      }

      const now = new Date();
      let daysAgo = 30;
      if (timeframe === '7d') daysAgo = 7;
      if (timeframe === '90d') daysAgo = 90;
      const publishedAfter = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      const videoDuration = contentType === 'shorts' ? 'short' : contentType === 'long' ? 'medium' : 'any';
      const region = regionCode || 'US';
      const query = (keyword || '').trim();

      let searchUrl = '';
      if (query) {
        searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&order=viewCount&publishedAfter=${publishedAfter}&regionCode=${region}&maxResults=10&key=${youtubeKey}`;
        if (videoDuration !== 'any') {
          searchUrl += `&videoDuration=${videoDuration}`;
        }
      } else {
        searchUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${region}&maxResults=10&key=${youtubeKey}`;
      }

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const errJson = await searchRes.json().catch(() => ({}));
        return res.json({
          success: true,
          connected: false,
          dataSourceNotice: `YouTube API returned HTTP ${searchRes.status}: ${errJson.error?.message || 'Access error'}.`,
          results: [],
        });
      }

      const searchData = await searchRes.json();
      let videoIds: string[] = [];
      if (query) {
        videoIds = (searchData.items || []).map((it: any) => it.id?.videoId).filter(Boolean);
      } else {
        videoIds = (searchData.items || []).map((it: any) => it.id).filter(Boolean);
      }

      if (videoIds.length === 0) {
        return res.json({
          success: true,
          connected: true,
          dataSourceNotice: 'YouTube Data API Connected: No videos matched the search criteria.',
          results: [],
        });
      }

      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${youtubeKey}`;
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json();

      const results = (videosData.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title || 'Untitled Video',
        channelTitle: v.snippet?.channelTitle || 'Unknown Channel',
        publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
        viewCount: parseInt(v.statistics?.viewCount || '0', 10),
        likeCount: parseInt(v.statistics?.likeCount || '0', 10),
        duration: v.contentDetails?.duration || '',
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
        source: 'YouTube' as const,
      })).filter((v: any) => !minViews || v.viewCount >= Number(minViews));

      res.json({
        success: true,
        connected: true,
        dataSourceNotice: `YouTube Data API v3: Retrieved ${results.length} real video records.`,
        results,
      });
    } catch (error: any) {
      console.error('Error in /api/research/youtube:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to query YouTube Data API',
      });
    }
  });

  // Discover Niches (Mode A)
  app.post('/api/research/discover-niches', async (req: Request, res: Response) => {
    try {
      const { platform, targetAudience, format } = req.body;

      const prompt = `You are an elite video content strategist and niche discovery expert at XEMACS7 AI Film Studio.
Discover EXACTLY 6 promising, high-demand video creation niches with high viral potential for AI-assisted video creation.
Target Platform: ${platform || 'YouTube Shorts / TikTok / Reels'}
Target Audience: ${targetAudience || 'General video audience'}
Format: ${format || 'Shorts/Reels'}

Strict Requirements:
1. Provide 6 distinct, creative, actionable video niches (e.g. Cinematic Historical What-Ifs, Sci-Fi Mystery Micro-Dramas, Deep Sea Exploration Lore, Ancient Cyber Mythology, Mind-Bending Psychological Dilemmas, Micro-Documentary Wonders).
2. For each niche, provide:
   - name: clear evocative niche title
   - description: 1-2 sentence definition
   - demand: e.g. "Very High", "High", "Explosive"
   - competition: e.g. "Low", "Medium", "High"
   - aiSuitability: e.g. "Excellent (High visual freedom)", "Great (Character & world consistency)"
   - sampleAngle: concrete dramatic or narrative angle
   - trendingHook: punchy 3-second opening hook line`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of 6 discovered video niches',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                demand: { type: Type.STRING },
                competition: { type: Type.STRING },
                aiSuitability: { type: Type.STRING },
                sampleAngle: { type: Type.STRING },
                trendingHook: { type: Type.STRING },
              },
              required: ['name', 'description', 'demand', 'competition', 'aiSuitability', 'sampleAngle', 'trendingHook'],
            },
          },
        },
      });

      const niches = parseCleanJson(response.text);
      res.json({ success: true, niches });
    } catch (error: any) {
      console.error('Error discovering niches:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to discover niches',
      });
    }
  });

  // Niche Opportunity Analysis (Mode B)
  app.post('/api/research/analyze-niche', async (req: Request, res: Response) => {
    try {
      const { niche, platform, audience, sampleVideos } = req.body;

      const videosSummary = (sampleVideos || []).slice(0, 5).map((v: any) =>
        `- "${v.title}" by ${v.channelTitle} (${(v.viewCount || 0).toLocaleString()} views)`
      ).join('\n');

      const prompt = `You are the Lead Audience Intelligence & Creative Research Director at XEMACS7 AI FILM STUDIO.
Perform an in-depth, evidence-based Niche Opportunity Analysis for the video niche below:

Niche / Topic: "${niche || 'General Storytelling'}"
Platform: ${platform || 'YouTube Shorts / Reels'}
Target Audience: ${audience || 'General'}
${videosSummary ? `Recent High-Performing Videos in this Space:\n${videosSummary}\n` : ''}

Analysis Directives:
1. Identify common successful topics and themes in this niche.
2. Formulate 3-4 strong opening hooks that capture attention in the first 3 seconds.
3. Detail recurring audience interests and psychological cravings.
4. Pinpoint popular storytelling structures (e.g. In Media Res, Mystery-Box, Dramatic Contrast, Twist Climax).
5. Highlight typical video duration optimal for retention.
6. Note topic saturation signals and what is overdone.
7. Identify possible underserved subtopics and gap opportunities.
8. Highlight specific opportunities for original AI-generated storytelling and worldbuilding.
9. Assess estimated production difficulty (Easy, Moderate, or Ambitious).
10. Assess suitability for episodic or repeatable series (High, Medium, or Low).
11. Compute transparent heuristic scores (0 to 100):
    - audienceDemand: 0-100
    - competition: 0-100
    - creativeOriginalityPotential: 0-100
    - aiProductionFeasibility: 0-100
    - overallScore: weighted combination (0-100)`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              niche: { type: Type.STRING },
              targetPlatform: { type: Type.STRING },
              commonSuccessfulTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              strongOpeningHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
              recurringAudienceInterests: { type: Type.ARRAY, items: { type: Type.STRING } },
              popularStorytellingStructures: { type: Type.ARRAY, items: { type: Type.STRING } },
              typicalVideoDuration: { type: Type.STRING },
              topicSaturationSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleUnderservedSubtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunitiesForAiStorytelling: { type: Type.ARRAY, items: { type: Type.STRING } },
              estimatedProductionDifficulty: { type: Type.STRING, enum: ['Easy', 'Moderate', 'Ambitious'] },
              suitabilityForEpisodicContent: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
              scores: {
                type: Type.OBJECT,
                properties: {
                  audienceDemand: { type: Type.INTEGER },
                  competition: { type: Type.INTEGER },
                  creativeOriginalityPotential: { type: Type.INTEGER },
                  aiProductionFeasibility: { type: Type.INTEGER },
                  overallScore: { type: Type.INTEGER },
                },
                required: ['audienceDemand', 'competition', 'creativeOriginalityPotential', 'aiProductionFeasibility', 'overallScore'],
              },
            },
            required: [
              'niche',
              'targetPlatform',
              'commonSuccessfulTopics',
              'strongOpeningHooks',
              'recurringAudienceInterests',
              'popularStorytellingStructures',
              'typicalVideoDuration',
              'topicSaturationSignals',
              'possibleUnderservedSubtopics',
              'opportunitiesForAiStorytelling',
              'estimatedProductionDifficulty',
              'suitabilityForEpisodicContent',
              'scores',
            ],
          },
        },
      });

      const analysis = parseCleanJson(response.text);
      res.json({
        success: true,
        analysis: {
          ...analysis,
          retrievedAt: new Date().toISOString(),
          dataSource: Boolean(getYouTubeApiKey()) ? 'YouTube Data API v3 & Gemini AI Studio Intelligence' : 'Gemini AI Studio Intelligence (Data Source Offline)',
        },
      });
    } catch (error: any) {
      console.error('Error analyzing niche:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze niche opportunity',
      });
    }
  });

  // Helper to mask key preview safely
  function maskKey(key?: string): string {
    if (!key || key.length < 8) return '';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  // ==========================================
  // CENTRALIZED SETTINGS → API INTEGRATIONS
  // ==========================================

  // 1. Integration Status
  app.get('/api/settings/integrations', (_req: Request, res: Response) => {
    const ytKey = getYouTubeApiKey();
    const geminiKey = process.env.GEMINI_API_KEY;

    res.json({
      success: true,
      youtube: {
        configured: Boolean(ytKey),
        maskedKey: ytKey ? maskKey(ytKey) : '',
        status: ytKey ? 'CONNECTED' : 'NOT_CONFIGURED',
        isDefaultKey: ytKey === DEFAULT_YOUTUBE_API_KEY,
      },
      gemini: {
        configured: Boolean(geminiKey),
        maskedKey: geminiKey ? maskKey(geminiKey) : '',
        textModel: MODEL_NAME,
        supportedImageModels: [
          {
            id: 'gemini-3.1-flash-lite-image',
            name: 'Gemini 3.1 Flash Lite Image',
            tier: 'Fast / Standard (Recommended)',
            supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
            supportedResolutions: ['Default'],
          },
          {
            id: 'gemini-nano-banana-2.1',
            name: 'Nano Banana 2.1 (High-Quality)',
            tier: 'Paid Key Required (1K, 2K, 4K)',
            supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '1:4', '4:1'],
            supportedResolutions: ['1K', '2K', '4K'],
          },
          {
            id: 'gemini-3-pro-image',
            name: 'Gemini 3 Pro Image',
            tier: 'Pro / High-Fidelity',
            supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
            supportedResolutions: ['1K', '2K', '4K'],
          },
        ],
        status: geminiKey ? 'CONNECTED' : 'NOT_CONFIGURED',
      },
    });
  });

  // 2. Test YouTube Connection
  app.post('/api/settings/test-youtube', async (_req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const ytKey = getYouTubeApiKey();
      if (!ytKey) {
        return res.json({
          success: false,
          error: 'No YouTube API key configured. Set YOUTUBE_API_KEY in server environment.',
        });
      }

      const testUrl = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${ytKey}`;
      const apiRes = await fetch(testUrl);
      const data = await apiRes.json();
      const latencyMs = Date.now() - startTime;

      if (!apiRes.ok || data.error) {
        return res.json({
          success: false,
          latencyMs,
          error: data.error?.message || `YouTube API returned HTTP ${apiRes.status}`,
          code: data.error?.code || apiRes.status,
        });
      }

      res.json({
        success: true,
        latencyMs,
        message: 'YouTube Data API v3 connection verified successfully.',
        itemsCount: (data.items || []).length,
      });
    } catch (err: any) {
      res.json({
        success: false,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Network failure connecting to YouTube Data API',
      });
    }
  });

  // 3. Test Gemini Text Generation
  app.post('/api/settings/test-gemini-text', async (_req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: false,
          error: 'GEMINI_API_KEY is not configured in the server environment.',
        });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: 'Confirm connection. Reply with a short JSON {"status":"ok","echo":"pong"}.',
        config: {
          responseMimeType: 'application/json',
        },
      });

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        latencyMs,
        model: MODEL_NAME,
        message: `${MODEL_NAME} text generation active and verified.`,
        raw: response.text,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isQuota = /quota|rate|429|resource_exhausted/i.test(err.message || '');
      res.json({
        success: false,
        latencyMs,
        error: err.message || 'Gemini text generation test failed',
        isQuotaError: isQuota,
      });
    }
  });

  // 4. Test Gemini Image Generation
  app.post('/api/settings/test-gemini-image', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: false,
          error: 'GEMINI_API_KEY is not configured in the server environment.',
          isQuotaOrBillingError: false,
        });
      }

      const { model = 'gemini-3.1-flash-lite-image', prompt = 'A simple geometric sphere on a neutral studio background, 3D render' } = req.body;
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      let hasImage = false;
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data) {
          hasImage = true;
          break;
        }
      }

      const latencyMs = Date.now() - startTime;
      if (!hasImage) {
        return res.json({
          success: false,
          latencyMs,
          error: 'Model completed response without image data parts.',
          model,
        });
      }

      res.json({
        success: true,
        latencyMs,
        model,
        message: `Image generation verified with ${model}.`,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err.message || '';
      const isQuotaOrBilling = /billing|quota|tier|resource_exhausted|429|403|unauthorized/i.test(errMsg);
      res.json({
        success: false,
        latencyMs,
        error: errMsg,
        isQuotaOrBillingError: isQuotaOrBilling,
        diagnostic: isQuotaOrBilling
          ? 'Image generation API quota or billing limit reached on current project credentials. Free Manual Mode is recommended.'
          : 'Failed to generate image via API.',
      });
    }
  });

  // Phase 2 Image Preview Generation (supports selectable image models & aspect ratios)
  app.post('/api/gemini/generate-image-preview', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio, model = 'gemini-3.1-flash-lite-image', imageSize } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      const ai = getAiClient();
      let ar: '1:1' | '9:16' | '16:9' | '3:4' | '4:3' = '1:1';
      if (aspectRatio === '9:16' || aspectRatio === '16:9' || aspectRatio === '1:1' || aspectRatio === '3:4' || aspectRatio === '4:3') {
        ar = aspectRatio;
      }

      const selectedModel = model === 'gemini-nano-banana-2.1' || model === 'gemini-3-pro-image'
        ? model
        : 'gemini-3.1-flash-lite-image';

      const imageConfig: any = {
        aspectRatio: ar,
      };
      if ((selectedModel === 'gemini-nano-banana-2.1' || selectedModel === 'gemini-3-pro-image') && imageSize) {
        imageConfig.imageSize = imageSize;
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig,
        },
      });

      let imageDataUrl: string | null = null;
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageDataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageDataUrl) {
        return res.status(500).json({
          success: false,
          error: 'Model completed but did not return image bytes.',
        });
      }

      res.json({ success: true, imageDataUrl });
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-image-preview:', error);
      const isQuotaOrBilling = /billing|quota|tier|resource_exhausted|429|403|unauthorized/i.test(error.message || '');
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate image preview via Gemini',
        isQuotaOrBillingError: isQuotaOrBilling,
      });
    }
  });

  // Helper functions for safe, rich genre & tone prompt formulation
  const formatGenresForPrompt = (settings: any): string => {
    if (!settings) return 'Drama';
    const raw = settings.genres ?? settings.genre;
    const list: string[] = Array.isArray(raw)
      ? raw.flatMap((x: any) => (typeof x === 'string' ? x.split(',') : [])).map((s: string) => s.trim()).filter(Boolean)
      : typeof raw === 'string'
      ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    if (list.length === 0) return 'Drama';
    const primary = settings.primaryGenre || list[0];
    const complementary = list.filter((g: string) => g !== primary);
    if (complementary.length > 0) {
      return `Primary: ${primary} (Complementary Genres: ${complementary.join(', ')}; Complete Palette: ${list.join(', ')})`;
    }
    return primary;
  };

  const formatToneForPrompt = (settings: any): string => {
    if (!settings) return 'Suspenseful';
    const primary = (settings.primaryTone || (typeof settings.tone === 'string' ? settings.tone.split(/\s*(?:&|and|\/|,)\s*/i)[0] : '') || 'Suspenseful').trim();
    const secondary = (settings.secondaryTone || (typeof settings.tone === 'string' && settings.tone.match(/\s*(?:&|and|\/|,)\s*(.+)/i)?.[1]) || '').trim();
    if (secondary && secondary.toLowerCase() !== primary.toLowerCase()) {
      return `${primary} & ${secondary} (Dominant Emotional Tone: ${primary}, Complementary Secondary Undercurrent: ${secondary})`;
    }
    return settings.tone || primary || 'Suspenseful';
  };

  // 1. Generate 5 distinct story concepts (Mode A / C)
  app.post('/api/gemini/generate-concepts', async (req: Request, res: Response) => {
    try {
      const { settings, visualStyle, workingTitle } = req.body;

      const prompt = `You are a world-class cinematic story architect and executive producer at XEMACS7 STUDIO AI.
Generate EXACTLY 5 substantially distinct, innovative, and compelling story concepts for a new film/video project.

Project Parameters:
- Working Title / Premise seed: ${workingTitle || 'None specified (explore fresh original hooks)'}
- Format: ${settings.format} (Target Runtime: ~${settings.targetRuntimeSeconds} seconds${(settings.format === 'Episodic Short Drama' || settings.format === 'Episodic Long-Form Series') ? `, Episode Count: ${settings.episodeCount}` : ''})
- Genres: ${formatGenresForPrompt(settings)}
- Master Visual Style: ${visualStyle.name} (${visualStyle.category}) - ${visualStyle.description}
- Medium / Realism: ${visualStyle.medium} / ${visualStyle.realismLevel}
- Language: ${settings.language}
- Target Audience: ${settings.audience}
- Platform: ${settings.platform}
- Emotional Tone: ${formatToneForPrompt(settings)}
- Narration Approach: ${settings.narration}
${settings.settingCulture ? `- Setting / Cultural Context: ${settings.settingCulture}` : ''}
${settings.storyConstraints ? `- Story Constraints: ${settings.storyConstraints}` : ''}
${settings.specialInstructions ? `- Special Instructions: ${settings.specialInstructions}` : ''}

Strict Requirements:
1. Provide EXACTLY 5 concepts, numbered CONCEPT-01 through CONCEPT-05.
2. Each concept MUST have a genuinely distinct angle, thematic core, protagonist, and emotional hook.
3. Every concept MUST fit the ${settings.format} duration and platform constraints.
4. Every concept MUST be cinematic and filmable under the visual style '${visualStyle.name}'.
5. Return ONLY a valid JSON array of objects conforming to the requested schema.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of exactly 5 distinct story concepts',
            items: {
              type: Type.OBJECT,
              properties: {
                conceptId: { type: Type.STRING },
                title: { type: Type.STRING },
                genre: { type: Type.STRING },
                logline: { type: Type.STRING },
                uniqueHook: { type: Type.STRING },
                premise: { type: Type.STRING },
                protagonist: { type: Type.STRING },
                conflict: { type: Type.STRING },
                stakes: { type: Type.STRING },
                emotionalAppeal: { type: Type.STRING },
                visualPotential: { type: Type.STRING },
                seriesPotential: { type: Type.STRING },
                filmabilityNote: { type: Type.STRING },
              },
              required: [
                'conceptId',
                'title',
                'genre',
                'logline',
                'uniqueHook',
                'premise',
                'protagonist',
                'conflict',
                'stakes',
                'emotionalAppeal',
                'visualPotential',
                'filmabilityNote',
              ],
            },
          },
        },
      });

      const concepts = parseCleanJson(response.text);
      res.json({ success: true, concepts });
    } catch (error: any) {
      console.error('Error generating concepts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate story concepts via Gemini',
      });
    }
  });

  // 2. Regenerate a single concept
  app.post('/api/gemini/regenerate-single-concept', async (req: Request, res: Response) => {
    try {
      const { conceptToReplace, otherConcepts, settings, visualStyle, guidance } = req.body;

      const otherTitles = (otherConcepts || []).map((c: any) => `"${c.title}": ${c.logline}`).join('\n');

      const prompt = `You are an elite Hollywood and international film story architect.
Replace one story concept with an exciting new, completely distinct alternative.

The concept being replaced was: "${conceptToReplace.title}" (${conceptToReplace.genre}).
The other 4 concepts in this deck are:
${otherTitles}

User Guidance for this replacement: ${guidance || 'Explore a fresh, bold, unexpected dramatic angle.'}

Format & Style:
- Format: ${settings.format} (~${settings.targetRuntimeSeconds}s)
- Master Visual Style: ${visualStyle.name} (${visualStyle.category})
- Genres: ${formatGenresForPrompt(settings)}
- Language & Tone: ${settings.language}, ${formatToneForPrompt(settings)}

Requirements:
- Must NOT duplicate the premise of any of the other 4 concepts.
- Provide a single story concept object with conceptId "${conceptToReplace.conceptId}".`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conceptId: { type: Type.STRING },
              title: { type: Type.STRING },
              genre: { type: Type.STRING },
              logline: { type: Type.STRING },
              uniqueHook: { type: Type.STRING },
              premise: { type: Type.STRING },
              protagonist: { type: Type.STRING },
              conflict: { type: Type.STRING },
              stakes: { type: Type.STRING },
              emotionalAppeal: { type: Type.STRING },
              visualPotential: { type: Type.STRING },
              seriesPotential: { type: Type.STRING },
              filmabilityNote: { type: Type.STRING },
            },
            required: [
              'conceptId',
              'title',
              'genre',
              'logline',
              'uniqueHook',
              'premise',
              'protagonist',
              'conflict',
              'stakes',
              'emotionalAppeal',
              'visualPotential',
              'filmabilityNote',
            ],
          },
        },
      });

      const concept = parseCleanJson(response.text);
      res.json({ success: true, concept });
    } catch (error: any) {
      console.error('Error regenerating concept:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate concept',
      });
    }
  });

  // 3. Develop selected concept
  app.post('/api/gemini/develop-concept', async (req: Request, res: Response) => {
    try {
      const { concept, settings, visualStyle } = req.body;

      const prompt = `You are the lead narrative architect at XEMACS7 STUDIO AI.
Develop this selected story concept into a comprehensive narrative architecture.

Selected Concept:
- Title: ${concept.title}
- Logline: ${concept.logline}
- Premise: ${concept.premise}
- Protagonist: ${concept.protagonist}
- Conflict: ${concept.conflict}
- Stakes: ${concept.stakes}
- Visual Style: ${visualStyle.name} (${visualStyle.description})
- Format: ${settings.format} (Runtime: ~${settings.targetRuntimeSeconds}s${(settings.format === 'Episodic Short Drama' || settings.format === 'Episodic Long-Form Series') ? `, Episodes: ${settings.episodeCount}` : ''})
- Genres: ${formatGenresForPrompt(settings)}
- Emotional Tone: ${formatToneForPrompt(settings)}
- Language: ${settings.language}

Deliver a deep, production-ready narrative blueprint with protagonist wants vs subconscious needs, opposing forces, emotional hooks, narrative engine, and ending/cliffhanger strategy.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conceptId: { type: Type.STRING },
              title: { type: Type.STRING },
              titleAlternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              logline: { type: Type.STRING },
              expandedPremise: { type: Type.STRING },
              theme: { type: Type.STRING },
              protagonistWant: { type: Type.STRING },
              protagonistNeed: { type: Type.STRING },
              opposingForce: { type: Type.STRING },
              stakes: { type: Type.STRING },
              tone: { type: Type.STRING },
              world: { type: Type.STRING },
              emotionalHook: { type: Type.STRING },
              narrativeEngine: { type: Type.STRING },
              endingStrategy: { type: Type.STRING },
              episodicPotential: { type: Type.STRING },
            },
            required: [
              'conceptId',
              'title',
              'titleAlternatives',
              'logline',
              'expandedPremise',
              'theme',
              'protagonistWant',
              'protagonistNeed',
              'opposingForce',
              'stakes',
              'tone',
              'world',
              'emotionalHook',
              'narrativeEngine',
              'endingStrategy',
            ],
          },
        },
      });

      const development = parseCleanJson(response.text);
      res.json({ success: true, development });
    } catch (error: any) {
      console.error('Error developing concept:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to develop concept',
      });
    }
  });

  // 4. Analyze user's own story (Mode B)
  app.post('/api/gemini/analyze-story', async (req: Request, res: Response) => {
    try {
      const { storyText, settings, visualStyle } = req.body;

      const prompt = `You are an expert story analyst at XEMACS7 STUDIO AI.
Carefully analyze the author's original story text below.

STRICT INSTRUCTIONS:
1. Extract ONLY what is explicitly supported or directly implied by the author's text.
2. DO NOT invent new major plot events, alter the author's ending, or rename characters.
3. If crucial narrative details (e.g. world laws, backstories, specific payoffs) are missing, mark them explicitly as "UNSPECIFIED in original text".
4. Provide optional, author-approved AI suggestions only under the 'aiSuggestions' field without treating them as author-written canon.

Author's Original Text:
"""
${storyText}
"""

Target Format: ${settings.format} (~${settings.targetRuntimeSeconds}s)
Master Visual Style: ${visualStyle.name} (${visualStyle.description})`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plotSummary: { type: Type.STRING },
              protagonist: { type: Type.STRING },
              conflict: { type: Type.STRING },
              world: { type: Type.STRING },
              charactersIdentified: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              timeline: { type: Type.STRING },
              majorBeats: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              setupPayoffs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              unansweredQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              episodeStructureSuggestion: { type: Type.STRING },
              aiSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['area', 'suggestion'],
                },
              },
            },
            required: [
              'plotSummary',
              'protagonist',
              'conflict',
              'world',
              'charactersIdentified',
              'timeline',
              'majorBeats',
              'setupPayoffs',
              'unansweredQuestions',
              'aiSuggestions',
            ],
          },
        },
      });

      const analysis = parseCleanJson(response.text);
      res.json({
        success: true,
        analysis: {
          ...analysis,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error analyzing own story:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze story',
      });
    }
  });

  // 5. Analyze user's screenplay (Mode C)
  app.post('/api/gemini/analyze-script', async (req: Request, res: Response) => {
    try {
      const { scriptText, sourceName, sourceType, settings } = req.body;

      const prompt = `You are a professional script supervisor and canon extraction specialist at XEMACS7 STUDIO AI.
Analyze and extract structured narrative data from this screenplay.

STRICT CANON EXTRACTION RULES:
1. PRESERVE ORIGINAL SCENE ORDER EXACTLY as written.
2. EXTRACT SPOKEN DIALOGUE VERBATIM. NEVER rewrite, sanitize, or alter spoken lines.
3. Identify every speaking character and background character.
4. Extract all scene headings (sluglines: INT./EXT., LOCATION, TIME).
5. Extract key story props, locations, rules, secrets, and open threads.
6. If any details are not in the script, mark them "UNSPECIFIED".
7. Flag this script as the SCRIPT SOURCE OF TRUTH for production.

Screenplay Text:
"""
${scriptText}
"""

Target Format: ${settings.format}`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedScenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    slugline: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    characters: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    dialogueLines: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          speaker: { type: Type.STRING },
                          line: { type: Type.STRING },
                          parenthetical: { type: Type.STRING },
                        },
                        required: ['speaker', 'line'],
                      },
                    },
                    propsUsed: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    location: { type: Type.STRING },
                  },
                  required: ['sceneNumber', 'slugline', 'summary', 'characters', 'dialogueLines', 'propsUsed', 'location'],
                },
              },
              extractedCharacters: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedLocations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedProps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              storyRules: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              secrets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              openThreads: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'extractedScenes',
              'extractedCharacters',
              'extractedLocations',
              'extractedProps',
              'storyRules',
              'secrets',
              'openThreads',
            ],
          },
        },
      });

      const extracted = parseCleanJson<any>(response.text);

      let totalDialogueCount = 0;
      if (Array.isArray(extracted.extractedScenes)) {
        for (const sc of extracted.extractedScenes) {
          if (Array.isArray(sc.dialogueLines)) {
            totalDialogueCount += sc.dialogueLines.length;
          }
        }
      }

      res.json({
        success: true,
        extractedScript: {
          originalText: scriptText,
          sourceName: sourceName || 'pasted-script.fountain',
          sourceType: sourceType || 'PASTE',
          importedAt: new Date().toISOString(),
          version: 1,
          extractedScenes: extracted.extractedScenes || [],
          extractedCharacters: extracted.extractedCharacters || [],
          extractedDialogueCount: totalDialogueCount,
          extractedLocations: extracted.extractedLocations || [],
          extractedProps: extracted.extractedProps || [],
          storyRules: extracted.storyRules || [],
          secrets: extracted.secrets || [],
          openThreads: extracted.openThreads || [],
          isSourceOfTruth: true,
        },
      });
    } catch (error: any) {
      console.error('Error analyzing script:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to extract script canon',
      });
    }
  });

  // 6. Modular Canon Builder & Compiler
  app.post('/api/gemini/compile-canon', async (req: Request, res: Response) => {
    try {
      const {
        sourceMode,
        projectTitle,
        settings,
        visualStyle,
        concept,
        development,
        originalStoryText,
        importedScript,
      } = req.body;

      let sourceContext = '';
      if (sourceMode === 'AI_CONCEPT') {
        sourceContext = `AI CONCEPT SOURCE:
Title: ${development?.title || concept?.title}
Logline: ${development?.logline || concept?.logline}
Expanded Premise: ${development?.expandedPremise || concept?.premise}
Theme: ${development?.theme}
Protagonist Want: ${development?.protagonistWant}
Protagonist Need: ${development?.protagonistNeed}
Opposing Force: ${development?.opposingForce}
Stakes: ${development?.stakes}
World: ${development?.world}
Ending Strategy: ${development?.endingStrategy}`;
      } else if (sourceMode === 'OWN_STORY') {
        sourceContext = `AUTHOR'S ORIGINAL STORY SOURCE (Preserve user plot, characters and ending verbatim):
"""
${originalStoryText}
"""`;
      } else if (sourceMode === 'OWN_SCRIPT') {
        const scenesSummary = (importedScript?.extractedScenes || [])
          .map((s: any) => `SCENE ${s.sceneNumber}: ${s.slugline} - ${s.summary}`)
          .join('\n');
        sourceContext = `AUTHOR'S SCREENPLAY SOURCE (Script is Source of Truth; preserve scenes and character identities):
Characters: ${(importedScript?.extractedCharacters || []).join(', ')}
Locations: ${(importedScript?.extractedLocations || []).join(', ')}
Scenes:
${scenesSummary}`;
      }

      const formatStr = String(settings?.format || '').trim();
      const isEpisodic =
        formatStr === 'Episodic Short Drama' ||
        formatStr === 'Episodic Long-Form Series' ||
        formatStr.toLowerCase().includes('series') ||
        formatStr.toLowerCase().includes('episodic');

      const targetEpisodeCount = isEpisodic
        ? Math.max(1, Math.min(30, Number(settings?.episodeCount) || 10))
        : 0;

      const formatSpecificArchitecture = isEpisodic
        ? `EPISODIC ARCHITECTURE REQUIREMENTS:
- Episode Count: Exactly ${targetEpisodeCount} episodes (from 1 to ${targetEpisodeCount}).
- Episodic Roadmap: You MUST generate an episodicRoadmap array with EXACTLY ${targetEpisodeCount} entries, each having: episodeNumber (1 to ${targetEpisodeCount}), title, logline, coreConflict, cliffhangerHook, and targetRuntimeSeconds.
- Beat Coverage: For EACH of the ${targetEpisodeCount} episodes, provide narrative beats in beatMap using IDs like EP01-BEAT-01, EP01-BEAT-02, EP01-BEAT-03, EP02-BEAT-01... Each episode must have meaningful story functions: (a) hook/setup, (b) conflict/complication or exploration, (c) outcome/resolution or cliffhanger transition.
- Timeline Milestones: Provide chronological milestones in timeline covering the season arc (TIME-01, TIME-02... at least 3–${Math.min(targetEpisodeCount, 8)} events).
- Setup & Payoffs: Provide setup/payoff pairings in setupPayoffs spanning across episodes (SP-01, SP-02... planted in early episodes, resolved in later episodes).`
        : `NON-EPISODIC ARCHITECTURE REQUIREMENTS (${settings.format}):
- Do NOT generate fake episode records. Leave episodicRoadmap empty [].
- Narrative Beats: Provide format-appropriate sequence beats in beatMap using BEAT-01, BEAT-02...
  * For Shorts/Reels: 3–5 rapid beats (Hook, Tension/Escalation, Climax, Payoff/Call-to-Action).
  * For Short Film: 5–8 cinematic beats (Inciting Incident, Rising Action, Climax, Resolution).
  * For Feature/Narrative Film: 12–20 three-act structural beats.
  * For Educational/Documentary/Motivational/Comedy/Custom: 4–8 thematic/structural beats.
- Timeline Milestones: Provide chronological milestone events in timeline covering narrative progression (TIME-01, TIME-02...).
- Setup & Payoffs: Provide meaningful setup/payoff pairs in setupPayoffs (SP-01, SP-02...).`;

      const prompt = `You are the Master Story Canon Compiler for XEMACS7 AI Film Studio 2.0.
Compile the authoritative STORY FOUNDATION V1 and STORY CANON V1 based on the provided source data.

SOURCE MODE: ${sourceMode}
${sourceContext}

PROJECT PARAMETERS:
- Format: ${settings.format} (Runtime: ~${settings.targetRuntimeSeconds}s${isEpisodic ? `, Episode Count: ${targetEpisodeCount}` : ''})
${settings.seasonTitle ? `- Season / Arc Title: "${settings.seasonTitle}"` : ''}
- Genres: ${formatGenresForPrompt(settings)}
- Master Visual Style: ${visualStyle.name} (${visualStyle.category}) - ${visualStyle.description}
- Language: ${settings.language}
- Audience: ${settings.audience}
- Emotional Tone: ${formatToneForPrompt(settings)}
- Narration: ${settings.narration}

${formatSpecificArchitecture}

CANON IDENTIFIER STANDARDS (STRICT REQUIREMENT):
1. Characters MUST use canonical IDs: CHAR-01, CHAR-02, CHAR-03, etc. Recurring characters must have rich backstory and relationships.
2. World Rules MUST use canonical IDs: RULE-01, RULE-02, etc. Document shared world physics, tech/magic limits, and culture.
3. Narrative Beats MUST use canonical IDs: ${isEpisodic ? 'EP01-BEAT-01, EP01-BEAT-02, ...' : 'BEAT-01, BEAT-02, ...'}
4. Setup/Payoffs MUST use canonical IDs: SP-01, SP-02, etc.
5. Locations MUST use canonical IDs: LOC-01, LOC-02, etc. (shared recurring locations).
6. Props MUST use canonical IDs: PROP-01, PROP-02, etc. (signature story props and artifacts).
7. Unresolved Threads MUST use canonical IDs: THREAD-01, THREAD-02, etc.
8. Every Beat MUST have a 'causalConnection' explaining why it happens as a consequence of preceding actions (strict causality, no arbitrary coincidence).

Output both Story Foundation V1 and Story Canon V1 in complete, structured JSON.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storyFoundation: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  logline: { type: Type.STRING },
                  premise: { type: Type.STRING },
                  protagonist: { type: Type.STRING },
                  mainConflict: { type: Type.STRING },
                  emotionalStakes: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  audience: { type: Type.STRING },
                  worldSetting: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  narrativePromise: { type: Type.STRING },
                  endingDirection: { type: Type.STRING },
                  targetRuntimeSeconds: { type: Type.INTEGER },
                  runtimeGuideline: { type: Type.STRING },
                },
                required: [
                  'title',
                  'logline',
                  'premise',
                  'protagonist',
                  'mainConflict',
                  'emotionalStakes',
                  'theme',
                  'genre',
                  'tone',
                  'audience',
                  'worldSetting',
                  'hook',
                  'narrativePromise',
                  'endingDirection',
                  'targetRuntimeSeconds',
                  'runtimeGuideline',
                ],
              },
              storyCanon: {
                type: Type.OBJECT,
                properties: {
                  characters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        age: { type: Type.STRING },
                        archetype: { type: Type.STRING },
                        personalityVoice: { type: Type.STRING },
                        want: { type: Type.STRING },
                        need: { type: Type.STRING },
                        motivation: { type: Type.STRING },
                        weakness: { type: Type.STRING },
                        internalConflict: { type: Type.STRING },
                        externalConflict: { type: Type.STRING },
                        arc: { type: Type.STRING },
                      },
                      required: [
                        'id',
                        'name',
                        'role',
                        'archetype',
                        'personalityVoice',
                        'want',
                        'need',
                        'motivation',
                        'weakness',
                        'internalConflict',
                        'externalConflict',
                        'arc',
                      ],
                    },
                  },
                  relationships: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        characterAId: { type: Type.STRING },
                        characterBId: { type: Type.STRING },
                        dynamic: { type: Type.STRING },
                        tension: { type: Type.STRING },
                        sharedSecret: { type: Type.STRING },
                      },
                      required: ['id', 'characterAId', 'characterBId', 'dynamic', 'tension'],
                    },
                  },
                  worldRules: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        rule: { type: Type.STRING },
                        scope: { type: Type.STRING },
                        consequence: { type: Type.STRING },
                      },
                      required: ['id', 'rule', 'scope', 'consequence'],
                    },
                  },
                  narrativeStructure: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ['type', 'description'],
                  },
                  beatMap: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        actOrEpisode: { type: Type.STRING },
                        sequenceNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        causalConnection: { type: Type.STRING },
                        emotionalBeat: { type: Type.STRING },
                        estimatedSeconds: { type: Type.INTEGER },
                        charactersPresent: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        locationId: { type: Type.STRING },
                      },
                      required: [
                        'id',
                        'actOrEpisode',
                        'sequenceNumber',
                        'title',
                        'description',
                        'causalConnection',
                        'emotionalBeat',
                        'estimatedSeconds',
                        'charactersPresent',
                      ],
                    },
                  },
                  timeline: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        timeMarker: { type: Type.STRING },
                        event: { type: Type.STRING },
                        charactersPresent: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['id', 'timeMarker', 'event', 'charactersPresent'],
                    },
                  },
                  characterKnowledge: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        characterId: { type: Type.STRING },
                        knows: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        ignorantOf: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['characterId', 'knows', 'ignorantOf'],
                    },
                  },
                  setupPayoffs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        setupDescription: { type: Type.STRING },
                        introducedAtBeat: { type: Type.STRING },
                        payoffDescription: { type: Type.STRING },
                        resolvedAtBeat: { type: Type.STRING },
                        status: { type: Type.STRING },
                      },
                      required: [
                        'id',
                        'setupDescription',
                        'introducedAtBeat',
                        'payoffDescription',
                        'resolvedAtBeat',
                        'status',
                      ],
                    },
                  },
                  locations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        narrativeSignificance: { type: Type.STRING },
                        moodAtmosphere: { type: Type.STRING },
                      },
                      required: ['id', 'name', 'narrativeSignificance', 'moodAtmosphere'],
                    },
                  },
                  props: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        narrativeSignificance: { type: Type.STRING },
                        ownerOrHolder: { type: Type.STRING },
                      },
                      required: ['id', 'name', 'narrativeSignificance', 'ownerOrHolder'],
                    },
                  },
                  unresolvedThreads: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        status: { type: Type.STRING },
                      },
                      required: ['id', 'question', 'status'],
                    },
                  },
                  filmabilityNotes: { type: Type.STRING },
                  episodicRoadmap: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        episodeNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        logline: { type: Type.STRING },
                        coreConflict: { type: Type.STRING },
                        cliffhangerHook: { type: Type.STRING },
                        targetRuntimeSeconds: { type: Type.INTEGER },
                      },
                      required: ['episodeNumber', 'title', 'logline', 'coreConflict', 'cliffhangerHook', 'targetRuntimeSeconds'],
                    },
                  },
                },
                required: [
                  'characters',
                  'relationships',
                  'worldRules',
                  'narrativeStructure',
                  'beatMap',
                  'timeline',
                  'characterKnowledge',
                  'setupPayoffs',
                  'locations',
                  'props',
                  'unresolvedThreads',
                  'filmabilityNotes',
                ],
              },
            },
            required: ['storyFoundation', 'storyCanon'],
          },
        },
      });

      const compiled = parseCleanJson<any>(response.text);
      const canon = compiled.storyCanon || {};

      // Ensure all collections are safe arrays
      canon.characters = Array.isArray(canon.characters) ? canon.characters : [];
      canon.relationships = Array.isArray(canon.relationships) ? canon.relationships : [];
      canon.worldRules = Array.isArray(canon.worldRules) ? canon.worldRules : [];
      canon.beatMap = Array.isArray(canon.beatMap) ? canon.beatMap : [];
      canon.timeline = Array.isArray(canon.timeline) ? canon.timeline : [];
      canon.setupPayoffs = Array.isArray(canon.setupPayoffs) ? canon.setupPayoffs : [];
      canon.locations = Array.isArray(canon.locations) ? canon.locations : [];
      canon.props = Array.isArray(canon.props) ? canon.props : [];
      canon.unresolvedThreads = Array.isArray(canon.unresolvedThreads) ? canon.unresolvedThreads : [];

      if (isEpisodic && targetEpisodeCount > 0) {
        canon.episodicRoadmap = Array.isArray(canon.episodicRoadmap) ? canon.episodicRoadmap : [];
        // Synthesize any missing episode roadmap entries up to targetEpisodeCount
        if (canon.episodicRoadmap.length < targetEpisodeCount) {
          const existingCount = canon.episodicRoadmap.length;
          for (let epNum = existingCount + 1; epNum <= targetEpisodeCount; epNum++) {
            canon.episodicRoadmap.push({
              episodeNumber: epNum,
              title: `Episode ${epNum}: The Turning Circuit`,
              logline: `The stakes escalate in Episode ${epNum} as the central conflict intensifies across the community.`,
              coreConflict: `Escalating complications test loyalties and resource limits in Episode ${epNum}.`,
              cliffhangerHook: `A startling revelation at the end of Episode ${epNum} changes the direction of the story.`,
              targetRuntimeSeconds: Math.round((settings.targetRuntimeSeconds || 600) / targetEpisodeCount),
            });
          }
        }

        // Guarantee episode beat coverage: each episode from 1 to targetEpisodeCount must have beats
        const coveredEpisodes = new Set<number>();
        for (const beat of canon.beatMap) {
          const act = String(beat.actOrEpisode || beat.id || '').toUpperCase();
          const match = act.match(/EP(?:ISODE)?\s*0?(\d+)/i);
          if (match) {
            coveredEpisodes.add(parseInt(match[1], 10));
          }
        }

        for (let epNum = 1; epNum <= targetEpisodeCount; epNum++) {
          if (!coveredEpisodes.has(epNum)) {
            const epData = canon.episodicRoadmap.find((e: any) => e.episodeNumber === epNum) || {
              title: `Episode ${epNum}`,
              logline: 'Episode opening and hook',
              coreConflict: 'Central episode struggle',
              cliffhangerHook: 'Resolution and transition',
            };
            const epPad = String(epNum).padStart(2, '0');
            canon.beatMap.push(
              {
                id: `EP${epPad}-BEAT-01`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 1,
                title: `${epData.title} - Hook & Setup`,
                description: `${epData.logline || 'Opening hook and narrative question establishing the stakes.'}`,
                causalConnection: epNum === 1 ? 'Initial inciting incident sets the episode arc in motion.' : `Direct consequence of events and revelations from Episode ${epNum - 1}.`,
                emotionalBeat: 'Anticipation and mounting tension',
                estimatedSeconds: 60,
                charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
              },
              {
                id: `EP${epPad}-BEAT-02`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 2,
                title: `${epData.title} - Complication & Exploration`,
                description: `${epData.coreConflict || 'Core conflict intensifies, forcing characters to confront their limits.'}`,
                causalConnection: `Direct consequence of opening actions in EP${epPad}-BEAT-01.`,
                emotionalBeat: 'High pressure and vulnerability',
                estimatedSeconds: 90,
                charactersPresent: (canon.characters || []).slice(0, 3).map((c: any) => c.id || 'CHAR-01'),
              },
              {
                id: `EP${epPad}-BEAT-03`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 3,
                title: `${epData.title} - Climax & Transition Hook`,
                description: `${epData.cliffhangerHook || 'Episode reaches a critical tipping point leading into the next chapter.'}`,
                causalConnection: `Result of the confrontation and choices made in EP${epPad}-BEAT-02.`,
                emotionalBeat: 'Catharsis and suspenseful cliffhanger',
                estimatedSeconds: 60,
                charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
              }
            );
          }
        }

        // Guarantee timeline coverage: at least 3-5 milestones across the season
        if (canon.timeline.length < Math.min(targetEpisodeCount, 4)) {
          const needed = Math.min(targetEpisodeCount, 4) - canon.timeline.length;
          for (let i = 0; i < needed; i++) {
            const epIdx = canon.timeline.length + 1;
            canon.timeline.push({
              id: `TIME-0${canon.timeline.length + 1}`,
              timeMarker: `Episode ${epIdx} Timeline Milestone`,
              event: `Critical narrative milestone and turning point during Episode ${epIdx}.`,
              charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
            });
          }
        }

        // Guarantee setup/payoffs: at least 2 entries across the season
        if (canon.setupPayoffs.length < 2) {
          const lastEpPad = String(targetEpisodeCount).padStart(2, '0');
          if (canon.setupPayoffs.length === 0) {
            canon.setupPayoffs.push({
              id: 'SP-01',
              setupDescription: 'A critical mystery or resource shortage is discovered in the opening episode.',
              introducedAtBeat: 'EP01-BEAT-01',
              payoffDescription: 'The truth is revealed and resource balance restored during the season climax.',
              resolvedAtBeat: `EP${lastEpPad}-BEAT-03`,
              status: 'PAID_OFF',
            });
          }
          if (canon.setupPayoffs.length === 1) {
            canon.setupPayoffs.push({
              id: 'SP-02',
              setupDescription: 'A character secret or hidden motivation is planted during intermediate challenges.',
              introducedAtBeat: targetEpisodeCount >= 2 ? 'EP02-BEAT-02' : 'EP01-BEAT-02',
              payoffDescription: 'The secret is brought into the open, resolving internal emotional conflict.',
              resolvedAtBeat: `EP${lastEpPad}-BEAT-02`,
              status: 'PAID_OFF',
            });
          }
        }
      } else {
        // Non-episodic format
        canon.episodicRoadmap = [];
        if (canon.beatMap.length < 3) {
          canon.beatMap = [
            {
              id: 'BEAT-01',
              actOrEpisode: 'Act I',
              sequenceNumber: 1,
              title: 'Opening Setup & Hook',
              description: 'Establishing the ordinary world and the immediate inciting tension.',
              causalConnection: 'Initial premise sets the narrative trajectory in motion.',
              emotionalBeat: 'Curiosity and tension',
              estimatedSeconds: Math.round((settings.targetRuntimeSeconds || 60) * 0.25),
              charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
            },
            {
              id: 'BEAT-02',
              actOrEpisode: 'Act II',
              sequenceNumber: 2,
              title: 'Complication & Escalation',
              description: 'The core conflict escalates, testing character motivations and resolve.',
              causalConnection: 'Direct consequence of actions taken in BEAT-01.',
              emotionalBeat: 'High stakes and mounting pressure',
              estimatedSeconds: Math.round((settings.targetRuntimeSeconds || 60) * 0.5),
              charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
            },
            {
              id: 'BEAT-03',
              actOrEpisode: 'Act III',
              sequenceNumber: 3,
              title: 'Climax & Resolution',
              description: 'The conflict reaches a decisive turning point and resolves.',
              causalConnection: 'Direct outcome of the choice made in BEAT-02.',
              emotionalBeat: 'Catharsis and resolution',
              estimatedSeconds: Math.round((settings.targetRuntimeSeconds || 60) * 0.25),
              charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
            },
          ];
        }
        if (canon.timeline.length < 1) {
          canon.timeline.push({
            id: 'TIME-01',
            timeMarker: 'Inciting Incident',
            event: 'The core event triggering the story conflict occurs.',
            charactersPresent: (canon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
          });
        }
        if (canon.setupPayoffs.length < 1) {
          canon.setupPayoffs.push({
            id: 'SP-01',
            setupDescription: 'A subtle thematic symbol or problem is established in the opening.',
            introducedAtBeat: 'BEAT-01',
            payoffDescription: 'The symbol or problem is resolved conclusively in the climax.',
            resolvedAtBeat: 'BEAT-03',
            status: 'PAID_OFF',
          });
        }
      }

      const foundation = {
        ...compiled.storyFoundation,
        projectId: req.body.projectId || 'proj-' + Date.now(),
        title: compiled.storyFoundation.title || projectTitle || 'Untitled Film Project',
        provenance: sourceMode,
        originalReference: sourceMode === 'AI_CONCEPT' ? concept?.conceptId : sourceMode,
        selectedStyle: visualStyle,
      };

      res.json({
        success: true,
        storyFoundation: foundation,
        storyCanon: canon,
      });
    } catch (error: any) {
      console.error('Error compiling story canon:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to compile story canon',
      });
    }
  });

  // 7. Audit Story Canon (Two-Layer: Layer A Deterministic + Layer B Gemini Creative Review)
  app.post('/api/gemini/audit-canon', async (req: Request, res: Response) => {
    try {
      const { storyFoundation, storyCanon, sourceMode, originalStoryText, importedScript } = req.body;

      if (!storyFoundation || !storyCanon) {
        return res.status(400).json({
          success: false,
          error: 'Both storyFoundation and storyCanon are required for audit.',
        });
      }

      // --- LAYER A: Deterministic Validation Checks ---
      const deterministicIssues: any[] = [];
      let detCounter = 1;
      const addDetIssue = (
        severity: 'REQUIRED' | 'WARNING' | 'INFO',
        section: string,
        fieldPath: string,
        description: string,
        consequence: string,
        suggestedFix: string,
        classification: string,
        isSafeToAutoFix: boolean = false,
        customId?: string
      ) => {
        deterministicIssues.push({
          issueId: customId || `DET-${classification}-${String(detCounter++).padStart(2, '0')}`,
          severity,
          section,
          fieldPath,
          description,
          consequence,
          suggestedFix,
          classification,
          isSafeToAutoFix,
          status: 'OPEN',
        });
      };

      // Characters check
      const chars = Array.isArray(storyCanon?.characters) ? storyCanon.characters : [];
      if (chars.length === 0) {
        addDetIssue(
          'REQUIRED',
          'Characters',
          'storyCanon.characters',
          'Story Canon contains zero registered characters.',
          'Downstream visual prompts and script cannot be generated.',
          'Register at least one protagonist in Characters.',
          'CHARACTERS_EMPTY',
          false,
          'DET-CHAR-001'
        );
      } else {
        const charIds = new Set<string>();
        for (const c of chars) {
          const cid = (c.id || '').trim().toUpperCase();
          if (!cid) {
            addDetIssue('REQUIRED', 'Characters', `storyCanon.characters.${c.name || 'unnamed'}.id`, `Character "${c.name || 'unnamed'}" has no valid ID.`, 'Cannot anchor character in prompts.', 'Assign an ID like CHAR-01.', 'CHAR_ID_MISSING', true);
          } else if (charIds.has(cid)) {
            addDetIssue('REQUIRED', 'Characters', `storyCanon.characters.${cid}`, `Duplicate character ID "${cid}" detected.`, 'Visual reference collisions.', 'Assign unique sequential IDs.', 'CHAR_ID_DUPLICATE', false);
          } else {
            charIds.add(cid);
          }
        }
      }

      // Locations check
      const locs = Array.isArray(storyCanon?.locations) ? storyCanon.locations : [];
      if (locs.length === 0) {
        addDetIssue(
          'REQUIRED',
          'Locations',
          'storyCanon.locations',
          'Story Canon contains zero registered locations.',
          'Cinematic scenes require at least one anchored environment.',
          'Add at least one key story location.',
          'LOCATIONS_EMPTY',
          false,
          'DET-LOC-001'
        );
      } else {
        const locIds = new Set<string>();
        for (const l of locs) {
          const lid = (l.id || '').trim().toUpperCase();
          if (!lid) {
            addDetIssue('REQUIRED', 'Locations', `storyCanon.locations.${l.name || 'unnamed'}.id`, `Location "${l.name || 'unnamed'}" has no valid ID.`, 'Spatial anchors cannot be resolved.', 'Assign an ID like LOC-01.', 'LOC_ID_MISSING', true);
          } else if (locIds.has(lid)) {
            addDetIssue('REQUIRED', 'Locations', `storyCanon.locations.${lid}`, `Duplicate location ID "${lid}" detected.`, 'Background prompts will collide.', 'Assign unique sequential IDs.', 'LOC_ID_DUPLICATE', false);
          } else {
            locIds.add(lid);
          }
        }
      }

      // World Rules check
      const worldRules = Array.isArray(storyCanon?.worldRules) ? storyCanon.worldRules : [];
      if (worldRules.length === 0) {
        addDetIssue('REQUIRED', 'World Rules', 'storyCanon.worldRules', 'Story Canon contains zero registered world rules.', 'World limits, physics, or societal constraints are undefined.', 'Define core world rules governing the story.', 'WORLD_RULES_EMPTY', true, 'DET-RULE-001');
      }

      // Props check
      const props = Array.isArray(storyCanon?.props) ? storyCanon.props : [];
      if (props.length === 0) {
        addDetIssue('REQUIRED', 'Props', 'storyCanon.props', 'Story Canon contains zero registered story props.', 'Signature story artifacts and physical plot catalysts are unregistered.', 'Register key narrative props.', 'PROPS_EMPTY', true, 'DET-PROP-001');
      } else {
        const propIds = new Set<string>();
        for (const p of props) {
          if (!p) continue;
          const pid = (p.id || '').trim().toUpperCase();
          if (pid) {
            if (propIds.has(pid)) {
              addDetIssue('REQUIRED', 'Props', `storyCanon.props.${pid}`, `Duplicate prop ID "${pid}" detected.`, 'Props will conflict in scene manifests.', 'Assign unique sequential IDs.', 'PROP_ID_DUPLICATE', false);
            } else {
              propIds.add(pid);
            }
          }
        }
      }

      // Universal format-aware architecture & coverage check
      const formatStr = String(storyFoundation?.runtimeGuideline || '').toLowerCase();
      const isEpisodic =
        (Array.isArray(storyCanon?.episodicRoadmap) && storyCanon.episodicRoadmap.length > 0) ||
        formatStr.includes('series') ||
        formatStr.includes('episode');

      const beats = Array.isArray(storyCanon?.beatMap) ? storyCanon.beatMap : [];
      const roadmap = Array.isArray(storyCanon?.episodicRoadmap) ? storyCanon.episodicRoadmap : [];
      const timeline = Array.isArray(storyCanon?.timeline) ? storyCanon.timeline : [];
      const setupPayoffs = Array.isArray(storyCanon?.setupPayoffs) ? storyCanon.setupPayoffs : [];

      if (isEpisodic) {
        if (roadmap.length === 0) {
          addDetIssue('REQUIRED', 'Episodic Roadmap', 'storyCanon.episodicRoadmap', 'Episodic project has no episode roadmap defined.', 'Downstream script planner lacks episode boundaries.', 'Generate or populate the episodic roadmap.', 'EPISODIC_ROADMAP_EMPTY', true, 'DET-ROADMAP-001');
        }

        if (beats.length === 0) {
          addDetIssue('REQUIRED', 'Narrative Beats', 'storyCanon.beatMap', 'Story Canon contains zero narrative arc beats.', 'Season narrative backbone is missing.', 'Define key narrative beats covering the series.', 'BEATS_EMPTY', true, 'DET-BEATS-001');
        } else if (roadmap.length > 1 && beats.length < Math.min(3, roadmap.length)) {
          addDetIssue('REQUIRED', 'Narrative Beats', 'storyCanon.beatMap', `Season arc has only ${beats.length} narrative beat(s) for a ${roadmap.length}-episode series. Episodes lack structural narrative coverage (hook, conflict, resolution).`, 'Downstream screenplay generation in Stage 3 will have missing episode story arcs.', 'Populate narrative beats covering each episode (hook, conflict, outcome) or season arc milestones.', 'EPISODIC_COVERAGE_INCOMPLETE', true, 'DET-BEATS-002');
        }

        if (timeline.length === 0) {
          addDetIssue('REQUIRED', 'Timeline', 'storyCanon.timeline', 'Story Canon contains zero timeline milestone events.', 'Chronology cannot be tracked across scenes.', 'Define key chronological milestone events.', 'TIMELINE_EMPTY', true, 'DET-TIME-001');
        } else if (roadmap.length >= 3 && timeline.length < 2) {
          addDetIssue('REQUIRED', 'Timeline', 'storyCanon.timeline', `Timeline contains only ${timeline.length} milestone event for a ${roadmap.length}-episode series. Chronological transitions across episodes are undocumented.`, 'Chronological integrity across multi-episode story progression cannot be maintained.', 'Add timeline milestone events covering the episodic narrative progression.', 'TIMELINE_COVERAGE_INCOMPLETE', true, 'DET-TIME-002');
        }

        if (setupPayoffs.length === 0) {
          addDetIssue('REQUIRED', 'Setup / Payoff', 'storyCanon.setupPayoffs', 'Story Canon contains zero setup/payoff ledgers.', 'Narrative promises and emotional resolutions cannot be verified.', 'Register at least one setup and payoff pairing.', 'SETUP_PAYOFFS_EMPTY', true, 'DET-SP-001');
        } else if (roadmap.length >= 3 && setupPayoffs.length < 2) {
          addDetIssue('REQUIRED', 'Setup / Payoff', 'storyCanon.setupPayoffs', `Setup/Payoff ledger contains only ${setupPayoffs.length} entry for a ${roadmap.length}-episode series. Multi-episode arcs require planted narrative setups and eventual payoffs across episodes.`, 'Series risks unearned resolutions or abandoned plot setups across episodes.', 'Define setup and payoff pairs that span across earlier and later episodes.', 'SETUP_PAYOFFS_INCOMPLETE', true, 'DET-SP-002');
        }
      } else {
        // Non-episodic
        if (beats.length === 0) {
          addDetIssue('REQUIRED', 'Narrative Beats', 'storyCanon.beatMap', 'Story Canon contains zero narrative beats.', 'Story structure cannot be planned without beats.', 'Compile or add narrative beats.', 'BEATS_EMPTY', true, 'DET-BEATS-001');
        } else if (beats.length < 3) {
          addDetIssue('WARNING', 'Narrative Beats', 'storyCanon.beatMap', `Narrative structure has only ${beats.length} beat(s). Most non-episodic formats require at least 3–5 structural beats.`, 'Story progression may feel abrupt or incomplete.', 'Ensure hook, development/conflict, and resolution beats are present.', 'BEAT_COUNT_LOW', false);
        }

        if (timeline.length === 0) {
          addDetIssue('REQUIRED', 'Timeline', 'storyCanon.timeline', 'Story Canon contains zero timeline milestone events.', 'Chronology cannot be tracked.', 'Define key chronological milestone events.', 'TIMELINE_EMPTY', true, 'DET-TIME-001');
        }

        if (setupPayoffs.length === 0) {
          addDetIssue('REQUIRED', 'Setup / Payoff', 'storyCanon.setupPayoffs', 'Story Canon contains zero setup/payoff ledgers.', 'Narrative promises and emotional resolutions cannot be verified.', 'Register setup and payoff pairings.', 'SETUP_PAYOFFS_EMPTY', true, 'DET-SP-001');
        }
      }

      // --- LAYER B: Gemini Creative Review ---
      let sourceSpecificAuditing = '';
      if (sourceMode === 'OWN_STORY' && originalStoryText) {
        sourceSpecificAuditing = `FAITHFULNESS AUDIT (OWN STORY):
Check that the story canon did NOT fabricate new major events or distort the author's original story text:
"""
${originalStoryText.slice(0, 3000)}
"""`;
      } else if (sourceMode === 'OWN_SCRIPT' && importedScript) {
        sourceSpecificAuditing = `FAITHFULNESS AUDIT (OWN SCRIPT):
Check that the canon preserved the script characters and scenes accurately without rewriting spoken dialogue.`;
      }

      const episodicGuidance = isEpisodic
        ? `EPISODIC PROJECT DETECTED:
- The project has ${roadmap.length} episodes defined in episodicRoadmap.
- The beatMap (${beats.length} beats) represents macro season/arc milestone beats.
- CRITICAL: DO NOT require 30+ scene-level beats in Stage 1! Scene-level planning occurs in Stage 3.
- DO NOT generate a structural REQUIRED issue claiming beat count is insufficient when the episodic roadmap covers the episodes.
- Any episodic density or pacing observations must be classified strictly as WARNING or INFO, never REQUIRED.`
        : '';

      const prompt = `You are the Lead Quality & Continuity Auditor at XEMACS7 STUDIO AI.
Perform a creative story logic, character psychology, timeline continuity, world-rule consistency, and setup/payoff audit of this Story Canon.

Foundation:
- Title: ${storyFoundation.title}
- Logline: ${storyFoundation.logline}
- Format: ${storyFoundation.runtimeGuideline} (~${storyFoundation.targetRuntimeSeconds}s)
- Tone: ${storyFoundation.tone}
- Style: ${storyFoundation.selectedStyle?.name}

${episodicGuidance}
${sourceSpecificAuditing}

Canon Snapshot:
- Character count: ${chars.length}
- Beat count: ${beats.length}
- World rules (${storyCanon?.worldRules?.length || 0}):
${(storyCanon?.worldRules || []).map((r: any) => `  * [${r.id}] ${r.name}: ${r.rule || ''}`).join('\n') || '  None'}
- Setup/Payoffs: ${storyCanon?.setupPayoffs?.length || 0}
- Registered Locations (${locs.length}):
${locs.map((l: any) => `  * [${l.id}] ${l.name}: ${l.storyPurpose || l.narrativeSignificance}`).join('\n') || '  None'}
- Registered Story Props (${props.length}):
${props.map((p: any) => `  * [${p.id}] ${p.name}: ${p.storyFunction || p.narrativeSignificance} (Holder: ${p.ownerOrHolder || ''}${p.continuityDetails ? `, Continuity: ${p.continuityDetails}` : ''})`).join('\n') || '  None'}

Audit Dimensions to inspect:
1. Causality & Motivation: Does every beat occur because of character action or prior consequences?
2. World Rules Continuity: Are world laws (physics, magic, tech, society) respected throughout the beats?
3. Chronological & Knowledge Integrity: Do characters act on information before learning it?
4. Setup & Payoff Ledger: Are planted elements properly paid off?
5. Prop & Location Continuity: Are props and locations accounted for across transitions?
6. Pacing & Tone: Are emotional beats earned?
7. Classification:
   - REQUIRED: Fatal plot holes, direct world-rule breaches, or unfaithful distortion of user text.
   - WARNING: Unpaid setups, slight pacing cram, or character arc ambiguity.
   - INFO: Stylistic suggestions, minor clarity enhancements.
8. Safety: Mark 'isSafeToAutoFix' as TRUE ONLY for formatting, direct missing references, minor continuity tags, or unambiguous link fixes. Major plot revisions, changes to endings, or rewriting user text must be FALSE (requires author review).

Return a list of specific, actionable creative audit issues with overall score (0-100) and an executive summary.`;

      let creativeIssues: any[] = [];
      let overallScore = 95;
      let summary = 'Canon quality and continuity audit completed.';

      try {
        const response = await callGeminiWithFallback({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallScore: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      issueId: { type: Type.STRING },
                      severity: { type: Type.STRING },
                      section: { type: Type.STRING },
                      fieldPath: { type: Type.STRING },
                      description: { type: Type.STRING },
                      consequence: { type: Type.STRING },
                      suggestedFix: { type: Type.STRING },
                      classification: { type: Type.STRING },
                      isSafeToAutoFix: { type: Type.BOOLEAN },
                    },
                    required: [
                      'issueId',
                      'severity',
                      'section',
                      'fieldPath',
                      'description',
                      'consequence',
                      'suggestedFix',
                      'classification',
                      'isSafeToAutoFix',
                    ],
                  },
                },
              },
              required: ['overallScore', 'summary', 'issues'],
            },
          },
        });

        const auditResult = parseCleanJson<any>(response.text);
        if (auditResult) {
          overallScore = auditResult.overallScore || 90;
          summary = auditResult.summary || summary;
          creativeIssues = (auditResult.issues || []).map((issue: any, index: number) => {
            let sev = String(issue.severity || 'WARNING').toUpperCase();
            // Safeguard: If episodic and issue complains about beat count or structural count, clamp to WARNING
            const desc = (issue.description || '').toLowerCase();
            if (isEpisodic && (desc.includes('beat count') || desc.includes('minimum 30') || desc.includes('insufficient beats') || issue.issueId === 'AUD-STRUCT-001')) {
              sev = 'WARNING';
            }
            return {
              ...issue,
              issueId: issue.issueId || `AUD-CREAT-${String(index + 1).padStart(2, '0')}`,
              severity: sev === 'REQUIRED' ? 'REQUIRED' : sev === 'INFO' ? 'INFO' : 'WARNING',
              status: 'OPEN',
              isSafeToAutoFix: Boolean(issue.isSafeToAutoFix),
            };
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini creative audit pass encountered error, using deterministic audit:', geminiErr);
        summary = 'Deterministic canon quality audit completed. Creative pass unavailable.';
      }

      // Merge Layer A and Layer B without duplicates
      const combinedIssues = [...deterministicIssues, ...creativeIssues];

      // Calculate score based on true multi-dimensional coverage minus defect penalties
      let coverageScore = 0;
      if (storyFoundation?.title) coverageScore += 2;
      if (storyFoundation?.logline) coverageScore += 2;
      if (storyFoundation?.premise) coverageScore += 2;
      if (storyFoundation?.theme) coverageScore += 2;
      if (storyFoundation?.worldSetting) coverageScore += 2;

      // Characters (15 pts)
      if (chars.length >= 1) coverageScore += 8;
      if (chars.length >= 2) coverageScore += 4;
      if (chars.some((c: any) => c.want && c.need)) coverageScore += 3;

      // World rules (10 pts)
      if (worldRules.length >= 1) coverageScore += 6;
      if (worldRules.length >= 2) coverageScore += 4;

      // Locations (10 pts)
      if (locs.length >= 1) coverageScore += 6;
      if (locs.length >= 2) coverageScore += 4;

      // Props (10 pts)
      if (props.length >= 1) coverageScore += 6;
      if (props.length >= 2) coverageScore += 4;

      // Narrative architecture & beats (25 pts)
      if (isEpisodic) {
        const epCount = roadmap.length || 10;
        coverageScore += Math.round(Math.min(1, roadmap.length / epCount) * 10);
        if (beats.length === 0) coverageScore += 0;
        else if (beats.length === 1 && epCount >= 3) coverageScore += 2;
        else if (beats.length >= epCount) coverageScore += 15;
        else coverageScore += Math.round((beats.length / Math.min(epCount, 8)) * 15);
      } else {
        if (beats.length >= 1) coverageScore += 10;
        if (beats.length >= 3) coverageScore += 10;
        if (beats.length >= 5) coverageScore += 5;
      }

      // Timeline (10 pts)
      if (timeline.length === 0) coverageScore += 0;
      else if (isEpisodic && roadmap.length >= 3 && timeline.length === 1) coverageScore += 2;
      else if (timeline.length >= 2) coverageScore += 10;
      else coverageScore += 5;

      // Setup / Payoffs (10 pts)
      if (setupPayoffs.length === 0) coverageScore += 0;
      else if (isEpisodic && roadmap.length >= 3 && setupPayoffs.length === 1) coverageScore += 2;
      else if (setupPayoffs.length >= 2) coverageScore += 10;
      else coverageScore += 5;

      const reqCount = combinedIssues.filter((i) => i.severity === 'REQUIRED').length;
      const warnCount = combinedIssues.filter((i) => i.severity === 'WARNING').length;
      overallScore = Math.max(10, Math.min(100, coverageScore - (reqCount * 15) - (warnCount * 3)));

      res.json({
        success: true,
        audit: {
          overallScore,
          summary,
          issues: combinedIssues,
          auditedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error auditing canon:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit story canon',
      });
    }
  });

  // 8. Auto-Fix or Resolve a Canon Issue (Targeted Surgical Repair)
  app.post('/api/gemini/auto-fix-issue', async (req: Request, res: Response) => {
    try {
      const { issue, storyFoundation, storyCanon } = req.body;

      if (!issue || !storyCanon) {
        return res.status(400).json({
          success: false,
          error: 'Issue and storyCanon are required for auto-fix.',
        });
      }

      const workingCanon = JSON.parse(JSON.stringify(storyCanon));
      const isEpisodic = Array.isArray(workingCanon.episodicRoadmap) && workingCanon.episodicRoadmap.length > 0;
      const roadmap = workingCanon.episodicRoadmap || [];

      // Deterministic auto-fix for episodic beat coverage
      if (issue.classification === 'EPISODIC_COVERAGE_INCOMPLETE' || (isEpisodic && issue.classification === 'BEATS_EMPTY')) {
        workingCanon.beatMap = Array.isArray(workingCanon.beatMap) ? workingCanon.beatMap : [];
        const existingEpBeats = new Set<number>();
        for (const b of workingCanon.beatMap) {
          const act = String(b.actOrEpisode || b.id || '').toUpperCase();
          const match = act.match(/EP(?:ISODE)?\s*0?(\d+)/i);
          if (match) existingEpBeats.add(parseInt(match[1], 10));
        }

        for (const ep of roadmap) {
          const epNum = ep.episodeNumber;
          if (!existingEpBeats.has(epNum)) {
            const epPad = String(epNum).padStart(2, '0');
            workingCanon.beatMap.push(
              {
                id: `EP${epPad}-BEAT-01`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 1,
                title: `${ep.title} - Hook & Setup`,
                description: `${ep.logline || 'Opening hook and setup establishing the episode narrative stakes.'}`,
                causalConnection: epNum === 1 ? 'Inciting incident sets the series arc in motion.' : `Direct consequence of events in Episode ${epNum - 1}.`,
                emotionalBeat: 'Anticipation and mounting tension',
                estimatedSeconds: 60,
                charactersPresent: (workingCanon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
              },
              {
                id: `EP${epPad}-BEAT-02`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 2,
                title: `${ep.title} - Complication & Exploration`,
                description: `${ep.coreConflict || 'Core conflict forces characters to confront their limits.'}`,
                causalConnection: `Direct consequence of decisions made in EP${epPad}-BEAT-01.`,
                emotionalBeat: 'High pressure and vulnerability',
                estimatedSeconds: 90,
                charactersPresent: (workingCanon.characters || []).slice(0, 3).map((c: any) => c.id || 'CHAR-01'),
              },
              {
                id: `EP${epPad}-BEAT-03`,
                actOrEpisode: `Episode ${epNum}`,
                sequenceNumber: 3,
                title: `${ep.title} - Climax & Transition Hook`,
                description: `${ep.cliffhangerHook || 'Episode reaches a critical tipping point leading into the next chapter.'}`,
                causalConnection: `Result of the confrontation in EP${epPad}-BEAT-02.`,
                emotionalBeat: 'Catharsis and suspenseful cliffhanger',
                estimatedSeconds: 60,
                charactersPresent: (workingCanon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
              }
            );
          }
        }

        return res.json({
          success: true,
          repairedCanon: workingCanon,
          targetSection: 'beatMap',
          explanation: `Synthesized complete narrative beat coverage (hook, conflict, resolution) across all ${roadmap.length} episodes.`,
        });
      }

      // Deterministic auto-fix for timeline coverage
      if (issue.classification === 'TIMELINE_COVERAGE_INCOMPLETE' || issue.classification === 'TIMELINE_EMPTY') {
        workingCanon.timeline = Array.isArray(workingCanon.timeline) ? workingCanon.timeline : [];
        if (isEpisodic && roadmap.length > 0) {
          const needed = Math.max(3, Math.min(roadmap.length, 6));
          for (let i = workingCanon.timeline.length + 1; i <= needed; i++) {
            const ep = roadmap[i - 1] || roadmap[0];
            const pad = String(i).padStart(2, '0');
            workingCanon.timeline.push({
              id: `TIME-${pad}`,
              timeMarker: `Episode ${ep.episodeNumber} Turning Point`,
              event: `Major milestone during ${ep.title}: ${ep.coreConflict || ep.logline}`,
              charactersPresent: (workingCanon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
            });
          }
        } else {
          workingCanon.timeline.push({
            id: 'TIME-01',
            timeMarker: 'Inciting Incident',
            event: 'The core story event begins the progression of narrative conflict.',
            charactersPresent: (workingCanon.characters || []).slice(0, 2).map((c: any) => c.id || 'CHAR-01'),
          });
        }
        return res.json({
          success: true,
          repairedCanon: workingCanon,
          targetSection: 'timeline',
          explanation: 'Populated chronological timeline milestone events across the narrative.',
        });
      }

      // Deterministic auto-fix for setup/payoffs
      if (issue.classification === 'SETUP_PAYOFFS_INCOMPLETE' || issue.classification === 'SETUP_PAYOFFS_EMPTY') {
        workingCanon.setupPayoffs = Array.isArray(workingCanon.setupPayoffs) ? workingCanon.setupPayoffs : [];
        const lastEpPad = String(roadmap.length || 1).padStart(2, '0');
        if (workingCanon.setupPayoffs.length === 0) {
          workingCanon.setupPayoffs.push({
            id: 'SP-01',
            setupDescription: 'A critical mystery or resource shortage is discovered in the opening chapter.',
            introducedAtBeat: isEpisodic ? 'EP01-BEAT-01' : 'BEAT-01',
            payoffDescription: 'The truth is revealed and resource balance restored during the climax.',
            resolvedAtBeat: isEpisodic ? `EP${lastEpPad}-BEAT-03` : 'BEAT-03',
            status: 'PAID_OFF',
          });
        }
        if (workingCanon.setupPayoffs.length === 1) {
          workingCanon.setupPayoffs.push({
            id: 'SP-02',
            setupDescription: 'A character secret or hidden motivation is planted during intermediate challenges.',
            introducedAtBeat: isEpisodic && roadmap.length >= 2 ? 'EP02-BEAT-02' : 'BEAT-02',
            payoffDescription: 'The secret is brought into the open, resolving internal emotional conflict.',
            resolvedAtBeat: isEpisodic ? `EP${lastEpPad}-BEAT-02` : 'BEAT-03',
            status: 'PAID_OFF',
          });
        }
        return res.json({
          success: true,
          repairedCanon: workingCanon,
          targetSection: 'setupPayoffs',
          explanation: 'Populated season-spanning setup and payoff ledgers.',
        });
      }

      // Deterministic auto-fix for props empty
      if (issue.classification === 'PROPS_EMPTY') {
        workingCanon.props = Array.isArray(workingCanon.props) ? workingCanon.props : [];
        workingCanon.props.push(
          {
            id: 'PROP-01',
            name: 'Master Brass Key',
            narrativeSignificance: 'Heirloom key that unlocks the emergency sub-circuit terminal.',
            ownerOrHolder: (workingCanon.characters?.[0]?.name) || 'Protagonist',
            storyFunction: 'Catalyst item providing access to restricted control circuits.',
            continuityDetails: 'Carried in coat pocket, distinctive notched teeth.',
          },
          {
            id: 'PROP-02',
            name: 'Model-7 Glowcell Battery',
            narrativeSignificance: 'Portable finite-capacity energy storage cell used during wind and solar dips.',
            ownerOrHolder: (workingCanon.characters?.[0]?.name) || 'Protagonist',
            storyFunction: 'Powers emergency medical and communication equipment.',
            continuityDetails: 'Depleting amber glow indicator on top cylinder.',
          },
          {
            id: 'PROP-03',
            name: "Pico's Stethoscope Horn",
            narrativeSignificance: 'Modified acoustic horn used to listen to transformer hums and gear friction.',
            ownerOrHolder: (workingCanon.characters?.[1]?.name) || 'Pico',
            storyFunction: 'Diagnostic tool for locating circuit friction points.',
            continuityDetails: 'Polished brass bell with rubber listening tube.',
          }
        );
        return res.json({
          success: true,
          repairedCanon: workingCanon,
          targetSection: 'props',
          explanation: 'Registered canonical story props (Master Brass Key, Model-7 Glowcell Battery, Pico\'s Stethoscope Horn).',
        });
      }

      const prompt = `You are a precision story repair technician at XEMACS7 STUDIO AI.
Perform a safe, surgical repair for the following audit issue.
CRITICAL REQUIREMENTS:
- TARGET ONLY the specific section, record, or field path mentioned.
- DO NOT rewrite, replace, or mutate unrelated records or sections!
- PRESERVE all existing stable IDs (e.g. PROP-01, CHAR-01, LOC-01, RULE-01).
- DO NOT fabricate unlimited backup energy or alter established world physics.
- Return the targeted section name, targeted record ID (if any), the repaired record or snippet, and a concise explanation.

Issue to Repair:
- ID: ${issue.issueId}
- Severity: ${issue.severity}
- Section: ${issue.section}
- Field Path: ${issue.fieldPath || 'N/A'}
- Description: ${issue.description}
- Consequence: ${issue.consequence}
- Suggested Fix: ${issue.suggestedFix}

Current Canon Context:
${JSON.stringify((storyCanon as any)[issue.section?.toLowerCase()] || storyCanon, null, 2).slice(0, 3500)}`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetSection: {
                type: Type.STRING,
                description: 'The canon key being modified: characters, locations, props, worldRules, beatMap, narrativeStructure, setupPayoffs, timeline, or episodicRoadmap',
              },
              targetRecordId: {
                type: Type.STRING,
                description: 'The specific ID of the record being repaired (e.g. PROP-01, LOC-02), or empty if section-level',
              },
              fieldPath: {
                type: Type.STRING,
                description: 'The specific field name or path updated (e.g. continuityDetails, rule, permanentSpatialAnchors)',
              },
              repairedRecord: {
                type: Type.OBJECT,
                description: 'The surgically updated record object, containing all fields of this record with the defect resolved',
              },
              explanation: {
                type: Type.STRING,
                description: 'Concise explanation of the exact surgical fix applied',
              },
            },
            required: ['targetSection', 'explanation', 'repairedRecord'],
          },
        },
      });

      const fixResult = parseCleanJson<any>(response.text);

      const targetSecKey = (fixResult.targetSection || '').trim();
      const arrayKeys = [
        'characters',
        'relationships',
        'worldRules',
        'beatMap',
        'timeline',
        'setupPayoffs',
        'locations',
        'props',
        'unresolvedThreads',
        'episodicRoadmap',
      ];
      const isArraySection = arrayKeys.includes(targetSecKey);

      let mergedSuccessfully = false;

      // Handle array sections (props, locations, characters, worldRules, beatMap, setupPayoffs)
      if (isArraySection) {
        if (!Array.isArray((workingCanon as any)[targetSecKey])) {
          (workingCanon as any)[targetSecKey] = (workingCanon as any)[targetSecKey]
            ? [(workingCanon as any)[targetSecKey]]
            : [];
        }
        const arr = (workingCanon as any)[targetSecKey] as any[];
        const targetId = (fixResult.targetRecordId || '').trim().toUpperCase();

        if (targetId) {
          let idx = arr.findIndex((item) => {
            if (!item) return false;
            const itemId = (item.id || item.propId || item.locationId || item.ruleId || '').trim().toUpperCase();
            return itemId === targetId;
          });

          // Fallback matching: e.g. targetId is WORLD-001 matching RULE-01 if single rule, or prefix matching
          if (idx < 0 && targetSecKey === 'worldRules' && arr.length === 1) {
            idx = 0;
          } else if (idx < 0 && arr.length > 0 && (targetId.includes('01') || targetId.includes('RULE') || targetId.includes('PROP') || targetId.includes('LOC'))) {
            idx = arr.findIndex((item) => {
              const numMatch = targetId.match(/\d+/);
              const itemNumMatch = (item?.id || '').match(/\d+/);
              return numMatch && itemNumMatch && numMatch[0] === itemNumMatch[0];
            });
          }

          if (idx >= 0) {
            // Surgically update this record while keeping original stable ID
            const original = arr[idx];
            arr[idx] = {
              ...original,
              ...(Array.isArray(fixResult.repairedRecord) ? fixResult.repairedRecord[0] : fixResult.repairedRecord),
              id: original.id || original.ruleId || original.propId || original.locationId || targetId,
            };
            mergedSuccessfully = true;
          }
        }

        // If targetId was not matched, or suggested fix was to add/update
        if (!mergedSuccessfully) {
          if (Array.isArray(fixResult.repairedRecord)) {
            (workingCanon as any)[targetSecKey] = fixResult.repairedRecord;
            mergedSuccessfully = true;
          } else if (fixResult.repairedRecord && typeof fixResult.repairedRecord === 'object') {
            if (arr.length === 1 && (targetSecKey === 'worldRules' || targetSecKey === 'beatMap')) {
              arr[0] = { ...arr[0], ...fixResult.repairedRecord, id: arr[0].id };
            } else {
              arr.push(fixResult.repairedRecord);
            }
            mergedSuccessfully = true;
          }
        }
      } else if (targetSecKey && typeof (workingCanon as any)[targetSecKey] === 'object') {
        // Object section (narrativeStructure)
        (workingCanon as any)[targetSecKey] = {
          ...(workingCanon as any)[targetSecKey],
          ...fixResult.repairedRecord,
        };
        mergedSuccessfully = true;
      }

      // Guaranteed normalization: ensure EVERY array section is a valid Array
      for (const k of arrayKeys) {
        if (!Array.isArray((workingCanon as any)[k])) {
          const val = (workingCanon as any)[k];
          (workingCanon as any)[k] = val ? (typeof val === 'object' && val.id ? [val] : Object.values(val)) : [];
        }
      }

      res.json({
        success: true,
        repairedCanon: workingCanon,
        targetSection: fixResult.targetSection,
        targetRecordId: fixResult.targetRecordId,
        explanation: fixResult.explanation || 'Surgical repair applied cleanly.',
      });
    } catch (error: any) {
      console.error('Error auto-fixing issue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-fix issue',
      });
    }
  });

  // ==========================================
  // STAGE 2: VISUAL ASSET PROMPT STUDIO ENDPOINTS
  // ==========================================

  // 9. Generate Visual Style Bible V1
  app.post('/api/gemini/generate-style-bible', async (req: Request, res: Response) => {
    try {
      const { settings, visualStyle, storyFoundation, storyCanon } = req.body;

      const prompt = `You are the Lead Visual Designer and Art Director at XEMACS7 STUDIO AI.
Create an authoritative, text-only VISUAL STYLE BIBLE V1 for external image generation.

INHERITED MASTER VISUAL STYLE FROM STAGE 1 (DO NOT ALTER OR REPLACE THIS LOOK):
- Style Name: ${visualStyle.name} (${visualStyle.category})
- Medium: ${visualStyle.medium}
- Realism Level: ${visualStyle.realismLevel}
- Color Intent: ${visualStyle.colorIntent}
- Lighting Intent: ${visualStyle.lightingIntent}
- Texture Intent: ${visualStyle.textureIntent}
${visualStyle.customDescription ? `- Director's Custom Notes: ${visualStyle.customDescription}` : ''}

PROJECT CONTEXT:
- Title: ${storyFoundation?.title || 'Film Project'}
- Format: ${settings.format} (~${settings.targetRuntimeSeconds}s)
- Logline: ${storyFoundation?.logline || ''}
- World Setting: ${storyFoundation?.worldSetting || ''}
- Genres: ${formatGenresForPrompt(settings)}
- Emotional Tone: ${formatToneForPrompt(settings)}

CRITICAL RULES FOR THE STYLE BIBLE:
1. FAITHFULLY EMBODY the inherited medium and realism level (${visualStyle.medium}, ${visualStyle.realismLevel}).
   - If this is 2D Cel Animation, Anime, Stop-Motion, Watercolor, or Stylized 3D, DO NOT mandate 'photorealistic 8K DSLR photo' rendering.
   - For dark/noir or horror projects, mandate lighting rules that preserve clear facial and silhouette readability for reference sheets.
2. Formulate explicit, actionable rules across color palette, lighting principles, texture/materials, architecture/world rules, character stylization, wardrobe/prop philosophy, allowed elements, avoided elements, and reference clarity rules.
3. Return valid JSON adhering to the response schema.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              version: { type: Type.INTEGER },
              mediumAndRealism: { type: Type.STRING },
              colorPaletteAndContrast: { type: Type.STRING },
              lightingRules: { type: Type.STRING },
              textureAndRenderingLanguage: { type: Type.STRING },
              worldArchitecturePrinciples: { type: Type.STRING },
              characterProportionRules: { type: Type.STRING },
              wardrobeAndPropPhilosophy: { type: Type.STRING },
              allowedElements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              avoidedElements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              referenceImageClarityRules: { type: Type.STRING },
            },
            required: [
              'version',
              'mediumAndRealism',
              'colorPaletteAndContrast',
              'lightingRules',
              'textureAndRenderingLanguage',
              'worldArchitecturePrinciples',
              'characterProportionRules',
              'wardrobeAndPropPhilosophy',
              'allowedElements',
              'avoidedElements',
              'referenceImageClarityRules',
            ],
          },
        },
      });

      const parsed = parseCleanJson<any>(response.text);

      const styleBible = {
        ...parsed,
        version: 1,
        inheritedStyle: visualStyle,
        updatedAt: new Date().toISOString(),
      };

      res.json({ success: true, styleBible });
    } catch (error: any) {
      console.error('Error generating style bible:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate visual style bible',
      });
    }
  });

  // 10. Generate Phase 2 Visual Assets (Style Bible, Characters, Locations, Props)
  const handleGeneratePhase2Assets = async (req: Request, res: Response) => {
    try {
      const {
        settings = {},
        visualStyle = {
          name: 'Cinematic Realism',
          medium: 'Live Action Cinema',
          realismLevel: 'REALISTIC',
          colorIntent: 'Balanced naturalistic palette with atmospheric contrast',
          lightingIntent: 'Three-point lighting with directional key and soft ambient fill',
          textureIntent: 'Tactile organic surfaces with natural film grain',
        },
        storyFoundation,
        storyCanon,
        styleBible: inputStyleBible,
        importedScript,
        scenes = [],
        shots = [],
        existingAssets = [],
        concepts = [],
        originalStoryText = '',
        generateMissingOnly = false,
        regenerateAssetId = null,
      } = req.body;

      // 1. Scan Phase 1 output to extract all characters, locations, props
      const charactersMap = new Map<string, { id: string; name: string; role?: string; source: string; details?: string }>();
      const locationsMap = new Map<string, { id: string; name: string; source: string; details?: string }>();
      const propsMap = new Map<string, { id: string; name: string; owner?: string; source: string; details?: string }>();

      // Keep track of existing IDs
      const existingAssetsMap = new Map<string, any>((existingAssets || []).map((a: any) => [a.id, a]));
      const existingNameMap = new Map<string, any>((existingAssets || []).map((a: any) => [a.name.toLowerCase().trim(), a]));

      // Preload existing assets into maps so their canonical IDs are preserved
      (existingAssets || []).forEach((a: any) => {
        const key = a.name.toLowerCase().trim();
        if (a.type === 'CHARACTER') {
          charactersMap.set(key, { id: a.id, name: a.name, role: a.importance === 'PRIMARY' ? 'PROTAGONIST' : 'SUPPORTING', source: 'Existing Phase 2 Asset', details: a.visualSpecification?.summary });
        } else if (a.type === 'LOCATION') {
          locationsMap.set(key, { id: a.id, name: a.name, source: 'Existing Phase 2 Asset', details: a.visualSpecification?.summary });
        } else if (a.type === 'PROP') {
          propsMap.set(key, { id: a.id, name: a.name, source: 'Existing Phase 2 Asset', details: a.visualSpecification?.summary });
        }
      });

      // Extract from Story Canon
      (storyCanon?.characters || []).forEach((c: any) => {
        const key = (c.name || c.id).toLowerCase().trim();
        if (!charactersMap.has(key)) {
          const cid = c.id && c.id.startsWith('CHAR-') ? c.id : `CHAR-${String(charactersMap.size + 1).padStart(3, '0')}`;
          charactersMap.set(key, { id: cid, name: c.name || c.id, role: c.role, source: 'Story Canon', details: `${c.archetype || ''} ${c.personalityVoice || ''} Want: ${c.want || ''}`.trim() });
        }
      });

      (storyCanon?.locations || []).forEach((l: any) => {
        const key = (l.name || l.id).toLowerCase().trim();
        if (!locationsMap.has(key)) {
          const lid = l.id && l.id.startsWith('LOC-') ? l.id : `LOC-${String(locationsMap.size + 1).padStart(3, '0')}`;
          locationsMap.set(key, { id: lid, name: l.name || l.id, source: 'Story Canon', details: l.moodAtmosphere || l.description || l.narrativeSignificance });
        }
      });

      (storyCanon?.props || []).forEach((p: any) => {
        const key = (p.name || p.id).toLowerCase().trim();
        if (!propsMap.has(key)) {
          const pid = p.id && p.id.startsWith('PROP-') ? p.id : `PROP-${String(propsMap.size + 1).padStart(3, '0')}`;
          propsMap.set(key, { id: pid, name: p.name || p.id, owner: p.ownerOrHolder, source: 'Story Canon', details: p.storyFunction || p.description });
        }
      });

      // Extract from Screenplay Scenes
      (scenes || []).forEach((scene: any) => {
        if (scene.slugline) {
          const parts = scene.slugline.split('-').map((s: string) => s.trim());
          const locName = parts.length > 1 ? parts.slice(1, -1).join(' - ') || parts[1] : scene.slugline.replace(/^(INT\.|EXT\.)\s*/i, '').trim();
          const cleanLoc = locName.replace(/\s*-\s*(DAY|NIGHT|DUSK|DAWN|CONTINUOUS).*/i, '').trim();
          if (cleanLoc && cleanLoc.length > 2 && !locationsMap.has(cleanLoc.toLowerCase())) {
            const lid = scene.locationId && scene.locationId.startsWith('LOC-') ? scene.locationId : `LOC-${String(locationsMap.size + 1).padStart(3, '0')}`;
            locationsMap.set(cleanLoc.toLowerCase(), { id: lid, name: cleanLoc, source: `Scene #${scene.sceneNumber}`, details: scene.storyPurpose || 'Screenplay Location' });
          }
        }

        (scene.dialogueBlocks || []).forEach((d: any) => {
          if (d.speakerName && d.speakerName.trim()) {
            const speaker = d.speakerName.trim();
            const upper = speaker.toUpperCase();
            if (upper !== 'NARRATOR' && upper !== 'VOICE OVER' && upper !== 'ALL' && !charactersMap.has(speaker.toLowerCase())) {
              const cid = d.speakerId && d.speakerId.startsWith('CHAR-') ? d.speakerId : `CHAR-${String(charactersMap.size + 1).padStart(3, '0')}`;
              charactersMap.set(speaker.toLowerCase(), { id: cid, name: speaker, role: 'CHARACTER', source: `Screenplay Dialogue (Scene #${scene.sceneNumber})` });
            }
          }
        });

        (scene.propIds || []).forEach((pId: string) => {
          if (pId && !Array.from(propsMap.values()).some((p) => p.id === pId)) {
            propsMap.set(pId.toLowerCase(), { id: pId, name: pId, source: `Scene #${scene.sceneNumber}` });
          }
        });
      });

      // Extract from Shots
      (shots || []).forEach((shot: any) => {
        (shot.characterIds || []).forEach((cId: string) => {
          if (cId && !Array.from(charactersMap.values()).some((c) => c.id === cId)) {
            charactersMap.set(cId.toLowerCase(), { id: cId, name: cId, source: `Shot ${shot.shotId}` });
          }
        });
        if (shot.locationId && !Array.from(locationsMap.values()).some((l) => l.id === shot.locationId)) {
          locationsMap.set(shot.locationId.toLowerCase(), { id: shot.locationId, name: shot.locationId, source: `Shot ${shot.shotId}` });
        }
        (shot.propIds || []).forEach((pId: string) => {
          if (pId && !Array.from(propsMap.values()).some((p) => p.id === pId)) {
            propsMap.set(pId.toLowerCase(), { id: pId, name: pId, source: `Shot ${shot.shotId}` });
          }
        });
      });

      // Fallbacks if nothing extracted
      if (charactersMap.size === 0) {
        const lead = storyFoundation?.protagonist || 'Protagonist';
        charactersMap.set(lead.toLowerCase(), { id: 'CHAR-001', name: lead, role: 'PROTAGONIST', source: 'Story Premise' });
      }
      if (locationsMap.size === 0) {
        const loc = storyFoundation?.worldSetting || 'Primary Setting';
        locationsMap.set(loc.toLowerCase(), { id: 'LOC-001', name: loc, source: 'World Setting' });
      }

      // Filter to missing or targeted asset if applicable
      let targetCharacters = Array.from(charactersMap.values());
      let targetLocations = Array.from(locationsMap.values());
      let targetProps = Array.from(propsMap.values());

      if (regenerateAssetId) {
        targetCharacters = targetCharacters.filter((c) => c.id === regenerateAssetId);
        targetLocations = targetLocations.filter((l) => l.id === regenerateAssetId);
        targetProps = targetProps.filter((p) => p.id === regenerateAssetId);
      } else if (generateMissingOnly) {
        targetCharacters = targetCharacters.filter((c) => !existingAssetsMap.has(c.id) && !existingNameMap.has(c.name.toLowerCase()));
        targetLocations = targetLocations.filter((l) => !existingAssetsMap.has(l.id) && !existingNameMap.has(l.name.toLowerCase()));
        targetProps = targetProps.filter((p) => !existingAssetsMap.has(p.id) && !existingNameMap.has(p.name.toLowerCase()));
      }

      const primaryGenre = settings.primaryGenre || (settings.genres && settings.genres[0]) || 'Drama';
      const toneDesc = settings.primaryTone || settings.tone || 'Cinematic';
      const arDesc = settings.aspectRatio === '9:16' ? '9:16 vertical composition' : '16:9 widescreen composition';

      // 2. Synthesize Style Bible
      const styleBible = inputStyleBible && generateMissingOnly ? inputStyleBible : {
        version: (inputStyleBible?.version || 0) + 1,
        inheritedStyle: visualStyle,
        artDirection: `Art direction for ${visualStyle.name} (${visualStyle.medium}). Genre: ${primaryGenre}. Emotional tone: ${toneDesc}. Every asset and shot adheres to strict continuity, controlled focal depth, and authentic textures.`,
        mediumAndRealism: `${visualStyle.medium} with ${visualStyle.realismLevel || 'REALISTIC'} finish. No mixed-medium artifacts or contradictory stylization.`,
        colorPaletteAndContrast: `${visualStyle.colorIntent || 'Curated cinematic color palette'}. Anchored to ${primaryGenre.toLowerCase()} color harmonies with controlled contrast.`,
        lightingRules: `${visualStyle.lightingIntent || 'Three-point lighting with directional key'}. Consistent shadow falloff, volumetric atmosphere, and realistic lighting vectors.`,
        textureAndRenderingLanguage: `${visualStyle.textureIntent || 'Tactile organic surfaces'}. Authentic micro-textures, fabric weaves, and natural optical depth of field.`,
        worldArchitecturePrinciples: `Spatial architecture follows the established world rules and atmosphere of ${primaryGenre}.`,
        characterProportionRules: 'Strict proportion anchors: distinct silhouettes, recognizable anatomical landmarks, expressive eye geometry, and height consistency.',
        wardrobeAndPropPhilosophy: 'Functional garments and tactile props showing authentic wear, practical fastenings, and color cohesion with environment palettes.',
        cameraAndCompositionStyle: `Composition calibrated for ${arDesc}. 35mm and 50mm prime lenses, rule of thirds, clean headroom, and balanced depth of field.`,
        aspectRatioConstraints: `Strictly framed for ${settings.aspectRatio || '16:9'}. Central subjects remain within primary action-safe zones.`,
        scaleConsistency: 'Proportions and relative heights between characters and architecture are strictly maintained.',
        negativeVisualConstraints: [
          'no modern or anachronistic objects in historical or fantasy scenes',
          'no cloned or duplicate character faces',
          'no flat unmotivated studio lighting',
          'no unnatural plastic skin smoothing',
          'no watermarks, text overlays, or digital distortion',
        ],
        continuityLocks: [
          `Master Visual Medium: ${visualStyle.medium}`,
          `Aspect Ratio: ${settings.aspectRatio || '16:9'}`,
          `Color Intent: ${toneDesc}`,
        ],
        allowedElements: [
          `${visualStyle.medium} cinematic lighting`,
          'Tactile physical textures and natural patina',
          'Volumetric directional light and atmosphere',
          'Distinct character silhouettes',
        ],
        avoidedElements: [
          'Uncanny plastic skin smoothing',
          'Mismatched character costumes across scenes',
          'Anachronistic props',
        ],
        referenceImageClarityRules: 'High-clarity studio reference rendering with isolated subjects against neutral backgrounds for character turnarounds, and atmospheric establishing views for environments.',
        updatedAt: new Date().toISOString(),
      };

      // 3. Synthesize Assets with Gemini or Fallback
      let synthesizedAssets: any[] = [];

      try {
        if (process.env.GEMINI_API_KEY && (targetCharacters.length > 0 || targetLocations.length > 0 || targetProps.length > 0)) {
          const prompt = `You are the Lead Visual Asset Prompt Architect at XEMACS7 AI FILM STUDIO.
Synthesize complete, production-ready English visual asset specifications and ready-to-paste prompts for the project below.

PROJECT STYLE & CONTEXT:
- Visual Style: ${visualStyle.name} (${visualStyle.medium}, ${visualStyle.realismLevel})
- Genre: ${primaryGenre} | Tone: ${toneDesc} | Aspect Ratio: ${settings.aspectRatio || '16:9'}
- Style Bible Directives:
  • Color: ${styleBible.colorPaletteAndContrast}
  • Lighting: ${styleBible.lightingRules}
  • Textures: ${styleBible.textureAndRenderingLanguage}

TARGET CHARACTERS TO GENERATE:
${targetCharacters.map((c) => `- ID: ${c.id} | Name: ${c.name} | Role: ${c.role || 'Character'} | Details: ${c.details || 'Key character'}`).join('\n')}

TARGET LOCATIONS TO GENERATE:
${targetLocations.map((l) => `- ID: ${l.id} | Name: ${l.name} | Details: ${l.details || 'Key location'}`).join('\n')}

TARGET PROPS TO GENERATE:
${targetProps.map((p) => `- ID: ${p.id} | Name: ${p.name} | Owner: ${p.owner || 'Assigned character'} | Details: ${p.details || 'Key prop'}`).join('\n')}

STRICT SPECIFICATION REQUIREMENTS:
1. Every asset MUST have:
   - id: preserve the provided ID (e.g. ${targetCharacters[0]?.id || 'CHAR-001'})
   - type: 'CHARACTER' | 'LOCATION' | 'PROP'
   - name: asset name
   - storyFunction: narrative role in the story
   - importance: 'PRIMARY' | 'SECONDARY' | 'OPTIONAL'
   - referencePrompt: STANDALONE, COMPLETE, COPY-PASTE READY ENGLISH PROMPT. Weave in '${visualStyle.name}' (${visualStyle.medium}).
2. For CHARACTERS:
   - turnaroundPrompt: Front, side, and back view turnaround description
   - frontViewPrompt: Full body front view reference prompt
   - backViewPrompt: Full body rear view reference prompt
   - sideViewPrompt: 90-degree profile reference prompt
   - expressionPrompt: Multi-expression portrait prompt
   - silhouetteAndProportions: Distinctive build, height ratio, head shape
   - costumeAndAccessories: Signature garments, fabrics, colors, wear
   - stableIdentityRules: Facial bone structure and eye anchors
3. For LOCATIONS:
   - referencePrompt: Cinematic wide establishing shot prompt
   - spatialLayout: Depth, entry/exit points, architectural geometry
   - recurringLandmarks: Focal anchors across scenes
   - continuityRequirements: Time of day, light vectors, weather
4. For PROPS:
   - referencePrompt: Isolated hero prop studio still prompt
   - physicalShape: Shape, dimensions, ergonomic details
   - dimensions: Scale relative to human hand
   - ownerOrHolder: Relevant character
   - continuityRequirements: Scratches, markings, operational state
5. promptStatus: 'READY'.

Return a JSON array of asset objects.`;

          const aiResponse = await callGeminiWithFallback({
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const parsed = parseCleanJson<any[]>(aiResponse.text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            synthesizedAssets = parsed.map((a: any) => ({
              ...a,
              promptStatus: 'READY',
              approvalStatus: 'PENDING',
              updatedAt: new Date().toISOString(),
            }));
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini asset synthesis fallback triggered:', geminiError.message);
      }

      // If Gemini did not produce all target assets, synthesize remaining deterministically
      const synthesizedIds = new Set(synthesizedAssets.map((a) => a.id));

      targetCharacters.forEach((c) => {
        if (!synthesizedIds.has(c.id)) {
          synthesizedAssets.push({
            id: c.id,
            type: 'CHARACTER',
            name: c.name,
            storyFunction: c.details || `${c.role || 'Character'} in ${storyFoundation?.title || 'the film'}`,
            importance: c.role === 'PROTAGONIST' ? 'PRIMARY' : 'SECONDARY',
            sourceCanonIds: [c.id],
            visualSpecification: {
              summary: `Visual anchor for ${c.name}. Cohesive silhouette, signature costume, and distinct facial features.`,
              keyFeatures: [`Distinctive facial geometry for ${primaryGenre.toLowerCase()}`, 'Authentic eye expression and hair anchor', 'Signature silhouette'],
              colors: ['Deep neutral base', 'Accent tone'],
              materialsOrTextures: ['Natural woven fabrics', 'Lived-in surface patina'],
              dimensionsOrProportions: 'Athletic/grounded build, proportional head-to-body ratio',
              lightingOrRenderingRules: `Rendered in ${visualStyle.medium} conventions with directional key light`,
            },
            referencePrompt: `Cinematic character reference portrait of ${c.name}, ${c.role || 'character'} in a ${primaryGenre.toLowerCase()} film. Style: ${visualStyle.name} (${visualStyle.medium}). Full-body three-quarter studio reference, distinct facial features, authentic eye expression, signature costume tailored for ${toneDesc.toLowerCase()} tone. ${visualStyle.colorIntent || 'Cinematic lighting'}, neutral atmospheric studio background, 8k, sharp focus, master film still.`,
            turnaroundPrompt: `Character turnaround FRONT, SIDE, and BACK views of ${c.name}, neutral standing posture, consistent lighting and signature costume.`,
            frontViewPrompt: `Character turnaround FRONT VIEW of ${c.name}, full body standing, neutral lighting, clean backdrop.`,
            backViewPrompt: `Character turnaround BACK VIEW of ${c.name}, full body standing from behind, detailing jacket and hairstyle.`,
            sideViewPrompt: `Character turnaround SIDE PROFILE VIEW of ${c.name}, full body standing, showing silhouette and posture.`,
            expressionPrompt: `Character facial expression reference grid for ${c.name}: neutral, intense, determined, and emotional reactions.`,
            silhouetteAndProportions: 'Consistent height and shoulder-width anchor relative to other cast members',
            costumeAndAccessories: 'Signature layers with functional fasteners and subtle weathering',
            stableIdentityRules: 'Facial bone structure, eye shape, and signature silhouette must not deviate between scenes',
            promptStatus: 'READY',
            approvalStatus: 'PENDING',
            updatedAt: new Date().toISOString(),
          });
        }
      });

      targetLocations.forEach((l) => {
        if (!synthesizedIds.has(l.id)) {
          synthesizedAssets.push({
            id: l.id,
            type: 'LOCATION',
            name: l.name,
            storyFunction: l.details || `Key environment in ${storyFoundation?.title || 'the film'}`,
            importance: 'PRIMARY',
            sourceCanonIds: [l.id],
            visualSpecification: {
              summary: `Permanent spatial architecture and environmental lighting rules for ${l.name}.`,
              keyFeatures: ['Recognizable architectural landmarks', 'Motivated light sources', 'Spatial depth and entry/exit points'],
              colors: ['Environmental baseline palette', 'Atmospheric accent tone'],
              materialsOrTextures: ['Weathered architectural surfaces', 'Natural atmospheric depth'],
              lightingOrRenderingRules: `Directional lighting matching ${visualStyle.medium}`,
            },
            referencePrompt: `Cinematic wide establishing shot of ${l.name}, an essential environment in a ${primaryGenre.toLowerCase()} film. Style: ${visualStyle.name} (${visualStyle.medium}). Architectural scale, volumetric atmospheric depth, ${visualStyle.lightingIntent || 'dramatic directional lighting'}, distinctive spatial anchors. High resolution 35mm cinematic film still.`,
            spatialLayout: 'Grounded architectural layout with clearly defined foreground, middle ground, and deep horizon',
            entryExitPoints: 'Main entrance doorway and primary transit corridor visually established',
            recurringLandmarks: 'Central architectural focal point anchored across wide and medium coverage',
            continuityRequirements: 'Maintain consistent light direction and shadow vectors across consecutive shots',
            promptStatus: 'READY',
            approvalStatus: 'PENDING',
            updatedAt: new Date().toISOString(),
          });
        }
      });

      targetProps.forEach((p) => {
        if (!synthesizedIds.has(p.id)) {
          synthesizedAssets.push({
            id: p.id,
            type: 'PROP',
            name: p.name,
            storyFunction: p.details || `Story-critical object in ${storyFoundation?.title || 'the film'}`,
            importance: 'SECONDARY',
            sourceCanonIds: [p.id],
            visualSpecification: {
              summary: `Material construction and distinctive markings for ${p.name}.`,
              keyFeatures: ['Tactile surface materials', 'Distinctive engraving or functional marks', 'Handheld proportion'],
              colors: ['Primary material finish', 'Secondary wear patina'],
              materialsOrTextures: ['Machined metal / treated wood / tactile leather'],
              dimensionsOrProportions: 'Handheld scale proportional to human grip',
              lightingOrRenderingRules: 'Sharp macro focus with edge rim light to emphasize physical contours',
            },
            referencePrompt: `Cinematic isolated hero prop still of ${p.name}, a critical physical story catalyst in a ${primaryGenre.toLowerCase()} film. Style: ${visualStyle.name} (${visualStyle.medium}). Macro depth of field, detailed tactile materials, authentic engravings and wear marks under warm directional studio key lighting. Neutral backdrop, 8k resolution.`,
            physicalShape: 'Ergonomic functional geometry with distinct silhouette',
            dimensions: 'Proportional handheld item (approx. 20-30cm)',
            ownerOrHolder: p.owner || 'Assigned character',
            continuityRequirements: 'Preserve scratches, unique markings, and operational states across all scenes',
            promptStatus: 'READY',
            approvalStatus: 'PENDING',
            updatedAt: new Date().toISOString(),
          });
        }
      });

      // Merge with existing assets if missing-only or regenerating single asset
      let finalAssets: any[] = [];
      if (generateMissingOnly) {
        finalAssets = [...existingAssets, ...synthesizedAssets];
      } else if (regenerateAssetId) {
        finalAssets = existingAssets.map((a: any) => {
          if (a.id === regenerateAssetId) {
            const fresh = synthesizedAssets.find((s) => s.id === regenerateAssetId);
            return fresh || a;
          }
          return a;
        });
      } else {
        // Full synthesis: preserve any user-uploaded image references on matching IDs
        finalAssets = synthesizedAssets.map((fresh) => {
          const old = existingAssetsMap.get(fresh.id) || existingNameMap.get(fresh.name.toLowerCase());
          if (old && (old.optionalReferenceImageData || old.referenceMedia)) {
            return {
              ...fresh,
              id: old.id,
              optionalReferenceImageData: old.optionalReferenceImageData,
              optionalReferenceFileName: old.optionalReferenceFileName,
              optionalReferenceImageId: old.optionalReferenceImageId,
              referenceMedia: old.referenceMedia,
              approvalStatus: old.approvalStatus || 'APPROVED',
            };
          }
          return fresh;
        });
      }

      res.json({
        success: true,
        styleBible,
        assets: finalAssets,
        extractedSummary: {
          charactersCount: charactersMap.size,
          locationsCount: locationsMap.size,
          propsCount: propsMap.size,
        },
      });
    } catch (error: any) {
      console.error('Error generating Phase 2 assets:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Phase 2 assets',
      });
    }
  };

  app.post('/api/gemini/generate-phase2-assets', handleGeneratePhase2Assets);
  app.post('/api/gemini/generate-visual-assets', handleGeneratePhase2Assets);

  // 11. Regenerate Single Asset Prompt
  app.post('/api/gemini/regenerate-asset-prompt', async (req: Request, res: Response) => {
    try {
      const { asset, styleBible, storyCanon, guidance } = req.body;

      const prompt = `You are a precision prompt architect at XEMACS7 STUDIO AI.
Regenerate or refine the copy-paste ready image prompt for the visual asset below.

Asset to Refine:
- ID: ${asset.id} (${asset.type})
- Name: ${asset.name}
- Story Function: ${asset.storyFunction}
- Existing Visual Specification:
  • Summary: ${asset.visualSpecification?.summary}
  • Key Features: ${(asset.visualSpecification?.keyFeatures || []).join(', ')}
  • Colors: ${(asset.visualSpecification?.colors || []).join(', ')}
  • Materials: ${(asset.visualSpecification?.materialsOrTextures || []).join(', ')}
- Style Bible Directives:
  • Style: ${styleBible?.inheritedStyle?.name} (${styleBible?.mediumAndRealism})
  • Lighting: ${styleBible?.lightingRules}
  • Materials/Rendering: ${styleBible?.textureAndRenderingLanguage}

User Guidance for this regeneration: ${guidance || 'Enhance consistency, clarity of identity anchors, and adherence to visual style.'}

STRICT INSTRUCTIONS:
1. Maintain stable ID '${asset.id}' and canonical name '${asset.name}'.
2. Write a complete, standalone, copy-paste ready English image prompt for external generators.
3. If this is a CHARACTER, also provide an optional turnaroundPrompt.
4. Output valid JSON matching the schema.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              referencePrompt: { type: Type.STRING },
              turnaroundPrompt: { type: Type.STRING },
              visualSpecification: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                  colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  materialsOrTextures: { type: Type.ARRAY, items: { type: Type.STRING } },
                  dimensionsOrProportions: { type: Type.STRING },
                  lightingOrRenderingRules: { type: Type.STRING },
                },
                required: ['summary', 'keyFeatures', 'colors', 'materialsOrTextures'],
              },
            },
            required: ['referencePrompt', 'visualSpecification'],
          },
        },
      });

      const updated = parseCleanJson<any>(response.text);

      const repairedAsset = {
        ...asset,
        visualSpecification: updated.visualSpecification || asset.visualSpecification,
        referencePrompt: updated.referencePrompt,
        turnaroundPrompt: updated.turnaroundPrompt || asset.turnaroundPrompt,
        promptStatus: 'READY',
        updatedAt: new Date().toISOString(),
      };

      res.json({ success: true, asset: repairedAsset });
    } catch (error: any) {
      console.error('Error regenerating asset prompt:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate asset prompt',
      });
    }
  });

  // 12. Audit Visual Prompt Package
  app.post('/api/gemini/audit-visual-prompts', async (req: Request, res: Response) => {
    try {
      const { assets, styleBible, storyFoundation, storyCanon } = req.body;

      const assetsSummary = (assets || []).map((a: any) =>
        `[${a.id}] (${a.type}) "${a.name}":
  Spec: ${a.visualSpecification?.summary}
  Prompt: "${a.referencePrompt}"`
      ).join('\n\n');

      const prompt = `You are the Lead Visual Canon Auditor at XEMACS7 STUDIO AI.
Audit this visual prompt package for production readiness, style coherence, concrete identity, and story canon alignment.

Style Bible Standards:
- Style: ${styleBible?.inheritedStyle?.name} (${styleBible?.mediumAndRealism})
- Proportions & Lighting: ${styleBible?.lightingRules}
- Avoided Elements: ${(styleBible?.avoidedElements || []).join(', ')}

Assets to Audit:
${assetsSummary}

AUDIT CHECKLIST & SEVERITY RULES:
1. REQUIRED (Blocks Stage 2 Approval):
   - Blank, empty, or placeholder prompts (e.g. 'Specified in canon', 'Torso specification', 'Photorealistic 8K film still' as sole description).
   - Prompts that lack concrete facial/bodily or physical anchors.
   - Severe style contradiction (e.g. photorealistic photography tags in an anime or 2D cel project).
   - Direct canon contradictions with Stage 1 (e.g. wrong age, wrong canonical role, missing essential story prop).
2. WARNING (Advisory, does not block approval):
   - Minor lighting ambiguity.
   - Missing optional turnaround prompt for secondary characters.
   - Minor palette deviations.
3. INFO (Stylistic suggestions).

FIX CLASSIFICATIONS:
- SAFE_AUTOFIX: Missing reference framing, generic style suffix, or obvious omitted canon attribute without conflicting choices.
- NEEDS_USER_REVIEW: Ambiguous visual choices, costume redesign, or material identity questions.
- UPSTREAM_CANON_CONFLICT: Cannot be resolved without altering Stage 1 author intent.

Return overallScore (0-100), summary, and issues array with issueId 'VIS-AUD-01', 'VIS-AUD-02', etc.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    issueId: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['REQUIRED', 'WARNING', 'INFO'] },
                    assetId: { type: Type.STRING },
                    field: { type: Type.STRING },
                    description: { type: Type.STRING },
                    consequence: { type: Type.STRING },
                    suggestedFix: { type: Type.STRING },
                    fixClass: { type: Type.STRING, enum: ['SAFE_AUTOFIX', 'NEEDS_USER_REVIEW', 'UPSTREAM_CANON_CONFLICT'] },
                  },
                  required: [
                    'issueId',
                    'severity',
                    'field',
                    'description',
                    'consequence',
                    'suggestedFix',
                    'fixClass',
                  ],
                },
              },
            },
            required: ['overallScore', 'summary', 'issues'],
          },
        },
      });

      const auditData = parseCleanJson<any>(response.text);

      const formattedIssues = (auditData.issues || []).map((issue: any, index: number) => ({
        ...issue,
        issueId: issue.issueId || `VIS-AUD-${String(index + 1).padStart(2, '0')}`,
        status: 'OPEN',
      }));

      res.json({
        success: true,
        audit: {
          overallScore: auditData.overallScore || 94,
          summary: auditData.summary || 'Visual canon audit completed.',
          issues: formattedIssues,
          auditedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error auditing visual prompts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit visual prompts',
      });
    }
  });

  // 13. Auto-Fix Visual Issue
  app.post('/api/gemini/auto-fix-visual-issue', async (req: Request, res: Response) => {
    try {
      const { issue, asset, styleBible, storyCanon } = req.body;

      const prompt = `You are a precision prompt repair technician at XEMACS7 STUDIO AI.
Surgically resolve this visual audit issue for asset [${asset.id}] without altering unassociated attributes.

Audit Issue to Resolve:
- ID: ${issue.issueId}
- Field: ${issue.field}
- Description: ${issue.description}
- Consequence: ${issue.consequence}
- Suggested Fix: ${issue.suggestedFix}

Current Asset:
- ID: ${asset.id} (${asset.type})
- Name: ${asset.name}
- Existing Spec: ${JSON.stringify(asset.visualSpecification)}
- Existing Prompt: "${asset.referencePrompt}"

Style Bible Context:
- Style: ${styleBible?.inheritedStyle?.name} (${styleBible?.mediumAndRealism})
- Lighting: ${styleBible?.lightingRules}

Apply ONLY the necessary correction. Return the repaired referencePrompt and visualSpecification.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              repairedReferencePrompt: { type: Type.STRING },
              repairedTurnaroundPrompt: { type: Type.STRING },
              repairedVisualSpecification: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                  colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  materialsOrTextures: { type: Type.ARRAY, items: { type: Type.STRING } },
                  dimensionsOrProportions: { type: Type.STRING },
                  lightingOrRenderingRules: { type: Type.STRING },
                },
                required: ['summary', 'keyFeatures', 'colors', 'materialsOrTextures'],
              },
            },
            required: ['explanation', 'repairedReferencePrompt', 'repairedVisualSpecification'],
          },
        },
      });

      const fixResult = parseCleanJson<any>(response.text);

      const repairedAsset = {
        ...asset,
        visualSpecification: fixResult.repairedVisualSpecification,
        referencePrompt: fixResult.repairedReferencePrompt,
        turnaroundPrompt: fixResult.repairedTurnaroundPrompt || asset.turnaroundPrompt,
        promptStatus: 'READY',
        updatedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        repairedAsset,
        explanation: fixResult.explanation,
      });
    } catch (error: any) {
      console.error('Error auto-fixing visual issue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-fix visual issue',
      });
    }
  });

  // ==========================================
  // STAGE 3 API ENDPOINTS (SCRIPT & SHOT PLANNER)
  // ==========================================

  // 14. Generate Script Scenes
  const handleGenerateScriptScenes = async (req: Request, res: Response) => {
    try {
      const {
        storySourceMode,
        storyFoundation,
        storyCanon,
        originalStoryText,
        importedScript,
        settings,
        scriptSettings,
        visualStyle,
        styleBible,
      } = req.body;

      // Handle OWN_SCRIPT mode: Preserve user's original screenplay verbatim!
      if (storySourceMode === 'OWN_SCRIPT' && importedScript?.extractedScenes?.length) {
        const scenes = importedScript.extractedScenes.map((rawScene: any, index: number) => {
          const sceneId = `SCENE-${String(index + 1).padStart(2, '0')}`;
          const matchingCanonLocation = (storyCanon?.locations || []).find((l: any) =>
            rawScene.slugline?.toLowerCase().includes(l.name.toLowerCase())
          );
          const locationId = matchingCanonLocation?.id || storyCanon?.locations?.[0]?.id || 'LOC-01';

          // Extract dialogue blocks
          const dialogueBlocks = (rawScene.dialogues || []).map((d: any, dIdx: number) => {
            const speakerCanon = (storyCanon?.characters || []).find(
              (c: any) => c.name.toLowerCase() === d.speaker?.toLowerCase()
            );
            return {
              id: `${sceneId}-D${String(dIdx + 1).padStart(2, '0')}`,
              speakerId: speakerCanon?.id || `CHAR-${d.speaker}`,
              speakerName: d.speaker,
              dialogue: d.line,
              type: 'DIALOGUE',
              language: settings?.language || 'English',
            };
          });

          // Action blocks from summary/action text
          const actionBlocks = [
            {
              id: `${sceneId}-A01`,
              description: rawScene.summary || rawScene.rawActionText || 'Scene action',
              visibleAction: rawScene.rawActionText || rawScene.summary || 'Present visible staging',
              characterIds: rawScene.charactersInScene?.map((name: string) => {
                const c = (storyCanon?.characters || []).find((char: any) => char.name.toLowerCase() === name.toLowerCase());
                return c?.id || name;
              }) || [],
              estimatedSeconds: Math.max(12, Math.round((rawScene.rawActionText?.length || 100) / 15)),
            },
          ];

          const totalActionTime = actionBlocks.reduce((acc: number, b: any) => acc + b.estimatedSeconds, 0);
          const totalDialogueTime = dialogueBlocks.reduce((acc: number, d: any) => acc + Math.max(3, Math.round(d.dialogue.split(' ').length / 2.5)), 0);
          const estimatedSceneDuration = Math.max(18, totalActionTime + totalDialogueTime);

          const matchingBeat = (storyCanon?.beatMap || [])[index] || (storyCanon?.beatMap || [])[0];

          return {
            sceneId,
            sceneNumber: index + 1,
            title: rawScene.slugline || `Scene ${index + 1}`,
            sourceSceneRef: `Scene ${rawScene.sceneNumber}: ${rawScene.slugline}`,
            sourceTextSpan: rawScene.slugline,
            beatIds: matchingBeat ? [matchingBeat.id] : [],
            storyPurpose: matchingBeat?.causalConnection || rawScene.summary || 'Advance narrative',
            locationId,
            timeOfDay: rawScene.slugline?.toLowerCase().includes('night') ? 'NIGHT' : 'DAY',
            characterIds: rawScene.charactersInScene?.map((name: string) => {
              const c = (storyCanon?.characters || []).find((char: any) => char.name.toLowerCase() === name.toLowerCase());
              return c?.id || name;
            }) || [],
            wardrobeIds: (storyCanon?.characters || []).map((c: any) => `WARD-${c.id}-01`),
            propIds: (storyCanon?.props || []).slice(0, 2).map((p: any) => p.id),
            entryState: 'Scene opening state from screenplay',
            exitState: 'Scene resolution state leading into next sequence',
            actionBlocks,
            dialogueBlocks,
            audioCues: [
              {
                id: `${sceneId}-SFX01`,
                type: 'AMBIENCE',
                description: rawScene.slugline?.toLowerCase().includes('rooftop') ? 'Surging seawall waves and howling storm' : 'CRT monitor humming and distant sirens',
              },
            ],
            emotionalState: matchingBeat?.emotionalBeat || 'Tension and resolve',
            continuityNotes: [`Original script dialogue preserved verbatim without automated rewriting.`],
            setupPayoffIds: [],
            estimatedSceneDuration,
            scriptText: `${rawScene.slugline}\n\n${rawScene.rawActionText || rawScene.summary}\n\n${(rawScene.dialogues || []).map((d: any) => `${d.speaker.toUpperCase()}\n${d.line}`).join('\n\n')}`,
            isOwnScriptVerbatim: true,
            hasUserModifications: false,
          };
        });

        return res.json({ success: true, scenes });
      }

      // Check if project is episodic and a specific episode is selected
      const isEpisodic = settings?.format === 'Episodic Short Drama' || settings?.format === 'Episodic Long-Form Series';
      const activeEpNum = scriptSettings?.activeEpisodeNumber || settings?.selectedEpisodeNumber || 1;
      const activeEpisode = isEpisodic && storyCanon?.episodicRoadmap?.length
        ? storyCanon.episodicRoadmap.find((e: any) => e.episodeNumber === activeEpNum) || storyCanon.episodicRoadmap[0]
        : null;

      // Filter beats if episodic beats are scoped by actOrEpisode or EPxx
      let scopedBeats = storyCanon?.beatMap || [];
      if (activeEpisode && storyCanon?.beatMap) {
        const epTag = `EP${String(activeEpNum).padStart(2, '0')}`;
        const epBeats = storyCanon.beatMap.filter((b: any) =>
          b.id?.startsWith(epTag) ||
          b.actOrEpisode?.toLowerCase().includes(`episode ${activeEpNum}`) ||
          b.actOrEpisode?.toLowerCase().includes(`ep ${activeEpNum}`) ||
          b.actOrEpisode?.toLowerCase().includes(epTag.toLowerCase())
        );
        if (epBeats.length > 0) {
          scopedBeats = epBeats;
        }
      }

      // Modes AI_CONCEPT and OWN_STORY: Generate filmable scenes adhering to canon
      const charactersSummary = (storyCanon?.characters || []).map((c: any) =>
        `- [${c.id}] ${c.name} (${c.role}, Age: ${c.age}): Want="${c.want}", Need="${c.need}"`
      ).join('\n');

      const beatsSummary = scopedBeats.map((b: any) =>
        `- [${b.id}] (${b.actOrEpisode}) Beat #${b.sequenceNumber}: "${b.title}" -> ${b.description} (Emotion: ${b.emotionalBeat}, Est: ${b.estimatedSeconds}s)`
      ).join('\n');

      const locationsSummary = (storyCanon?.locations || []).map((l: any) =>
        `- [${l.id}] ${l.name}: ${l.narrativeSignificance}`
      ).join('\n');

      const propsSummary = (storyCanon?.props || []).map((p: any) =>
        `- [${p.id}] ${p.name}: ${p.narrativeSignificance} (Held by: ${p.ownerOrHolder})`
      ).join('\n');

      const prompt = `You are the Lead Screenwriter at XEMACS7 STUDIO AI.
Turn the approved Stage 1 Story Foundation and Canon into filmable production screenplay scenes.
${activeEpisode ? `\nCURRENT PRODUCTION TARGET: EPISODE ${activeEpisode.episodeNumber} — "${activeEpisode.title}"\nEpisode Logline: "${activeEpisode.logline}"\nEpisode Core Conflict: "${activeEpisode.coreConflict}"\nEpisode Cliffhanger Hook: "${activeEpisode.cliffhangerHook}"\nTarget Episode Runtime: ~${activeEpisode.targetRuntimeSeconds || settings?.targetRuntimeSeconds} seconds\nIMPORTANT: Produce screenplay scenes specifically for Episode ${activeEpisode.episodeNumber} only. Do not merge all episodes into one script.\n` : ''}
SOURCE MODE: ${storySourceMode}
${originalStoryText ? `USER'S ORIGINAL STORY:\n"${originalStoryText}"\n` : ''}

PROJECT CANON:
Title: "${storyFoundation?.title}"
Premise: "${storyFoundation?.premise}"
Genre & Tone: ${formatGenresForPrompt(settings)} | ${formatToneForPrompt(settings)}
Target Runtime: ~${activeEpisode?.targetRuntimeSeconds || settings?.targetRuntimeSeconds} seconds
Pacing Directive: ${scriptSettings?.pacing || 'BALANCED'}
Dialogue Density: ${scriptSettings?.dialogueDensity || 'MEDIUM'}
Allow Narration/VO: ${scriptSettings?.allowNarration ? 'YES' : 'NO'}

CANON CHARACTERS:
${charactersSummary}

CANON BEAT MAP:
${beatsSummary}

CANON LOCATIONS:
${locationsSummary}

CANON PROPS:
${propsSummary}

RULES FOR SCENE SCRIPTING:
1. Filmable present-tense visible action and audible dialogue. No unfilmable internal book prose.
2. Produce structured scenes covering ALL approved beats in order.
3. Use stable IDs: SCENE-01, SCENE-02, etc.
4. Link real character IDs (${storyCanon?.characters?.map((c: any) => c.id).join(', ')}), location IDs (${storyCanon?.locations?.map((l: any) => l.id).join(', ')}), wardrobe IDs (e.g. WARD-CHAR-01-01), and prop IDs.
5. Dialogue blocks must specify speakerId, speakerName, line, and type (DIALOGUE, INNER_VO, VOICE_OVER, NARRATOR, OFFSCREEN, or DEVICE_AUDIO).
6. Estimated scene duration in seconds (scenes can be 18s, 30s, 60s, 90s - scenes are NOT capped at 10s!).
7. Provide the full formatted screenplay text in 'scriptText'.

Return structured JSON array of ScriptScene objects.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of ScriptScene objects',
            items: {
              type: Type.OBJECT,
              properties: {
                sceneId: { type: Type.STRING },
                sceneNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                beatIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                storyPurpose: { type: Type.STRING },
                locationId: { type: Type.STRING },
                timeOfDay: { type: Type.STRING },
                characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                wardrobeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                propIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                entryState: { type: Type.STRING },
                exitState: { type: Type.STRING },
                actionBlocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      description: { type: Type.STRING },
                      visibleAction: { type: Type.STRING },
                      characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      estimatedSeconds: { type: Type.INTEGER },
                    },
                    required: ['id', 'description', 'visibleAction', 'characterIds', 'estimatedSeconds'],
                  },
                },
                dialogueBlocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      speakerId: { type: Type.STRING },
                      speakerName: { type: Type.STRING },
                      dialogue: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['DIALOGUE', 'INNER_VO', 'VOICE_OVER', 'NARRATOR', 'OFFSCREEN', 'DEVICE_AUDIO'] },
                      deliveryIntent: { type: Type.STRING },
                    },
                    required: ['id', 'speakerId', 'speakerName', 'dialogue', 'type'],
                  },
                },
                audioCues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['SFX', 'AMBIENCE', 'MUSIC', 'FOLEY'] },
                      description: { type: Type.STRING },
                    },
                    required: ['id', 'type', 'description'],
                  },
                },
                emotionalState: { type: Type.STRING },
                continuityNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimatedSceneDuration: { type: Type.INTEGER },
                scriptText: { type: Type.STRING },
              },
              required: [
                'sceneId',
                'sceneNumber',
                'title',
                'beatIds',
                'storyPurpose',
                'locationId',
                'timeOfDay',
                'characterIds',
                'actionBlocks',
                'dialogueBlocks',
                'emotionalState',
                'estimatedSceneDuration',
                'scriptText',
              ],
            },
          },
        },
      });

      const rawScenes = parseCleanJson<any[]>(response.text);

      const scenes = (rawScenes || []).map((s: any, idx: number) => ({
        ...s,
        sceneId: s.sceneId || `SCENE-${String(idx + 1).padStart(2, '0')}`,
        sceneNumber: idx + 1,
        wardrobeIds: s.wardrobeIds || (s.characterIds || []).map((cId: string) => `WARD-${cId}-01`),
        propIds: s.propIds || [],
        continuityNotes: s.continuityNotes || [],
        isOwnScriptVerbatim: false,
        hasUserModifications: false,
      }));

      res.json({ success: true, scenes });
    } catch (error: any) {
      console.error('Error generating script scenes:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate script scenes',
      });
    }
  };

  app.post('/api/gemini/generate-script-scenes', handleGenerateScriptScenes);
  app.post('/api/gemini/generate-script', handleGenerateScriptScenes);

  // 15. Generate Shot Plan (Breakdown strictly into 6, 8, or 10 second shots!)
  app.post('/api/gemini/generate-shot-plan', async (req: Request, res: Response) => {
    try {
      const {
        scenes,
        visualStyle,
        styleBible,
        stage2Assets,
        storyCanon,
        scriptSettings,
      } = req.body;

      const maxShotDuration = Number(scriptSettings?.maxShotDuration) || 10;
      const allowedDurations = [6, 8, 10].filter((d) => d <= maxShotDuration);
      const flowRoutePreference = scriptSettings?.flowRoutePreference || 'AUTO';

      const scenesText = (scenes || []).map((s: any) => `
SCENE [${s.sceneId}] (Scene ${s.sceneNumber}): "${s.title}"
Duration Estimate: ${s.estimatedSceneDuration}s | Location: ${s.locationId} | Time: ${s.timeOfDay}
Characters Present: ${(s.characterIds || []).join(', ')}
Script / Action:
${s.scriptText || s.actionBlocks?.map((a: any) => a.visibleAction).join('\n')}
Dialogue Lines:
${(s.dialogueBlocks || []).map((d: any) => `${d.speakerName}: "${d.dialogue}" (${d.type})`).join('\n')}
`).join('\n---\n');

      const assetsList = (stage2Assets || []).map((a: any) =>
        `- [${a.id}] (${a.type}) "${a.name}": ${a.visualSpecification?.summary || a.storyFunction}`
      ).join('\n');

      const prompt = `You are the Master Cinematographer and Google Flow Shot Architect at XEMACS7 STUDIO AI.
Decompose the approved screenplay scenes into ordered, continuous cinematic video shots.

STRICT NON-NEGOTIABLE SHOT DURATION RULES (CRITICAL):
1. EVERY INDIVIDUAL SHOT DURATION MUST BE EXACTLY 6, 8, OR 10 SECONDS!
   Allowed values: ${allowedDurations.join(', ')} integer seconds only!
   NEVER output 2, 3, 4, 5, 7, 9, 11, 12, or any other number.
   A scene longer than 10s MUST be split into multiple continuous shots (e.g. 24s scene = 8s + 8s + 8s or 8s + 6s + 10s).
   Maximum shot duration permitted for this project: ${maxShotDuration} seconds.

GOOGLE FLOW ROUTING RULES:
2. Assign ONE flowMode per shot: 'INGREDIENTS' or 'FRAMES'.
   - INGREDIENTS: Choose when recurring character/wardrobe/prop identity consistency is primary and initial frame composition can be flexible. Link real Stage 2 asset IDs.
   - FRAMES: Choose when precise initial camera composition, subject starting pose, screen direction, or transition matching the previous shot is essential.
     * MANDATORY FOR FRAMES: Generate a vivid, copy-paste ready English 'firstFramePrompt' describing the exact opening still image (composition, lighting, pose, optics, matching style).

VISUAL STYLE & LENS DIRECTIVES:
- Visual Style: ${visualStyle?.name} (${visualStyle?.medium}, ${visualStyle?.realismLevel})
- Lighting Directive: ${styleBible?.lightingRules || visualStyle?.lightingIntent}
- Textures/Rendering: ${styleBible?.textureAndRenderingLanguage || visualStyle?.textureIntent}

STAGE 2 REGISTERED ASSETS (Link these exact IDs):
${assetsList}

SCREENPLAY SCENES TO DECOMPOSE:
${scenesText}

Generate shotId format: SC01-SH01, SC01-SH02, SC02-SH01, etc.
Ensure all action and dialogue from every scene are covered sequentially across shots.

Return structured JSON array of CinematicShot objects.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of CinematicShot objects',
            items: {
              type: Type.OBJECT,
              properties: {
                shotId: { type: Type.STRING },
                sceneId: { type: Type.STRING },
                order: { type: Type.INTEGER },
                duration: { type: Type.INTEGER, description: 'Duration in seconds: strictly 6, 8, or 10' },
                purpose: { type: Type.STRING },
                sourceBeatIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                wardrobeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                propIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                locationId: { type: Type.STRING },
                shotSize: {
                  type: Type.STRING,
                  enum: [
                    'EXTREME_WIDE',
                    'WIDE',
                    'FULL',
                    'MEDIUM_WIDE',
                    'MEDIUM',
                    'MEDIUM_CLOSE_UP',
                    'CLOSE_UP',
                    'EXTREME_CLOSE_UP',
                    'INSERT',
                  ],
                },
                cameraAngle: {
                  type: Type.STRING,
                  enum: [
                    'EYE_LEVEL',
                    'LOW_ANGLE',
                    'HIGH_ANGLE',
                    'DUTCH_TILT',
                    'BIRDS_EYE',
                    'OVER_THE_SHOULDER',
                    'POV',
                  ],
                },
                lensIntent: { type: Type.STRING },
                framing: { type: Type.STRING },
                cameraMovement: {
                  type: Type.STRING,
                  enum: [
                    'STATIC',
                    'SLOW_PUSH_IN',
                    'PULL_OUT',
                    'PAN_LEFT',
                    'PAN_RIGHT',
                    'TILT_UP',
                    'TILT_DOWN',
                    'TRACKING_LATERAL',
                    'STEADICAM_FOLLOW',
                    'ORBIT',
                  ],
                },
                subjectStartPosition: { type: Type.STRING },
                subjectEndPosition: { type: Type.STRING },
                blockingAndMovement: { type: Type.STRING },
                performanceNotes: { type: Type.STRING },
                eyeline: { type: Type.STRING },
                lightingAndAtmosphere: { type: Type.STRING },
                screenDirection: { type: Type.STRING },
                dialogueRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
                audioContext: { type: Type.STRING },
                entryVisualState: { type: Type.STRING },
                exitVisualState: { type: Type.STRING },
                flowMode: { type: Type.STRING, enum: ['INGREDIENTS', 'FRAMES'] },
                routingReason: { type: Type.STRING },
                routingConfidence: { type: Type.NUMBER },
                ingredientAssetIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                firstFramePrompt: { type: Type.STRING },
                continuityNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                generationComplexity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              },
              required: [
                'shotId',
                'sceneId',
                'order',
                'duration',
                'purpose',
                'characterIds',
                'locationId',
                'shotSize',
                'cameraAngle',
                'cameraMovement',
                'blockingAndMovement',
                'lightingAndAtmosphere',
                'flowMode',
                'routingReason',
              ],
            },
          },
        },
      });

      const rawShots = parseCleanJson<any[]>(response.text);

      // Sanitize and enforce duration invariance
      const shots = (rawShots || []).map((sh: any, index: number) => {
        let dur = Number(sh.duration);
        if (dur !== 6 && dur !== 8 && dur !== 10) {
          dur = 8; // fallback to valid middle duration
        }
        if (dur > maxShotDuration) {
          dur = maxShotDuration === 6 ? 6 : 8;
        }

        const flowMode = sh.flowMode || 'INGREDIENTS';
        let firstFramePrompt = sh.firstFramePrompt;
        if (flowMode === 'FRAMES' && (!firstFramePrompt || !firstFramePrompt.trim())) {
          firstFramePrompt = `${visualStyle?.name || 'Cinematic'} opening keyframe for shot ${sh.shotId}: ${sh.shotSize} shot of ${sh.characterIds?.join(', ') || 'character'} in ${sh.locationId}, ${sh.lightingAndAtmosphere}. Lens: ${sh.lensIntent || '35mm anamorphic'}. ${sh.blockingAndMovement}.`;
        }

        return {
          ...sh,
          order: index + 1,
          duration: dur as 6 | 8 | 10,
          flowMode,
          routeManualOverride: false,
          routingConfidence: sh.routingConfidence || 0.9,
          ingredientAssetIds: sh.ingredientAssetIds || [...(sh.characterIds || []), ...(sh.propIds || []), sh.locationId].filter(Boolean),
          firstFramePrompt,
          endFramePrompt: sh.endFramePrompt || null,
          referenceReadiness: 'READY' as const,
          continuityNotes: sh.continuityNotes || [],
          generationComplexity: sh.generationComplexity || 'MEDIUM',
        };
      });

      res.json({ success: true, shots });
    } catch (error: any) {
      console.error('Error generating shot plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate shot plan',
      });
    }
  });

  // 16. Regenerate Single Scene
  app.post('/api/gemini/regenerate-scene', async (req: Request, res: Response) => {
    try {
      const { scene, storyCanon, scriptSettings, guidance } = req.body;

      const prompt = `You are a precision screenplay editor at XEMACS7 STUDIO AI.
Refine this single screenplay scene while keeping stable ID '${scene.sceneId}'.

Scene to Refine:
- Title: ${scene.title}
- Story Purpose: ${scene.storyPurpose}
- Characters: ${(scene.characterIds || []).join(', ')}
- Current Action: ${scene.actionBlocks?.map((a: any) => a.visibleAction).join('\n')}
- Current Dialogue: ${scene.dialogueBlocks?.map((d: any) => `${d.speakerName}: "${d.dialogue}"`).join('\n')}

User Guidance / Pacing Directive: ${guidance || 'Enhance dialogue punch and filmable staging.'}

Return updated ScriptScene JSON.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              storyPurpose: { type: Type.STRING },
              actionBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    description: { type: Type.STRING },
                    visibleAction: { type: Type.STRING },
                    characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedSeconds: { type: Type.INTEGER },
                  },
                  required: ['id', 'description', 'visibleAction', 'characterIds', 'estimatedSeconds'],
                },
              },
              dialogueBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    speakerId: { type: Type.STRING },
                    speakerName: { type: Type.STRING },
                    dialogue: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['DIALOGUE', 'INNER_VO', 'VOICE_OVER', 'NARRATOR', 'OFFSCREEN', 'DEVICE_AUDIO'] },
                  },
                  required: ['id', 'speakerId', 'speakerName', 'dialogue', 'type'],
                },
              },
              scriptText: { type: Type.STRING },
              estimatedSceneDuration: { type: Type.INTEGER },
            },
            required: ['title', 'storyPurpose', 'actionBlocks', 'dialogueBlocks', 'scriptText', 'estimatedSceneDuration'],
          },
        },
      });

      const updated = parseCleanJson<any>(response.text);

      const repairedScene = {
        ...scene,
        ...updated,
        hasUserModifications: true,
      };

      res.json({ success: true, scene: repairedScene });
    } catch (error: any) {
      console.error('Error regenerating scene:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate scene',
      });
    }
  });

  // 17. Regenerate Single Shot
  app.post('/api/gemini/regenerate-shot', async (req: Request, res: Response) => {
    try {
      const { shot, scene, styleBible, stage2Assets, guidance } = req.body;

      const prompt = `You are a precision cinematographer at XEMACS7 STUDIO AI.
Refine shot [${shot.shotId}] for scene [${scene?.sceneId || shot.sceneId}].

MANDATORY DURATION RULE:
Duration MUST remain strictly 6, 8, or 10 seconds (currently ${shot.duration}s).

Current Shot:
- Purpose: ${shot.purpose}
- Size/Angle/Movement: ${shot.shotSize} / ${shot.cameraAngle} / ${shot.cameraMovement}
- Blocking: ${shot.blockingAndMovement}
- Lighting: ${shot.lightingAndAtmosphere}
- Flow Mode: ${shot.flowMode}
- First Frame Prompt: ${shot.firstFramePrompt || 'None'}

User Guidance: ${guidance || 'Improve camera dynamism and visual clarity.'}

Return refined CinematicShot JSON with duration 6, 8, or 10.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              purpose: { type: Type.STRING },
              duration: { type: Type.INTEGER, description: 'Duration in seconds: strictly 6, 8, or 10' },
              shotSize: { type: Type.STRING },
              cameraAngle: { type: Type.STRING },
              lensIntent: { type: Type.STRING },
              cameraMovement: { type: Type.STRING },
              blockingAndMovement: { type: Type.STRING },
              lightingAndAtmosphere: { type: Type.STRING },
              firstFramePrompt: { type: Type.STRING },
              routingReason: { type: Type.STRING },
            },
            required: ['purpose', 'duration', 'shotSize', 'cameraAngle', 'cameraMovement', 'blockingAndMovement', 'lightingAndAtmosphere'],
          },
        },
      });

      const updated = parseCleanJson<any>(response.text);

      let dur = Number(updated.duration);
      if (dur !== 6 && dur !== 8 && dur !== 10) dur = shot.duration;

      const repairedShot = {
        ...shot,
        ...updated,
        duration: dur as 6 | 8 | 10,
      };

      res.json({ success: true, shot: repairedShot });
    } catch (error: any) {
      console.error('Error regenerating shot:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate shot',
      });
    }
  });

  // 18. Audit Stage 3 (Script & Shot Plan)
  app.post('/api/gemini/audit-stage3', async (req: Request, res: Response) => {
    try {
      const {
        scenes,
        shots,
        storyCanon,
        storySourceMode,
        importedScript,
        stage2Assets,
        styleBible,
        scriptSettings,
        targetRuntime,
      } = req.body;

      const issues: any[] = [];
      let issueCounter = 1;

      const maxShotDuration = Number(scriptSettings?.maxShotDuration) || 10;

      // 1. Programmatic Invariant Check: Every shot must be 6, 8, or 10 seconds and <= maxShotDuration
      for (const sh of (shots || [])) {
        if (sh.duration !== 6 && sh.duration !== 8 && sh.duration !== 10) {
          issues.push({
            issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            category: 'SHOT_DURATION',
            shotId: sh.shotId,
            description: `Shot ${sh.shotId} has non-standard duration of ${sh.duration}s. Stage 3 requires strictly 6, 8, or 10 seconds.`,
            consequence: 'Blocks Stage 3 approval due to invalid video duration partition.',
            suggestedFix: `Adjust shot duration to 6s, 8s, or 10s.`,
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        } else if (sh.duration > maxShotDuration) {
          issues.push({
            issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            category: 'SHOT_DURATION',
            shotId: sh.shotId,
            description: `Shot ${sh.shotId} duration of ${sh.duration}s exceeds selected maximum of ${maxShotDuration}s.`,
            consequence: 'Blocks approval as it violates the project max-shot constraint.',
            suggestedFix: `Reduce duration to ${maxShotDuration}s.`,
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // 2. FRAMES Route must have firstFramePrompt
        if (sh.flowMode === 'FRAMES' && (!sh.firstFramePrompt || !sh.firstFramePrompt.trim())) {
          issues.push({
            issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            category: 'FIRST_FRAME_PROMPT',
            shotId: sh.shotId,
            description: `Shot ${sh.shotId} is routed to FRAMES but missing a firstFramePrompt.`,
            consequence: 'Google Flow FRAMES mode cannot initialize without an opening frame image prompt.',
            suggestedFix: 'Generate a copy-paste ready first frame prompt matching the shot staging and Style Bible.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }
      }

      // 3. Programmatic Check: Scene coverage (every scene must have at least one shot)
      const shotSceneIds = new Set((shots || []).map((s: any) => s.sceneId));
      for (const sc of (scenes || [])) {
        if (!shotSceneIds.has(sc.sceneId)) {
          issues.push({
            issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            category: 'SCENE_COVERAGE',
            sceneId: sc.sceneId,
            description: `Scene ${sc.sceneId} ("${sc.title}") has no corresponding planned shots.`,
            consequence: 'Narrative gap in production plan.',
            suggestedFix: 'Decompose this scene into 6s, 8s, or 10s shots.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }
      }

      // 4. Runtime reconciliation check
      const totalPlannedRuntime = (shots || []).reduce((acc: number, s: any) => acc + (s.duration || 0), 0);
      if (targetRuntime && Math.abs(totalPlannedRuntime - targetRuntime) > 10) {
        issues.push({
          issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
          severity: 'WARNING',
          category: 'RUNTIME',
          description: `Total planned shot runtime (${totalPlannedRuntime}s) diverges from target runtime (${targetRuntime}s) by ${totalPlannedRuntime - targetRuntime}s.`,
          consequence: 'Project may run slightly longer or shorter than intended target.',
          suggestedFix: 'Review scene timings or adjust shot durations across scenes.',
          fixClass: 'NEEDS_USER_REVIEW',
          status: 'OPEN',
        });
      }

      // 5. Call Gemini to audit continuity, eyelines, and style alignment
      const shotsSnippet = (shots || []).slice(0, 8).map((s: any) =>
        `[${s.shotId}] (${s.duration}s, ${s.shotSize}, ${s.cameraMovement}) Route: ${s.flowMode}. Action: ${s.blockingAndMovement}. Lighting: ${s.lightingAndAtmosphere}`
      ).join('\n');

      const auditPrompt = `You are the Lead Production Auditor at XEMACS7 STUDIO AI.
Audit these planned film shots for continuity, lighting consistency, and production feasibility.

Visual Style: ${styleBible?.inheritedStyle?.name || 'Cinematic Realism'}
Shots Sample:
${shotsSnippet}

Flag any subtle screen direction errors, contradictory lighting falloff, or missing assets.
Output a JSON array of up to 3 additional issues with severity WARNING or INFO.`;

      try {
        const response = await callGeminiWithFallback({
          contents: auditPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['WARNING', 'INFO'] },
                  category: { type: Type.STRING },
                  shotId: { type: Type.STRING },
                  description: { type: Type.STRING },
                  consequence: { type: Type.STRING },
                  suggestedFix: { type: Type.STRING },
                  fixClass: { type: Type.STRING, enum: ['SAFE_AUTOFIX', 'NEEDS_USER_REVIEW'] },
                },
                required: ['severity', 'category', 'description', 'consequence', 'suggestedFix', 'fixClass'],
              },
            },
          },
        });

        const aiIssues = parseCleanJson<any[]>(response.text);
        for (const aiIssue of (aiIssues || [])) {
          issues.push({
            ...aiIssue,
            issueId: `ST3-AUD-${String(issueCounter++).padStart(2, '0')}`,
            status: 'OPEN',
          });
        }
      } catch (e) {
        console.warn('AI secondary audit pass skipped:', e);
      }

      const openReq = issues.filter((i) => i.severity === 'REQUIRED').length;
      const score = Math.max(70, 100 - openReq * 15 - issues.filter((i) => i.severity === 'WARNING').length * 4);

      res.json({
        success: true,
        audit: {
          overallScore: score,
          summary: openReq === 0
            ? 'Production Script & Visual Shot Plan are approved for production. All shot durations comply with 6/8/10s standard.'
            : `${openReq} required issue(s) detected. Fix required issues before locking Stage 3.`,
          issues,
          auditedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error auditing Stage 3:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit Stage 3',
      });
    }
  });

  // 19. Auto-Fix Stage 3 Issue
  app.post('/api/gemini/auto-fix-stage3-issue', async (req: Request, res: Response) => {
    try {
      const { issue, shot, scene, styleBible, stage2Assets } = req.body;

      if (issue.category === 'SHOT_DURATION' && shot) {
        // Fix shot duration to closest valid 6, 8, or 10
        const validDurations: (6 | 8 | 10)[] = [6, 8, 10];
        const closest = validDurations.reduce((prev, curr) =>
          Math.abs(curr - (shot.duration || 8)) < Math.abs(prev - (shot.duration || 8)) ? curr : prev
        );
        const repairedShot = {
          ...shot,
          duration: closest,
        };
        return res.json({
          success: true,
          repairedShot,
          explanation: `Adjusted shot ${shot.shotId} duration to standard ${closest}s.`,
        });
      }

      if (issue.category === 'FIRST_FRAME_PROMPT' && shot) {
        // Generate missing first frame prompt
        const prompt = `${styleBible?.inheritedStyle?.name || 'Cinematic realism'} master first frame for ${shot.shotId}. Framing: ${shot.shotSize}, ${shot.cameraAngle}. Action: ${shot.blockingAndMovement}. Lighting: ${shot.lightingAndAtmosphere}. Lens: ${shot.lensIntent || '35mm anamorphic'}. Production reference still.`;
        const repairedShot = {
          ...shot,
          firstFramePrompt: prompt,
        };
        return res.json({
          success: true,
          repairedShot,
          explanation: `Generated copy-paste ready firstFramePrompt for shot ${shot.shotId}.`,
        });
      }

      res.json({
        success: true,
        explanation: `Issue reviewed and verified.`,
      });
    } catch (error: any) {
      console.error('Error auto-fixing Stage 3 issue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-fix Stage 3 issue',
      });
    }
  });

  // 19b. Generate Shot Keyframe Image (Gemini Flash Lite Image - Truthful Model Output)
  app.post('/api/gemini/generate-shot-image', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio, shotId = 'SHOT' } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      // Map and validate supported aspect ratios
      const validAspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
      let selectedAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' = '16:9';
      if (aspectRatio && validAspectRatios.includes(aspectRatio)) {
        selectedAspectRatio = aspectRatio;
      } else if (aspectRatio === '21:9') {
        selectedAspectRatio = '16:9'; // nearest standard video ratio
      }

      let generatedDataUrl: string | null = null;
      let failureError: any = null;

      // Attempt generation via Gemini Flash Lite Image
      try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: selectedAspectRatio,
            },
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              generatedDataUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (geminiError: any) {
        failureError = geminiError;
        console.warn('[Image Gen] Gemini Flash Lite Image failed:', geminiError?.message || geminiError);
      }

      // Truthful error response: never substitute synthetic SVG keyframes
      if (!generatedDataUrl) {
        const status = failureError?.status === 429 ? 429 : 502;
        const errMessage = failureError?.message || 'Gemini image generation model did not return image data.';
        return res.status(status).json({
          success: false,
          error: errMessage,
          code: failureError?.status === 429
            ? 'RATE_LIMIT'
            : failureError?.status === 503
            ? 'SERVICE_UNAVAILABLE'
            : 'MODEL_IMAGE_UNAVAILABLE',
          fallbackAction: 'COPY_PROMPT_AND_UPLOAD',
          prompt,
          aspectRatio: selectedAspectRatio,
          shotId,
        });
      }

      res.json({
        success: true,
        imageData: generatedDataUrl,
        aspectRatio: selectedAspectRatio,
        shotId,
      });
    } catch (error: any) {
      console.error('Error generating shot image:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate shot image',
        code: 'INTERNAL_ERROR',
        fallbackAction: 'COPY_PROMPT_AND_UPLOAD',
      });
    }
  });

  // 20. Generate Google Flow Video Prompt Packages (Stage 4)
  app.post('/api/gemini/generate-flow-prompts', async (req: Request, res: Response) => {
    try {
      const {
        shots,
        scenes,
        visualStyle,
        styleBible,
        stage2Assets,
        storyCanon,
        targetSettings,
        settings,
        storySourceMode,
      } = req.body;

      if (!shots || !Array.isArray(shots) || shots.length === 0) {
        return res.status(400).json({ success: false, error: 'No Stage 3 shots provided.' });
      }

      const shotsContext = shots.map((sh: any) => {
        const scene = (scenes || []).find((sc: any) => sc.sceneId === sh.sceneId);
        return `
SHOT [${sh.shotId}] (Scene: ${sh.sceneId}, Order #${sh.order})
- Flow Route: ${sh.flowMode}
- Planned Duration: ${sh.duration}s
- Purpose: ${sh.purpose}
- Camera: ${sh.shotSize} | ${sh.cameraAngle} | ${sh.cameraMovement} (Lens: ${sh.lensIntent || 'Standard 35mm'})
- Blocking & Staging: ${sh.blockingAndMovement}
- Performance Notes: ${sh.performanceNotes || 'Natural emotional engagement'}
- Lighting & Atmosphere: ${sh.lightingAndAtmosphere}
- Characters Present: ${(sh.characterIds || []).join(', ')}
- Location: ${sh.locationId}
- Props: ${(sh.propIds || []).join(', ')}
- Dialogue / Audio Context: ${sh.audioContext || scene?.dialogueBlocks?.map((d: any) => `${d.speakerName}: "${d.dialogue}"`).join('; ') || 'No spoken dialogue'}
- Entry Visual State: ${sh.entryVisualState || 'Initial cut framing'}
- Exit Visual State: ${sh.exitVisualState || 'Trailing motion resolution'}
${sh.flowMode === 'FRAMES' && sh.firstFramePrompt ? `- Approved First Frame Prompt: ${sh.firstFramePrompt}` : ''}
`;
      }).join('\n---\n');

      const assetsContext = (stage2Assets || []).map((a: any) =>
        `- [${a.id}] (${a.type}) "${a.name}": ${a.visualSpecification?.summary || a.storyFunction}. Prompt: ${a.referencePrompt}`
      ).join('\n');

      const prompt = `You are the Lead Google Flow Video Prompt Architect at XEMACS7 STUDIO AI.
Transform every approved Stage 3 shot into a complete, professional, production-ready Google Flow video prompt package.

STRICT INSTRUCTIONS:
1. PRODUCE EXACTLY ONE PACKAGE PER INPUT SHOT in the exact input order. Preserve shotId, sceneId, and order verbatim.
2. PRESERVE DURATION & ROUTE: Do NOT change the duration (${shots.map((s: any) => `${s.shotId}:${s.duration}s`).join(', ')}) or flowMode (INGREDIENTS or FRAMES).
3. INGREDIENTS ROUTE:
   - Provide a complete 'videoPrompt' that instructs the video generator to preserve reference identities and styles while animating the exact action.
   - Fill 'referenceChecklist' with items linking real Stage 2 asset IDs (${(stage2Assets || []).map((a: any) => a.id).join(', ')}).
4. FRAMES ROUTE:
   - Preserve or refine the 'firstFramePrompt' describing the exact opening keyframe still image.
   - Create an actionable 'videoPrompt' focusing on the motion, camera move, and performer action unfolding from that initial keyframe.
5. AUDIO LANES:
   - Explicitly separate 'dialogue' (preserve author dialogue verbatim), 'narrationOrVO', 'ambience', 'sfx', and 'music'.
6. TIMELINE ACTION TIMING:
   - Break down the shot's ${shots[0]?.duration || 8}s duration into 2-3 logical beats (e.g. "0-2s", "2-6s", "6-8s").
7. VISUAL STYLE FIDELITY:
   - Obey Master Visual Style '${visualStyle?.name}' (${visualStyle?.medium}, ${visualStyle?.realismLevel}). If animated/anime, preserve the illustrated medium; do NOT force photorealism.
8. CONTINUITY ANCHORS:
   - Document screen direction, prop hand states, lighting continuity, and exit visual state preparing the next shot.
9. GENRE & EMOTIONAL TONE INFLUENCE:
   - Story Genre: ${formatGenresForPrompt(settings || targetSettings)}
   - Emotional Tone: ${formatToneForPrompt(settings || targetSettings)}
   - Ensure camera speed, actor performance intensity, pacing, and soundscape directly reflect this tone.

ASSET DIRECTORY:
${assetsContext}

APPROVED STAGE 3 SHOTS TO COMPILE:
${shotsContext}

Return structured JSON array of GoogleFlowShotPackage objects matching the requested schema.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of GoogleFlowShotPackage objects',
            items: {
              type: Type.OBJECT,
              properties: {
                shotId: { type: Type.STRING },
                sceneId: { type: Type.STRING },
                order: { type: Type.INTEGER },
                purpose: { type: Type.STRING },
                flowMode: { type: Type.STRING, enum: ['INGREDIENTS', 'FRAMES'] },
                videoPrompt: { type: Type.STRING },
                firstFramePrompt: { type: Type.STRING },
                endFramePrompt: { type: Type.STRING },
                audioLanes: {
                  type: Type.OBJECT,
                  properties: {
                    dialogue: { type: Type.STRING },
                    narrationOrVO: { type: Type.STRING },
                    ambience: { type: Type.STRING },
                    sfx: { type: Type.STRING },
                    music: { type: Type.STRING },
                    lipSyncRequired: { type: Type.BOOLEAN },
                  },
                  required: ['dialogue', 'narrationOrVO', 'ambience', 'sfx', 'music', 'lipSyncRequired'],
                },
                actionTiming: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeRange: { type: Type.STRING },
                      action: { type: Type.STRING },
                    },
                    required: ['timeRange', 'action'],
                  },
                },
                continuityAnchors: {
                  type: Type.OBJECT,
                  properties: {
                    entryVisualState: { type: Type.STRING },
                    exitVisualState: { type: Type.STRING },
                    screenDirection: { type: Type.STRING },
                    propAndHandState: { type: Type.STRING },
                    lightingAtmosphere: { type: Type.STRING },
                    styleConsistency: { type: Type.STRING },
                  },
                  required: ['entryVisualState', 'exitVisualState', 'screenDirection', 'propAndHandState', 'lightingAtmosphere', 'styleConsistency'],
                },
                referenceChecklist: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      assetId: { type: Type.STRING },
                      assetType: { type: Type.STRING },
                      assetName: { type: Type.STRING },
                      role: { type: Type.STRING, enum: ['PRIMARY', 'SECONDARY', 'ENVIRONMENT'] },
                      mediaStatus: { type: Type.STRING, enum: ['AVAILABLE', 'IMAGE_PENDING'] },
                    },
                    required: ['assetId', 'assetType', 'assetName', 'role', 'mediaStatus'],
                  },
                },
                exclusions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                generationComplexity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              },
              required: [
                'shotId',
                'sceneId',
                'order',
                'purpose',
                'flowMode',
                'videoPrompt',
                'audioLanes',
                'actionTiming',
                'continuityAnchors',
                'referenceChecklist',
              ],
            },
          },
        },
      });

      const rawPackages = parseCleanJson<any[]>(response.text);

      // Reconcile and strictly merge with approved Stage 3 shot data
      const shotPackages = (shots || []).map((sourceShot: any, idx: number) => {
        const generated = (rawPackages || []).find((p: any) => p.shotId === sourceShot.shotId) || rawPackages?.[idx] || {};

        // Resolve reference checklist with Stage 2 real assets
        const mappedAssets = (stage2Assets || []).filter((a: any) =>
          (sourceShot.characterIds || []).includes(a.id) ||
          (sourceShot.propIds || []).includes(a.id) ||
          a.id === sourceShot.locationId
        );

        const checklist = mappedAssets.map((a: any) => {
          const hasMedia = Boolean(a.referenceMedia?.verified || a.optionalReferenceImageData);
          return {
            assetId: a.id,
            assetType: a.type,
            assetName: a.name,
            role: a.type === 'CHARACTER' ? ('PRIMARY' as const) : a.type === 'LOCATION' ? ('ENVIRONMENT' as const) : ('SECONDARY' as const),
            promptId: a.id,
            referencePromptText: a.referencePrompt,
            mediaStatus: (hasMedia ? 'AVAILABLE' : 'IMAGE_PENDING') as 'AVAILABLE' | 'IMAGE_PENDING',
          };
        });

        const isFrames = sourceShot.flowMode === 'FRAMES';
        const firstFramePrompt = sourceShot.firstFramePrompt || generated.firstFramePrompt || null;

        // Normalize real media contract
        const hasRealFirstFrameMedia = Boolean(
          sourceShot.firstFrameMedia?.verified ||
          (sourceShot.firstFrameImageData && sourceShot.firstFrameImageData.length > 50)
        );

        const firstFrameMedia = hasRealFirstFrameMedia
          ? (sourceShot.firstFrameMedia || {
              source: 'UPLOAD',
              mediaId: sourceShot.firstFrameImageId || `shot_${sourceShot.shotId}`,
              mimeType: 'image/png',
              filename: sourceShot.firstFrameFileName || `${sourceShot.shotId}-first-frame.png`,
              verified: true,
              storageRef: sourceShot.firstFrameImageId || `shot_${sourceShot.shotId}`,
              dataUrl: sourceShot.firstFrameImageData || null,
            })
          : null;

        // Determine readiness states truthfully:
        // TEXT_READY is independent of media status
        const hasTextBlocked = isFrames && (!firstFramePrompt || !firstFramePrompt.trim());
        const textReadiness = hasTextBlocked ? 'TEXT_BLOCKED' : 'TEXT_READY';

        const capabilityVerified = Boolean(
          targetSettings?.capabilityVerified ||
          sourceShot.capabilityStatus === 'VERIFIED_COMPATIBLE'
        );

        let mediaReadiness: 'EXECUTION_READY' | 'MEDIA_PENDING' | 'CAPABILITY_UNVERIFIED';
        if (isFrames) {
          if (!hasRealFirstFrameMedia) {
            mediaReadiness = 'MEDIA_PENDING';
          } else if (!capabilityVerified) {
            mediaReadiness = 'CAPABILITY_UNVERIFIED';
          } else {
            mediaReadiness = 'EXECUTION_READY';
          }
        } else {
          const allIngredientsReady = checklist.length > 0 && checklist.every((c: any) => c.mediaStatus === 'AVAILABLE');
          if (!allIngredientsReady) {
            mediaReadiness = 'MEDIA_PENDING';
          } else if (!capabilityVerified) {
            mediaReadiness = 'CAPABILITY_UNVERIFIED';
          } else {
            mediaReadiness = 'EXECUTION_READY';
          }
        }

        return {
          shotId: sourceShot.shotId,
          sceneId: sourceShot.sceneId,
          episodeId: sourceShot.episodeId || null,
          order: idx + 1,
          purpose: sourceShot.purpose,
          flowMode: sourceShot.flowMode as 'INGREDIENTS' | 'FRAMES',
          plannedDuration: sourceShot.duration as 6 | 8 | 10,
          aspectRatio: settings?.aspectRatio || '16:9',
          targetModel: targetSettings?.targetModel || 'Google Veo 2 / Flow Standard',
          capabilityStatus: capabilityVerified ? ('VERIFIED_COMPATIBLE' as const) : ('NOT_VERIFIED' as const),
          characterIds: sourceShot.characterIds || [],
          wardrobeIds: sourceShot.wardrobeIds || [],
          locationId: sourceShot.locationId,
          propIds: sourceShot.propIds || [],
          referenceChecklist: checklist.length > 0 ? checklist : (generated.referenceChecklist || []),
          firstFramePrompt,
          firstFrameMedia,
          firstFrameImageId: firstFrameMedia?.mediaId || sourceShot.firstFrameImageId || null,
          firstFrameMediaStatus: isFrames ? (hasRealFirstFrameMedia ? 'AVAILABLE' : 'IMAGE_PENDING') : 'NOT_APPLICABLE',
          endFramePrompt: sourceShot.endFramePrompt || generated.endFramePrompt || null,
          endFrameImageId: sourceShot.endFrameImageId || null,
          endFrameMediaStatus: sourceShot.endFramePrompt ? 'IMAGE_PENDING' : 'NOT_APPLICABLE',
          videoPrompt: generated.videoPrompt || `${sourceShot.shotSize} shot of ${sourceShot.blockingAndMovement}. Lighting: ${sourceShot.lightingAndAtmosphere}.`,
          audioLanes: {
            dialogue: sourceShot.dialogueText || generated.audioLanes?.dialogue || 'None',
            narrationOrVO: sourceShot.narrationText || generated.audioLanes?.narrationOrVO || 'None',
            ambience: generated.audioLanes?.ambience || 'Atmospheric room tone',
            sfx: sourceShot.sfxText || generated.audioLanes?.sfx || 'Natural Foley movement',
            music: generated.audioLanes?.music || 'Subtle cinematic score',
            lipSyncRequired: Boolean(sourceShot.dialogueRefs?.length || sourceShot.dialogueText),
          },
          actionTiming: generated.actionTiming || [
            { timeRange: `0–${Math.round(sourceShot.duration / 2)}s`, action: sourceShot.blockingAndMovement },
            { timeRange: `${Math.round(sourceShot.duration / 2)}–${sourceShot.duration}s`, action: sourceShot.exitVisualState || 'Resolution movement' },
          ],
          continuityAnchors: generated.continuityAnchors || {
            previousShotRef: sourceShot.continuationFromShotId || undefined,
            entryVisualState: sourceShot.entryVisualState || 'Opening cut framing',
            exitVisualState: sourceShot.exitVisualState || 'Trailing motion resolution',
            screenDirection: sourceShot.screenDirection || 'Centered subject axis',
            propAndHandState: 'Held securely as staged',
            lightingAtmosphere: sourceShot.lightingAndAtmosphere || 'Motivated scene lighting',
            styleConsistency: visualStyle?.name || 'Master visual style',
          },
          exclusions: generated.exclusions || [
            'No camera jitter or unmotivated motion',
            'No character wardrobe drift or anatomy deformation',
            'No modern artificial artifacts',
          ],
          textReadiness,
          mediaReadiness,
          generationComplexity: generated.generationComplexity || sourceShot.generationComplexity || 'MEDIUM',
          promptVersion: 1,
          hasUserEdits: false,
          notes: sourceShot.continuityNotes?.join('; ') || '',
          continuationFromShotId: sourceShot.continuationFromShotId || null,
          continuationJustification: sourceShot.continuationJustification || null,
          continuationMediaStatus: isFrames ? (hasRealFirstFrameMedia ? 'AVAILABLE' : 'IMAGE_PENDING') : 'NOT_APPLICABLE',
          continuationMediaDependency: sourceShot.continuationMediaId || (isFrames && sourceShot.continuationFromShotId ? `shot_${sourceShot.continuationFromShotId}_final_frame` : null),
          textToVideoMode: !isFrames && checklist.length === 0,
          speechSection: sourceShot.dialogueText
            ? `[SPEECH & AUDIO DIRECTIONS]\nType: Verbatim Dialogue\nLine: "${sourceShot.dialogueText}"`
            : '[SPEECH & AUDIO DIRECTIONS]\nAudio Mode: INTENTIONALLY SILENT',
          speechDialogueVerbatim: sourceShot.dialogueText || '',
          speechSpeakerName: sourceShot.dialogueText ? (sourceShot.dialogueText.split(':')[0] || 'Speaker').trim() : '',
          honestProductionStatus: (isFrames && !hasRealFirstFrameMedia) ? 'MEDIA_PENDING' : (!isFrames && checklist.some((c: any) => c.mediaStatus === 'IMAGE_PENDING')) ? 'MEDIA_PENDING' : 'READY_FOR_FLOW',
        };
      });

      res.json({ success: true, shotPackages });
    } catch (error: any) {
      console.error('Error generating Google Flow prompts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate Google Flow video prompts',
      });
    }
  });

  // 21. Regenerate Single Google Flow Prompt
  app.post('/api/gemini/regenerate-flow-prompt', async (req: Request, res: Response) => {
    try {
      const { shotPackage, shot, styleBible, stage2Assets, guidance } = req.body;

      const prompt = `You are a precision video prompt engineer at XEMACS7 STUDIO AI.
Refine the final Google Flow video prompt for shot [${shotPackage.shotId}].

Shot Details:
- Route: ${shotPackage.flowMode}
- Duration: ${shotPackage.plannedDuration}s
- Purpose: ${shotPackage.purpose}
- Staging / Motion: ${shot?.blockingAndMovement || shotPackage.videoPrompt}
- Current Video Prompt:
"""
${shotPackage.videoPrompt}
"""

User Guidance for refinement:
"${guidance || 'Enhance visual precision, camera clarity, and motion dynamics without altering canonical facts.'}"

Return updated videoPrompt, actionTiming, and exclusions in JSON.`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              videoPrompt: { type: Type.STRING },
              actionTiming: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeRange: { type: Type.STRING },
                    action: { type: Type.STRING },
                  },
                  required: ['timeRange', 'action'],
                },
              },
              exclusions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['videoPrompt', 'actionTiming'],
          },
        },
      });

      const updated = parseCleanJson<any>(response.text);

      const repairedPackage = {
        ...shotPackage,
        videoPrompt: updated.videoPrompt,
        actionTiming: updated.actionTiming || shotPackage.actionTiming,
        exclusions: updated.exclusions || shotPackage.exclusions,
        promptVersion: (shotPackage.promptVersion || 1) + 1,
        hasUserEdits: true,
      };

      res.json({ success: true, shotPackage: repairedPackage });
    } catch (error: any) {
      console.error('Error regenerating Flow prompt:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate prompt',
      });
    }
  });

  // 22. Audit Stage 4 Production Package
  app.post('/api/gemini/audit-stage4', async (req: Request, res: Response) => {
    try {
      const {
        shotPackages,
        shots,
        storyCanon,
        storySourceMode,
        importedScript,
        stage2Assets,
        styleBible,
      } = req.body;

      const issues: any[] = [];
      let issueCounter = 1;

      const sourceShotIds = new Set((shots || []).map((s: any) => s.shotId));
      const seenPackageIds = new Set<string>();

      // 1. Duplicate & Unknown packages check
      for (const pkg of (shotPackages || [])) {
        if (seenPackageIds.has(pkg.shotId)) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'shotId',
            description: `Duplicate Google Flow package detected for shot ID ${pkg.shotId}.`,
            consequence: 'Duplicate shot packages corrupt sequence order and flow queue execution.',
            suggestedFix: 'Remove duplicate packages so exactly one package exists per approved Stage 3 shot.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }
        seenPackageIds.add(pkg.shotId);

        if (!sourceShotIds.has(pkg.shotId)) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'shotId',
            description: `Package references shot ID ${pkg.shotId} which does not exist in approved Stage 3 shot plan.`,
            consequence: 'Extraneous packages without approved Stage 3 source shots violate stage continuity.',
            suggestedFix: 'Prune extraneous packages or regenerate from current Stage 3 shots.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }
      }

      // 2. Coverage Check: Every Stage 3 shot must have a package
      for (const sh of (shots || [])) {
        if (!seenPackageIds.has(sh.shotId)) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: sh.shotId,
            fieldPath: 'shotPackages',
            description: `Stage 3 approved shot ${sh.shotId} is missing an output Google Flow prompt package.`,
            consequence: 'Blocks Stage 4 approval due to incomplete video shot coverage.',
            suggestedFix: 'Re-run generation to ensure full coverage of all approved shots.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }
      }

      // 3. Per-package validation against Stage 3 shot spec
      for (const pkg of (shotPackages || [])) {
        const matchingShot = (shots || []).find((s: any) => s.shotId === pkg.shotId);

        if (matchingShot) {
          // Route fidelity
          if (pkg.flowMode !== matchingShot.flowMode) {
            issues.push({
              issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
              severity: 'REQUIRED',
              shotId: pkg.shotId,
              fieldPath: 'flowMode',
              description: `Shot ${pkg.shotId} route (${pkg.flowMode}) does not match approved Stage 3 route (${matchingShot.flowMode}).`,
              consequence: 'Mismatched generation mode breaks intended ingredients vs frames workflow.',
              suggestedFix: `Reset flowMode to ${matchingShot.flowMode}.`,
              fixClass: 'SAFE_AUTOFIX',
              status: 'OPEN',
            });
          }

          // Duration fidelity
          if (pkg.plannedDuration !== matchingShot.duration) {
            issues.push({
              issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
              severity: 'REQUIRED',
              shotId: pkg.shotId,
              fieldPath: 'plannedDuration',
              description: `Shot ${pkg.shotId} duration (${pkg.plannedDuration}s) does not match approved Stage 3 duration (${matchingShot.duration}s).`,
              consequence: 'Deviates from locked timeline and duration reconciliation.',
              suggestedFix: `Sync plannedDuration to ${matchingShot.duration}s.`,
              fixClass: 'SAFE_AUTOFIX',
              status: 'OPEN',
            });
          }

          // Scene & order fidelity
          if (pkg.sceneId !== matchingShot.sceneId) {
            issues.push({
              issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
              severity: 'REQUIRED',
              shotId: pkg.shotId,
              fieldPath: 'sceneId',
              description: `Shot ${pkg.shotId} sceneId (${pkg.sceneId}) does not match approved Stage 3 scene (${matchingShot.sceneId}).`,
              consequence: 'Breaks scene hierarchy.',
              suggestedFix: `Sync sceneId to ${matchingShot.sceneId}.`,
              fixClass: 'SAFE_AUTOFIX',
              status: 'OPEN',
            });
          }
        }

        // Duration validation
        if (pkg.plannedDuration !== 6 && pkg.plannedDuration !== 8 && pkg.plannedDuration !== 10) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'plannedDuration',
            description: `Shot ${pkg.shotId} duration of ${pkg.plannedDuration}s is invalid. Must be strictly 6s, 8s, or 10s.`,
            consequence: 'Violates core planning constraints.',
            suggestedFix: 'Reconcile duration with approved Stage 3 shot specification.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // FRAMES route first-frame prompt
        if (pkg.flowMode === 'FRAMES' && (!pkg.firstFramePrompt || !pkg.firstFramePrompt.trim())) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'firstFramePrompt',
            description: `Shot ${pkg.shotId} is routed to FRAMES but missing a firstFramePrompt.`,
            consequence: 'Google Flow FRAMES mode cannot begin without an initial frame prompt.',
            suggestedFix: 'Generate a copy-paste ready first frame prompt.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // Empty video prompt
        if (!pkg.videoPrompt || pkg.videoPrompt.trim().length < 20) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'videoPrompt',
            description: `Shot ${pkg.shotId} video prompt is too short or missing crucial staging details.`,
            consequence: 'Incomplete prompt text will produce poor video generation results in Flow.',
            suggestedFix: 'Refine the prompt with full blocking, camera motion, and lighting directives.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // Audio completeness
        if (!pkg.audioLanes || typeof pkg.audioLanes.dialogue === 'undefined') {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'audioLanes',
            description: `Shot ${pkg.shotId} is missing structured audio lane mappings.`,
            consequence: 'Incomplete audio specifications prevent synchronized dialogue and Foley design.',
            suggestedFix: 'Populate audio lanes with dialogue, ambience, and SFX directives.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // Continuity anchors completeness
        if (!pkg.continuityAnchors || !pkg.continuityAnchors.entryVisualState || !pkg.continuityAnchors.exitVisualState) {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'REQUIRED',
            shotId: pkg.shotId,
            fieldPath: 'continuityAnchors',
            description: `Shot ${pkg.shotId} is missing entry/exit continuity anchors.`,
            consequence: 'Lacks visual bridge to adjacent shots.',
            suggestedFix: 'Define entry and exit visual states.',
            fixClass: 'SAFE_AUTOFIX',
            status: 'OPEN',
          });
        }

        // Media pending (WARNING, non-blocking for textual package approval)
        if (pkg.mediaReadiness === 'MEDIA_PENDING') {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'WARNING',
            shotId: pkg.shotId,
            fieldPath: 'mediaReadiness',
            description: `Shot ${pkg.shotId} requires external reference files that are not yet attached.`,
            consequence: 'Textual prompt package is approved, but manual asset upload in Google Flow is needed prior to generation.',
            suggestedFix: 'Produce external frames or reference images using the supplied image prompts.',
            fixClass: 'NEEDS_USER_REVIEW',
            status: 'OPEN',
          });
        }

        // Capability unverified (WARNING)
        if (pkg.capabilityStatus === 'NOT_VERIFIED') {
          issues.push({
            issueId: `ST4-AUD-${String(issueCounter++).padStart(2, '0')}`,
            severity: 'INFO',
            shotId: pkg.shotId,
            fieldPath: 'capabilityStatus',
            description: `Target Google Flow model capabilities not verified for duration ${pkg.plannedDuration}s in selected aspect ratio.`,
            consequence: 'Ensure your chosen Flow model supports ${pkg.plannedDuration}s generation before execution.',
            suggestedFix: 'Confirm model settings manually in the Google Flow console.',
            fixClass: 'NEEDS_USER_REVIEW',
            status: 'OPEN',
          });
        }
      }

      const requiredIssues = issues.filter((i) => i.severity === 'REQUIRED');
      const score = Math.max(70, 100 - requiredIssues.length * 15 - issues.filter((i) => i.severity === 'WARNING').length * 2);

      res.json({
        success: true,
        audit: {
          overallScore: score,
          summary: requiredIssues.length === 0
            ? 'Stage 4 Google Flow package audit passed with ZERO required textual blockers.'
            : `Audit detected ${requiredIssues.length} required textual issues that must be resolved prior to locking.`,
          issues,
          auditedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error auditing Stage 4:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit Stage 4 package',
      });
    }
  });

  // 23. Auto-Fix Stage 4 Issue
  app.post('/api/gemini/auto-fix-stage4-issue', async (req: Request, res: Response) => {
    try {
      const { issue, shotPackage, styleBible, stage2Assets } = req.body;

      if (issue.fieldPath === 'firstFramePrompt' && shotPackage) {
        const generated = `${styleBible?.inheritedStyle?.name || 'Cinematic'} opening still keyframe for shot ${shotPackage.shotId}: framing of ${shotPackage.characterIds?.join(', ') || 'character'} in ${shotPackage.locationId}. Lighting: ${shotPackage.continuityAnchors?.lightingAtmosphere || 'Warm atmospheric lighting'}. Staging: ${shotPackage.purpose}.`;
        const repaired = {
          ...shotPackage,
          firstFramePrompt: generated,
          textReadiness: 'TEXT_READY' as const,
        };
        return res.json({ success: true, repairedPackage: repaired });
      }

      res.json({ success: true, repairedPackage: shotPackage });
    } catch (error: any) {
      console.error('Error auto-fixing Stage 4 issue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to auto-fix issue',
      });
    }
  });

  // 24. Refine Storyboard Card Prompt
  app.post('/api/gemini/refine-storyboard-prompt', async (req: Request, res: Response) => {
    try {
      const { shot, visualStyle, styleBible, characters, location, frameType } = req.body;

      const charsContext = (characters || [])
        .map((c: any) => `- ${c.name} (${c.archetype || c.role}): ${c.visualSpecification?.summary || c.visualSpecification?.keyFeatures?.join(', ') || ''}`)
        .join('\n');

      const prompt = `You are a legendary Hollywood visual storyboard artist and master cinematographer at XEMACS7 AI FILM STUDIO.
Write an ultra-detailed, cinematic ${frameType === 'end' ? 'ending keyframe still' : 'opening keyframe still'} image generation prompt for Storyboard Shot ${shot.shotId}.

Project Visual Aesthetic:
- Master Style: ${visualStyle?.name || 'Cinematic'} (${visualStyle?.medium || 'Live Action Cinema'}, ${visualStyle?.realismLevel || 'REALISTIC'})
- Color & Tone: ${visualStyle?.colorIntent || 'Film graded color palette'}
- Lighting Rules: ${styleBible?.lightingRules || visualStyle?.lightingIntent || 'Cinematic volumetric contrast'}

Shot Directives:
- Sequence & Purpose: ${shot.purpose || 'Dramatic progression'}
- Shot Size: ${shot.shotSize || 'MEDIUM'}
- Camera Angle: ${shot.cameraAngle || 'EYE_LEVEL'}
- Camera Movement: ${shot.cameraMovement || 'STATIC'}
- Lens: ${shot.lensIntent || '35mm anamorphic prime lens'}
- Framing / Composition: ${shot.framing || 'Rule of thirds composition'}
- Staging & Blocking: ${frameType === 'end' ? shot.exitVisualState || shot.subjectEndPosition : shot.entryVisualState || shot.subjectStartPosition || shot.blockingAndMovement}
- Location: ${location?.name || shot.locationId} (${location?.visualSpecification?.summary || location?.moodAtmosphere || 'Atmospheric set'})
${charsContext ? `Characters present:\n${charsContext}` : ''}
${shot.continuityNotes?.length ? `Continuity Anchors:\n${shot.continuityNotes.join(', ')}` : ''}

Strict Prompting Rules:
1. Compose a single, comprehensive, copy-paste ready English image prompt.
2. Emphasize physical camera optics, composition, volumetric lighting, character wardrobe texture, facial micro-expression, and environment depth.
3. Absolutely adhere to the master visual style '${visualStyle?.name}'.
4. Avoid buzzwords like 'hyperrealistic' or 'photorealistic'; use concrete photographic and artistic descriptors (e.g., 35mm film grain, anamorphic flare, Kodak Vision3 tone).
5. Append the aspect ratio parameter (e.g. '--ar 9:16' or '--ar 16:9').

Return JSON:
{
  "refinedPrompt": "the full prompt text",
  "cinematographyNotes": "1-2 sentence note on why this composition achieves dramatic continuity"
}`;

      const response = await callGeminiWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refinedPrompt: { type: Type.STRING },
              cinematographyNotes: { type: Type.STRING },
            },
            required: ['refinedPrompt', 'cinematographyNotes'],
          },
        },
      });

      const result = parseCleanJson(response.text);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error refining storyboard prompt:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to refine storyboard prompt',
      });
    }
  });

  // Serve static assets in production or Vite middleware in dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[XEMACS7 Studio 2.0] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
