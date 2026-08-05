<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

// Pre-generates the tour narrator's voice lines via the Gemini TTS API
// and writes them as static WAV files the frontend just plays directly
// (see resources/js/lib/speech.js) — the ten lines are fixed site copy,
// not per-visitor input, so there's no reason to pay for (or wait on) a
// live API call on every page load. Run once after the script changes:
//
//   php artisan narration:generate [--force] [--only=0,3,welcome]
class GenerateNarrationAudio extends Command
{
    protected $signature = 'narration:generate
        {--force : Regenerate clips that already exist}
        {--only= : Comma-separated 0-based indices and/or extra-clip names to (re)generate, e.g. --only=0,3,welcome}';

    protected $description = "Generate the tour narrator's WAV clips via Gemini TTS";

    // Mirrors tourNarration in resources/js/data/content.js, in the same
    // order — kept duplicated rather than shared: this command runs
    // offline, before Vite ever builds, so it can't depend on anything
    // in that bundle. Update both together if the script changes.
    // "DOST" is deliberately spelled "D-O-S-T" throughout — read as one
    // word, TTS engines pronounce it like "dohst"; hyphenating it spells
    // it out letter by letter instead.
    private const LINES = [
        'Science, Technology and Innovation',
        'One D-O-S-T 4U - Solutions and Opportunities for All',
        "Did you know RSTW just got a whole new name? It's now the Regional Science, Technology, and Innovation Week — with LIC-HA and the R and D Symposium putting homegrown inventions on stage.",
        "Why does RSTW exist as its own regional celebration? So D-O-S-T's own technologies reach every province directly — like the D-O-S-T x LGU Forum, brought straight to local governments.",
        "How does science and technology actually put food on the table? Through blue economy seminars and real farm tech, like AGROTIS, D-O-S-T's own agricultural robot.",
        'What does a more resilient region actually look like? A new satellite calibration lab and cybersecurity training for SETUP-assisted MSMEs — this region\'s own piece of it.',
        'S and T Fair and Exhibits',
        'Regional Forums',
        "Local Inventors' Convention",
        'Tech Demos and Talks',
    ];

    // One-off clips outside the numbered tour — keyed by the slug
    // useAutoPlay/speech.js reference by name (public/audio/narration/
    // <slug>.wav), each with its own style instruction rather than the
    // tour's standard one. Mirrors welcomeNarration in content.js.
    private const EXTRAS = [
        'welcome' => [
            'text' => 'WELCOME TO RSTW 2026!',
            'style' => 'Say with huge excitement and warmth, like joyfully welcoming a big crowd to a grand celebration: ',
        ],
    ];

    // gemini-3.1-flash-tts-preview's own free-tier quota (reported as
    // "limit: 10") stayed exhausted through 100+ seconds of complete
    // silence plus two 40s backoffs — whatever the real reset window is,
    // it's longer than a per-minute cap. This older preview model turned
    // out to carry a separate quota bucket that wasn't exhausted; same
    // request/response shape either way, so swapping the model name was
    // the whole fix.
    private const MODEL = 'gemini-2.5-flash-preview-tts';

    private const VOICE = 'Puck';

    // Layered on top of the base voice per line rather than baked into
    // the voice choice itself — Gemini TTS reads a natural-language
    // style instruction ahead of the actual line (see the docs' own
    // "Say cheerfully: ..." example) and delivers accordingly.
    private const STYLE_PREFIX = 'Say in the voice of an energetic, enthusiastic co-host hyping up the crowd: ';

    private const SAMPLE_RATE = 24000;

    private const CHANNELS = 1;

    private const BITS_PER_SAMPLE = 16;

    // The free tier's own limit is ~10 requests/minute — spacing every
    // line out by this much keeps a full ten-line run under it instead
    // of tripping a 429 partway through.
    private const REQUEST_SPACING_S = 7;

    private const MAX_ATTEMPTS = 3;

    // Google's own 429 body suggests retrying in ~35-38s — rounded up
    // with a margin rather than parsing that figure out of the message.
    private const RETRY_BACKOFF_S = 40;

