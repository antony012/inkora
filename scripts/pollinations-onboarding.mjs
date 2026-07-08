import fs from "node:fs";

const key = fs
  .readFileSync(".env.local", "utf8")
  .match(/POLLINATIONS_API_KEY=(.+)/)?.[1]
  ?.trim();

if (!key) {
  console.error("Falta POLLINATIONS_API_KEY en .env.local");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}` };
const jsonHeaders = { ...headers, "Content-Type": "application/json" };

async function fetchWithTimeout(url, init = {}, timeoutMs = 35_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const contentType = res.headers.get("content-type") ?? "";
    const text = contentType.includes("json") || contentType.includes("text")
      ? await res.text()
      : `bytes ${Buffer.from(await res.arrayBuffer()).length} ${contentType}`;
    return { status: res.status, text };
  } catch (error) {
    return {
      status: 0,
      text: error instanceof Error ? error.name : "error",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function get(path) {
  return fetchWithTimeout(`https://gen.pollinations.ai${path}`, { headers });
}

async function post(path, body, timeoutMs = 35_000) {
  return fetchWithTimeout(
    `https://gen.pollinations.ai${path}`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
}

console.log("=== Saldo y misiones (requiere permiso account:usage en la clave) ===");
for (const path of ["/account/balance", "/account/quests"]) {
  const result = await get(path);
  console.log(path, result.status, result.text.slice(0, 500));
}

console.log("\n=== 1/3 Texto ===");
const text = await post("/v1/chat/completions", {
  model: "openai-fast",
  messages: [{ role: "user", content: "Di hola" }],
});
console.log("texto", text.status, text.text.slice(0, 120));

console.log("\n=== 2/3 Imagen (POST /v1/images/generations) ===");
const image = await post("/v1/images/generations", {
  prompt: "small tattoo star sketch",
  model: "flux",
  response_format: "b64_json",
  size: "512x512",
  nologo: true,
  private: true,
});
console.log("imagen POST", image.status, image.text.slice(0, 120));

console.log("\n=== 2b Imagen (GET image.pollinations.ai) ===");
const imageGet = await fetchWithTimeout(
  "https://image.pollinations.ai/prompt/small%20tattoo%20star?model=flux&width=512&height=512&nologo=true",
  { headers },
);
console.log("imagen GET", imageGet.status, imageGet.text.slice(0, 80));

console.log("\n=== 3/3 Audio ===");
const audio = await post("/v1/chat/completions", {
  model: "openai-audio",
  modalities: ["text", "audio"],
  audio: { voice: "alloy", format: "mp3" },
  messages: [{ role: "user", content: "Di hola" }],
});
let audioLen = 0;
try {
  const audioJson = JSON.parse(audio.text);
  audioLen = audioJson.choices?.[0]?.message?.audio?.data?.length ?? 0;
} catch {
  // ignore
}
console.log("audio", audio.status, "audioB64Len", audioLen, audio.text.slice(0, 80));

console.log("\n=== Edición tatuaje (requiere saldo > 0) ===");
const tiny =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mNk+M9Qz0BkYBxVSF+FAAB2XwPa1B6EqQAAAABJRU5ErkJggg==";
const edit = await post("/v1/images/edits", {
  prompt: "place tattoo on arm skin photorealistic",
  model: "nanobanana",
  response_format: "b64_json",
  image: [tiny, tiny],
  private: true,
  nologo: true,
});
console.log("edit", edit.status, edit.text.slice(0, 200));

console.log("\nRecarga enter.pollinations.ai y reclama las misiones pendientes (imagen + audio).");
