import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import { verifyFirebaseToken, AuthRequest } from './src/middleware/auth.js';
import wardrobeRouter from './src/routes/wardrobe.js';
import preferencesRouter from './src/routes/preferences.js';
import outfitHistoryRouter from './src/routes/outfitHistory.js';
import shopperCacheRouter, { computeGapsHash } from './src/routes/shopperCache.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Allow large payloads for user photos
app.use(express.json({ limit: '35mb' }));

// ── Database-backed API routes ─────────────────────────────────────────────
if (process.env.DATABASE_URL) {
  app.use('/api/wardrobe', verifyFirebaseToken, wardrobeRouter);
  app.use('/api/preferences', verifyFirebaseToken, preferencesRouter);
  app.use('/api/outfit-history', verifyFirebaseToken, outfitHistoryRouter);
  app.use('/api/shopper-cache', verifyFirebaseToken, shopperCacheRouter);
} else {
  console.warn('DATABASE_URL not set — DB-backed routes disabled. Add DATABASE_URL to .env to enable.');
}

// Shared server-side GenAI client — uses Gemini API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API endpoint for Virtual Outfit Try-On with Nano Banana
app.post('/api/stylist/preview-outfit', async (req, res) => {
  try {
    const {
      userPhotoBase64,
      userPhotoMimeType = 'image/jpeg',
      outfitTitle,
      outfitSubtitle,
      itemsDescription,
      meetingTitle,
      formality,
    } = req.body;

    if (!userPhotoBase64) {
      return res.status(400).json({ error: 'User photo is required.' });
    }

    // Strip data URL prefix if included
    const cleanBase64 = userPhotoBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `You are a world-class luxury fashion photographer and virtual tailor.
Take the person in the provided input photo and generate a stunning, photorealistic fashion editorial portrait of them naturally wearing this exact curated outfit ensemble:

Outfit Title: ${outfitTitle || 'The Polished Look'}
Subtitle: ${outfitSubtitle || ''}
Occasion: ${meetingTitle || 'Executive Meeting'} (${formality || 'Smart'} dress code)

Complete Ensemble to dress the user in:
${itemsDescription}

CRITICAL INSTRUCTIONS:
1. Identity & Likeness: Preserve the person's face, facial features, hair color/style, eye shape, skin tone, body build, and identity accurately from the input reference photo.
2. Fit & Tailoring: Render the specified clothes perfectly tailored to their body proportions. Include realistic fabric textures (wool weave, cotton crispness, leather grain, cashmere softness, natural stitching, seams, and authentic creases).
3. Pose & Lighting: Natural, confident posture. Soft, flattering professional editorial lighting.
4. Setting: Sophisticated London architectural backdrop (e.g. minimalist contemporary office, Canary Wharf colonnade, or luxury hotel lounge) with shallow depth of field.
5. Quality: Ultra-realistic, photorealistic 8k, sharp focus, magazine quality.`;

    const parts: any[] = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: userPhotoMimeType,
        },
      },
      {
        text: promptText,
      },
    ];

    // Generate outfit preview using Gemini image generation (experimental)
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts },
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      });
    } catch (modelErr: any) {
      console.warn('Primary image model attempt error:', modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
      });
    }

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    if (candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageUrl) {
      // If the model returned text description or safety block, extract message
      const textResponse = response.text || 'Image generation completed without visual payload.';
      return res.status(500).json({
        error: 'Unable to render outfit preview image. Please try another photo angle.',
        details: textResponse,
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      outfitTitle,
    });
  } catch (err: any) {
    console.error('Outfit preview generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate outfit preview with Nano Banana.',
    });
  }
});

// Optional auth middleware — attaches uid if a valid token is present, otherwise continues
async function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && process.env.DATABASE_URL) {
    try {
      await verifyFirebaseToken(req, res, next);
    } catch {
      next();
    }
  } else {
    next();
  }
}

