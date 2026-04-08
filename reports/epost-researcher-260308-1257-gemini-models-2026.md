# Research: Google Gemini API Models (March 2026)

**Date**: 2026-03-08
**Agent**: epost-researcher
**Scope**: Current Gemini model availability, exact model IDs, research/web search capabilities
**Status**: ACTIONABLE

---

## Executive Summary

As of March 2026, Google's Gemini API offers **Gemini 3.x models** (latest), **Gemini 2.5 series** (stable, retiring June 1), and **specialized models**. All current models support **grounding with Google Search** via the API, enabling real-time web search for research tasks. Model selection depends on use case: reasoning (Pro), cost/speed (Flash), efficiency (Flash-Lite).

---

## Current Available Models

### Gemini 3 Series (Latest — Feb/Mar 2026)

| Model ID | Status | Best For | Released |
|----------|--------|----------|----------|
| `gemini-3.1-pro-preview` | Preview | Complex reasoning, agentic workflows, coding | Feb 19, 2026 |
| `gemini-3.1-pro-preview-customtools` | Preview | Custom tool prioritization | Feb 19, 2026 |
| `gemini-3-pro-preview` | Preview (deprecated) | — | Nov 18, 2025 |
| `gemini-3-flash-preview` | Preview | Fast reasoning + frontier performance | Dec 17, 2025 |
| `gemini-3.1-flash-lite-preview` | Preview | Most cost-efficient, high-volume | Mar 3, 2026 |
| `gemini-3.1-flash-image-preview` | Preview | Image generation & manipulation | Feb 26, 2026 |
| `gemini-3-pro-image-preview` | Preview | — | (variant) |

### Gemini 2.5 Series (Stable — Retiring June 1, 2026)

| Model ID | Status | Best For |
|----------|--------|----------|
| `gemini-2.5-pro` | Stable | General-purpose complex reasoning |
| `gemini-2.5-flash` | Stable | Multimodal performance, cost-effective |
| `gemini-2.5-flash-lite` | Stable | Ultra-efficient, low latency |
| `gemini-2.5-flash-image` | Stable | Image tasks |
| `gemini-2.5-computer-use-preview-10-2025` | Preview | Autonomous tool use / computer control |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Preview | Native audio input/output |
| `gemini-2.5-flash-preview-tts` | Preview | Text-to-speech synthesis |
| `gemini-2.5-pro-preview-tts` | Preview | Pro reasoning + TTS |

### Specialized Models

| Model ID | Purpose |
|----------|---------|
| `deep-research-pro-preview-12-2025` | Deep research with reasoning |
| `gemini-embedding-001` | Text embeddings |
| `gemini-robotics-er-1.5-preview` | Robotics control |
| `veo-3.1-generate-preview` | Video generation |
| `lyria-realtime-exp` | Real-time audio generation |
| `imagen` | Image generation (deprecated path?) |

---

## Research/Web Search Capabilities

### Grounding with Google Search

**Status**: Fully supported via Gemini API (rolled out Feb 27, 2026)

**All current models support grounding**:
- Automatic: Model analyzes prompt, decides if web search improves answer
- Explicit: Developers can request via `google_search` tool
- Returns: User-facing response + `groundingMetadata` with queries, sources, citations

**Key features**:
- **Real-time data**: Access current events beyond knowledge cutoff
- **Reduce hallucinations**: Answers grounded in verifiable sources
- **Citation control**: Return structured citation data for inline references
- **Multi-language**: Works across all supported languages
- **Image search**: Grounding with Google Image Search available in preview for `gemini-3.1-flash-image-preview`

### Returned Metadata Structure

```json
{
  "text": "answer",
  "groundingMetadata": {
    "searchQueries": ["query1", "query2"],
    "webResults": [
      {"uri": "url", "title": "title", "snippet": "text"}
    ],
    "groundingSupports": [
      {"segment": "answer text", "sources": [0]}
    ]
  }
}
```

---

## Recommendations for Research Tasks

**Best models** (ranked):

1. **`gemini-3.1-pro-preview`** — Most capable reasoning, best for complex research. Best match for your stated use case.
2. **`gemini-3-flash-preview`** — Fast, strong reasoning. Good balance if latency matters.
3. **`gemini-2.5-pro`** — Stable alternative if previews too immature. Retiring June 1.

**Enable grounding**:
- All support Google Search grounding — use by default for research workflows
- Automatic mode works well; explicit `google_search` tool for control

**Cost considerations**:
- 3.1-flash-lite: Lowest cost if you want web search without reasoning overhead
- 3.1-pro: Higher cost but unmatched reasoning for complex synthesis tasks

---

## Critical Dates

| Event | Date |
|-------|------|
| Gemini 3 Pro Preview deprecated | Mar 9, 2026 |
| Gemini 2.0 Flash/Flash-Lite retired | Jun 1, 2026 |
| Gemini 2.5 series EOL (projected) | 2026 Q3–Q4 |

**Action**: If using 2.0 or 2.5, migrate to 3.x before June 1.

---

## Sources

- [Gemini API Models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog)
- [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Google Developers Blog: Grounding Announcement](https://developers.googleblog.com/en/gemini-api-and-ai-studio-now-offer-grounding-with-google-search/)
- [Gemini 3.1 Flash-Lite Launch](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)

---

## Verdict

**ACTIONABLE** — Complete model catalog with exact IDs. All current models support web search grounding. Recommend `gemini-3.1-pro-preview` for research tasks.

---

## Unresolved Questions

- What's the cost difference between Gemini 3 models vs 2.5? (Pricing not in research scope per user request)
- Rate limits / quota per tier? (Beyond scope)
- Latency benchmarks for each model? (Beyond scope)