    public function handle(): int
    {
        $apiKey = config('services.google.api_key');
        if (! $apiKey) {
            $this->error('services.google.api_key is empty — set GOOGLE_API in .env first.');

            return self::FAILURE;
        }

        $outDir = public_path('audio/narration');
        if (! is_dir($outDir) && ! mkdir($outDir, 0755, true) && ! is_dir($outDir)) {
            $this->error("Couldn't create {$outDir}");

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $only = $this->option('only');
        $only = $only === null ? null : explode(',', $only);
        $failures = 0;

        foreach (self::LINES as $i => $line) {
            if ($only !== null && ! in_array((string) $i, $only, true)) {
                continue;
            }

            if (! $this->generateClip($apiKey, $outDir, (string) $i, $line, self::STYLE_PREFIX, $force)) {
                $failures++;
            }
        }

        foreach (self::EXTRAS as $slug => $extra) {
            if ($only !== null && ! in_array($slug, $only, true)) {
                continue;
            }

            if (! $this->generateClip($apiKey, $outDir, $slug, $extra['text'], $extra['style'], $force)) {
                $failures++;
            }
        }

        if ($failures > 0) {
            $this->warn("{$failures} line(s) failed — see errors above. Existing/succeeded clips were kept.");

            return self::FAILURE;
        }

        $this->info('All narration clips generated.');

        return self::SUCCESS;
    }

    // One clip end to end: skip-if-exists, request (with retry/pacing),
    // extract the audio, wrap it as a WAV, save it. Shared by both the
    // numbered tour LINES and the named EXTRAS below — same pipeline,
    // just a different slug/label/style per caller. Returns whether it
    // ended up saved (including "already existed, skipped").
    private function generateClip(string $apiKey, string $outDir, string $slug, string $text, string $stylePrefix, bool $force): bool
    {
        $path = "{$outDir}/{$slug}.wav";

        if (file_exists($path) && ! $force) {
            $this->line("[{$slug}] skip (already exists) — {$text}");

            return true;
        }

        $this->line("[{$slug}] generating — {$text}");

        $response = $this->requestWithRetry($apiKey, $text, $stylePrefix, $slug);
        // Paced regardless of how that line went — a run that barrels
        // through at full speed trips the free tier's own rate cap
        // partway in, cascading into every line after it failing too.
        sleep(self::REQUEST_SPACING_S);

        if ($response === null) {
            return false;
        }

        $data = $this->extractAudioData($response->json());
        if (! $data) {
            $this->error("[{$slug}] no audio found in the response — raw body follows so the field path can be fixed if Google's shape differs from what this command expects:");
            $this->line($response->body());

            return false;
        }

        $pcm = base64_decode($data, true);
        if ($pcm === false) {
            $this->error("[{$slug}] couldn't base64-decode the audio payload");

            return false;
        }

        file_put_contents($path, $this->wrapPcmAsWav($pcm));
        $this->info("[{$slug}] saved — ".basename($path).' ('.strlen($pcm).' bytes PCM)');

        return true;
    }

    // Retries only on a 429 (rate limit) — anything else (bad request,
    // server error) isn't going to fix itself on a second try. Returns
    // null once attempts are exhausted or a non-retryable failure hits,
    // having already reported why.
    private function requestWithRetry(string $apiKey, string $text, string $stylePrefix, string $slug): ?\Illuminate\Http\Client\Response
    {
        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                $response = Http::withHeaders([
                    'x-goog-api-key' => $apiKey,
                    'Content-Type' => 'application/json',
                ])->timeout(60)->post('https://generativelanguage.googleapis.com/v1beta/interactions', [
                    'model' => self::MODEL,
                    'input' => $stylePrefix.$text,
                    'response_format' => ['type' => 'audio'],
                    'generation_config' => [
                        'speech_config' => [
                            ['voice' => self::VOICE],
                        ],
                    ],
                ]);
            } catch (\Throwable $e) {
                $this->error("[{$slug}] request threw: {$e->getMessage()}");

                return null;
            }

            if ($response->status() === 429 && $attempt < self::MAX_ATTEMPTS) {
                $this->warn("[{$slug}] rate limited (attempt {$attempt}/".self::MAX_ATTEMPTS.') — waiting '.self::RETRY_BACKOFF_S.'s before retrying');
                sleep(self::RETRY_BACKOFF_S);

                continue;
            }

            if ($response->failed()) {
                $this->error("[{$slug}] HTTP {$response->status()} — {$response->body()}");

                return null;
            }

            return $response;
        }

        return null;
    }

    // The response's actual shape (confirmed against a live call — the
    // public docs describe a different, older field path that no longer
    // matches): `steps[].content[]` holds one or more parts, and the
    // audio one carries `mime_type: "audio/l16"` (16-bit linear PCM)
    // alongside its base64 `data`. Scanning for that mime type instead
    // of hardcoding `steps.0.content.0` copes with a response that ever
    // orders or adds parts differently.
    private function extractAudioData(?array $body): ?string
    {
        foreach ($body['steps'] ?? [] as $step) {
            foreach ($step['content'] ?? [] as $part) {
                if (str_starts_with($part['mime_type'] ?? '', 'audio/') && ! empty($part['data'])) {
                    return $part['data'];
                }
            }
        }

        return null;
    }

    // Gemini TTS returns raw signed 16-bit PCM (per the docs), which no
    // browser will play without a container — a standard 44-byte WAV
    // header in front of the same bytes is the smallest one that works.
    private function wrapPcmAsWav(string $pcm): string
    {
        $byteRate = self::SAMPLE_RATE * self::CHANNELS * self::BITS_PER_SAMPLE / 8;
        $blockAlign = self::CHANNELS * self::BITS_PER_SAMPLE / 8;
        $dataSize = strlen($pcm);

        $header = 'RIFF'
            .pack('V', 36 + $dataSize)
            .'WAVE'
            .'fmt '
            .pack('V', 16)
            .pack('v', 1) // PCM
            .pack('v', self::CHANNELS)
            .pack('V', self::SAMPLE_RATE)
            .pack('V', $byteRate)
            .pack('v', $blockAlign)
            .pack('v', self::BITS_PER_SAMPLE)
            .'data'
            .pack('V', $dataSize);

        return $header.$pcm;
    }
}