// API endpoint for Personal Shopper Agent with Google Search Grounding
app.post('/api/shopper/recommendations', optionalAuth, async (req, res) => {
  try {
    const {
      meetings = [],
      wardrobe = [],
      preferences = null,
      gaps = [],
      userQuery = '',
    } = req.body;

    // Check shopper cache for authenticated users
    const uid = (req as AuthRequest).uid;
    if (uid && process.env.DATABASE_URL && gaps.length > 0 && !userQuery) {
      const prisma = new PrismaClient();
      const gapsHash = computeGapsHash(gaps);
      const cached = await prisma.shopperCache.findFirst({
        where: { userId: uid, gapsHash, expiresAt: { gt: new Date() } },
      });
      if (cached) {
        return res.json({
          success: true,
          recommendations: cached.recommendations,
          webSources: [],
          totalGapsAddressed: gaps.length,
          fromCache: true,
        });
      }
    }

    const meetingsSummary = meetings
      .slice(0, 7)
      .map((m: any) => `- "${m.title}" (${m.formality}, at ${m.location}) on ${m.startTime?.split('T')[0] || 'Upcoming'}`)
      .join('\n');

    const wardrobeSummary = wardrobe
      .map((i: any) => `- ${i.name} (${i.category}/${i.subcategory}, ${i.formality}, ${i.color}, warmth: ${i.warmth}/5, weather: ${i.weatherTags?.join(',') || 'none'})`)
      .join('\n');

    const gapsSummary = gaps
      .map((g: any) => `- [${g.severity.toUpperCase()}] ${g.title}: ${g.description}`)
      .join('\n');

    const promptText = `You are "Jeeves Personal Shopper", an elite London personal stylist and luxury wardrobe acquisitions advisor.
Your role is to analyze the client's upcoming calendar meetings, current wardrobe catalog, detected wardrobe gaps, and personal style preferences, then search the live web to recommend 3 to 5 real, commercially available clothing items to purchase.

Client's Upcoming London Meetings:
${meetingsSummary || 'General smart business commute & meetings'}

Existing Wardrobe Inventory (${wardrobe.length} items):
${wardrobeSummary || 'Basic wardrobe'}

Identified Wardrobe Gaps:
${gapsSummary || 'General capsule replenishment'}

Client Preferences:
- Warmth Lean: ${preferences?.warmthLean || 'balanced'}
- Commute Walking Priority: ${preferences?.commuteComfortPriority ? 'Favors comfortable transit footwear' : 'Standard'}
- Rain Tolerance: ${preferences?.rainToleranceThreshold ?? 30}% threshold
- Favorite Colors: ${preferences?.favoriteColors?.join(', ') || 'Navy, Charcoal, Neutral'}
- Disliked Materials: ${preferences?.dislikedMaterials?.join(', ') || 'None'}

${userQuery ? `Client Specific Shopping Request: "${userQuery}"` : 'Client Objective: Recommend items that resolve their highest priority wardrobe gaps and prepare them for their upcoming calendar commitments and London weather.'}

Search Grounding Instructions:
Use Google Search to find authentic, real garment models currently available from reputable UK/international fashion brands and retailers (such as Barbour, Mackintosh, Reiss, COS, Arket, Sunspel, Grenson, Church's, Uniqlo, Selfridges, Mr Porter, Oliver Spencer, Private White V.C., etc.).

CRITICAL OUTPUT FORMAT:
You MUST respond with a valid JSON array of recommended items inside a \`\`\`json markdown block. Do not include extra conversational text outside the JSON code block.
Each item in the array must have the following schema:
[
  {
    "id": "rec-1",
    "title": "Exact Product Name",
    "brand": "Brand Name",
    "category": "tops" | "bottoms" | "outerwear" | "footwear" | "accessories",
    "subcategory": "e.g. trench coat, oxford shoes, chelsea boots, wool trousers, cashmere knit",
    "formality": "casual" | "smart_casual" | "business_casual" | "business_formal" | "formal",
    "warmth": 1 to 5 (integer, where 1 is summer light, 3 is mid-season, 5 is heavy winter),
    "weatherTags": ["rain_friendly" | "cold" | "breathable" | "all_weather"],
    "color": "Color Name (e.g. Navy, Dark Charcoal, Camel, Black)",
    "colorHex": "#hexCode",
    "material": "e.g. 100% Water-repellent Cotton Gabardine",
    "priceEstimate": "e.g. £285",
    "retailer": "e.g. Mackintosh / Mr Porter",
    "reason": "Detailed, bespoke explanation of why this exact piece fills the client's wardrobe gap, how it pairs with their upcoming meetings, and how it handles London commutes.",
    "searchQueryUrl": "Direct Google Search URL for the item (e.g. https://www.google.com/search?tbm=shop&q=Brand+Product+Name)",
    "meetingFit": "Which upcoming meeting this immediately elevates"
  }
]`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (primaryErr: any) {
      console.warn('Gemini search grounding attempt error, retrying without tools:', primaryErr);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
        });
      } catch (retryErr: any) {
        console.warn('Gemini fallback attempt failed:', retryErr);
        response = null;
      }
    }

    const responseText = response?.text || '';
    
    // Extract web search grounding citations if available
    const groundingChunks = (response?.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || 'Fashion Retailer',
        url: chunk.web.uri,
      }));

    // Extract JSON block
    let recommendations: any[] = [];
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidateJson = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

    try {
      recommendations = JSON.parse(candidateJson);
      if (!Array.isArray(recommendations) && Array.isArray((recommendations as any).recommendations)) {
        recommendations = (recommendations as any).recommendations;
      }
    } catch (parseErr) {
      // Fallback regex attempt for JSON array
      const arrayMatch = candidateJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          recommendations = JSON.parse(arrayMatch[0]);
        } catch (e) {
          console.error('Failed secondary JSON array parse:', e);
        }
      }
    }

    // Ensure IDs, valid categories, and attach grounding if available
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      recommendations = recommendations.map((item, idx) => {
        const matchingSource = webSources[idx] || webSources[0];
        const brandPlusTitle = `${item.brand || ''} ${item.title || ''}`.trim();
        const searchUrl = item.searchQueryUrl?.startsWith('http')
          ? item.searchQueryUrl
          : `https://www.google.com/search?q=${encodeURIComponent(brandPlusTitle + ' buy UK')}&tbm=shop`;

        return {
          id: item.id || `rec-${Date.now()}-${idx}`,
          title: item.title || 'Curated Essential',
          brand: item.brand || 'London Heritage',
          category: ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories'].includes(item.category)
            ? item.category
            : 'outerwear',
          subcategory: item.subcategory || 'garment',
          formality: ['casual', 'smart_casual', 'business_casual', 'business_formal', 'formal'].includes(item.formality)
            ? item.formality
            : 'smart_casual',
          warmth: typeof item.warmth === 'number' ? Math.max(1, Math.min(5, item.warmth)) : 3,
          weatherTags: Array.isArray(item.weatherTags) && item.weatherTags.length > 0
            ? item.weatherTags
            : ['all_weather'],
          color: item.color || 'Navy',
          colorHex: item.colorHex || '#1a2b4c',
          material: item.material || 'Premium Natural Fiber',
          priceEstimate: item.priceEstimate || '£180',
          retailer: item.retailer || 'UK Flagship',
          reason: item.reason || 'Curated specifically to satisfy your upcoming schedule and wardrobe balance.',
          searchQueryUrl: searchUrl,
          sourceUrl: matchingSource?.url || searchUrl,
          sourceTitle: matchingSource?.title || `${item.brand || 'Retailer'} Official`,
          meetingFit: item.meetingFit || meetings[0]?.title || 'Upcoming business meetings',
        };
      });
    } else {
      // Curated fail-safe recommendations tailored to London commutes and business meetings
      recommendations = [
        {
          id: `rec-fallback-1`,
          title: 'Bonded Cotton Waterproof Trench Coat',
          brand: 'Mackintosh',
          category: 'outerwear',
          subcategory: 'trench coat',
          formality: 'business_casual',
          warmth: 3,
          weatherTags: ['rain_friendly', 'all_weather'],
          color: 'Navy',
          colorHex: '#0f172a',
          material: '100% Waterproof Bonded Cotton',
          priceEstimate: '£695',
          retailer: 'Mackintosh Mayfair',
          reason: 'Defends suits and knitwear against London rainfall without compromising clean executive tailoring on commutes.',
          searchQueryUrl: 'https://www.google.com/search?q=Mackintosh+Bonded+Cotton+Waterproof+Trench+Coat&tbm=shop',
          sourceUrl: 'https://mackintosh.com',
          sourceTitle: 'Mackintosh Official',
          meetingFit: meetings[0]?.title || 'Executive Client Review',
        },
        {
          id: `rec-fallback-2`,
          title: 'Goodyear Welted Waterproof Dainite Sole Chelsea Boots',
          brand: 'Loake 1880',
          category: 'footwear',
          subcategory: 'chelsea boots',
          formality: 'smart_casual',
          warmth: 3,
          weatherTags: ['rain_friendly', 'all_weather'],
          color: 'Dark Brown',
          colorHex: '#3b2219',
          material: 'Waxed Calf Leather & Dainite Rubber',
          priceEstimate: '£260',
          retailer: 'Loake Jermyn Street',
          reason: 'Dainite studded rubber soles provide slip-free traction on wet Tube platforms while keeping a sleek boardroom silhouette.',
          searchQueryUrl: 'https://www.google.com/search?q=Loake+1880+Chatsworth+Chelsea+Boot+Dainite&tbm=shop',
          sourceUrl: 'https://www.loake.com',
          sourceTitle: 'Loake Shoemakers',
          meetingFit: 'Daily London Commute',
        },
        {
          id: `rec-fallback-3`,
          title: 'Fine Gauge Merino Wool Turtleneck',
          brand: 'John Smedley',
          category: 'tops',
          subcategory: 'knitwear',
          formality: 'business_casual',
          warmth: 3,
          weatherTags: ['breathable', 'all_weather'],
          color: 'Charcoal Grey',
          colorHex: '#374151',
          material: '100% Extra Fine Merino Wool',
          priceEstimate: '£215',
          retailer: 'John Smedley',
          reason: 'Ultra-refined 30-gauge knit that layers cleanly under a suit jacket for temperature-regulated Tube and office transit.',
          searchQueryUrl: 'https://www.google.com/search?q=John+Smedley+Merino+Rollneck+Knitwear&tbm=shop',
          sourceUrl: 'https://www.johnsmedley.com',
          sourceTitle: 'John Smedley London',
          meetingFit: 'Smart Casual strategy sessions',
        },
      ];
    }

    // Save to cache for authenticated users
    if (uid && process.env.DATABASE_URL && gaps.length > 0 && !userQuery && recommendations.length > 0) {
      try {
        const prisma = new PrismaClient();
        const gapsHash = computeGapsHash(gaps);
        await prisma.shopperCache.create({
          data: {
            userId: uid,
            gapsHash,
            recommendations,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      } catch (cacheErr) {
        console.warn('Failed to save shopper cache:', cacheErr);
      }
    }

    return res.json({
      success: true,
      recommendations,
      webSources,
      totalGapsAddressed: gaps.length,
    });
  } catch (err: any) {
    console.error('Personal shopper error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate shopping recommendations.',
    });
  }
});


async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
