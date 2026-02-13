import { readCache, writeCache } from "@/lib/localCache";

const WARMUP_META_KEY = "map:warmup:meta";

interface WarmupMeta {
  styleUrl: string;
  maxZoom: number;
  completedAt: string;
  totalRequests: number;
}

interface MapStyleSource {
  tiles?: string[];
  type?: string;
}

interface MapStyleLayer {
  layout?: {
    "text-font"?: string[];
  };
}

interface MapStyle {
  glyphs?: string;
  sprite?: string;
  sources?: Record<string, MapStyleSource>;
  layers?: MapStyleLayer[];
}

function buildUrl(base: string, path: string) {
  return new URL(path, base).toString();
}

async function fetchSafe(url: string) {
  try {
    await fetch(url, { mode: "cors", credentials: "omit" });
  } catch {
    // Best effort only
  }
}

function uniqueFonts(style: MapStyle) {
  const fonts = new Set<string>();
  style.layers?.forEach((layer) => {
    layer.layout?.["text-font"]?.forEach((font) => fonts.add(font));
  });
  return [...fonts];
}

async function fetchInBatches(urls: string[], batchSize: number) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(batch.map((url) => fetchSafe(url)));
  }
}

function countTilesUpToZoom(maxZoom: number) {
  return (4 ** (maxZoom + 1) - 1) / 3;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.ceil(totalSeconds)}s`;
  if (totalSeconds < 3600) return `${Math.ceil(totalSeconds / 60)}m`;
  return `${(totalSeconds / 3600).toFixed(1)}h`;
}

async function warmupTileTemplates(
  styleUrl: string,
  tileTemplates: string[],
  maxZoom: number,
  batchSize: number,
  progressInterval: number,
) {
  const resolvedTemplates = tileTemplates.map((template) =>
    buildUrl(styleUrl, template),
  );

  const totalTilesPerTemplate = countTilesUpToZoom(maxZoom);
  const totalTileRequests = totalTilesPerTemplate * resolvedTemplates.length;

  let processed = 0;
  let sinceLastLog = 0;
  let batch: string[] = [];

  for (let z = 0; z <= maxZoom; z += 1) {
    const max = 2 ** z;
    for (let x = 0; x < max; x += 1) {
      for (let y = 0; y < max; y += 1) {
        for (const template of resolvedTemplates) {
          batch.push(
            template
              .replace("{z}", String(z))
              .replace("{x}", String(x))
              .replace("{y}", String(y)),
          );

          if (batch.length >= batchSize) {
            await fetchInBatches(batch, batchSize);
            processed += batch.length;
            sinceLastLog += batch.length;
            batch = [];

            if (sinceLastLog >= progressInterval) {
              const pct = ((processed / totalTileRequests) * 100).toFixed(1);
              console.info(
                `[map-cache] warmup progress ${pct}% (${processed}/${totalTileRequests} tile requests)`,
              );
              sinceLastLog = 0;
            }
          }
        }
      }
    }
  }

  if (batch.length > 0) {
    await fetchInBatches(batch, batchSize);
    processed += batch.length;
  }

  return totalTileRequests;
}

export async function warmupGlobalMapCache(
  styleUrl: string,
  maxZoom = 3,
  batchSize = 20,
  estimatedReqPerSecond = 50,
) {
  const previous = readCache<WarmupMeta>(WARMUP_META_KEY);
  if (
    previous &&
    previous.styleUrl === styleUrl &&
    previous.maxZoom === maxZoom
  ) {
    return;
  }

  const styleResponse = await fetch(styleUrl, {
    mode: "cors",
    credentials: "omit",
  });
  if (!styleResponse.ok) return;

  const style = (await styleResponse.json()) as MapStyle;

  const urls = new Set<string>();
  urls.add(styleUrl);

  if (style.sprite) {
    const spriteBase = buildUrl(styleUrl, style.sprite);
    urls.add(`${spriteBase}.json`);
    urls.add(`${spriteBase}.png`);
    urls.add(`${spriteBase}@2x.json`);
    urls.add(`${spriteBase}@2x.png`);
  }

  if (style.glyphs) {
    const fonts = uniqueFonts(style);
    const glyphRanges = ["0-255.pbf", "256-511.pbf"];
    fonts.forEach((font) => {
      glyphRanges.forEach((range) => {
        urls.add(
          buildUrl(
            styleUrl,
            style.glyphs!
              .replace("{fontstack}", encodeURIComponent(font))
              .replace("{range}", range),
          ),
        );
      });
    });
  }

  const tileTemplates: string[] = [];
  Object.values(style.sources ?? {}).forEach((source) => {
    source.tiles?.forEach((template) => {
      tileTemplates.push(template);
    });
  });

  await fetchInBatches([...urls], 20);
  const totalTileRequests =
    countTilesUpToZoom(maxZoom) * Math.max(tileTemplates.length, 1);
  const estimatedSeconds = totalTileRequests / Math.max(estimatedReqPerSecond, 1);
  console.info(
    `[map-cache] warmup starting at zoom ${maxZoom}. ~${totalTileRequests.toLocaleString()} tile requests across ${tileTemplates.length} sources. Estimated time: ${formatDuration(estimatedSeconds)}+`,
  );

  const processedTileRequests = await warmupTileTemplates(
    styleUrl,
    tileTemplates,
    maxZoom,
    batchSize,
    2000,
  );
  console.info(
    `[map-cache] warmup completed. Processed ${processedTileRequests.toLocaleString()} tile requests.`,
  );

  writeCache<WarmupMeta>(WARMUP_META_KEY, {
    styleUrl,
    maxZoom,
    completedAt: new Date().toISOString(),
    totalRequests: processedTileRequests + urls.size,
  });
}
