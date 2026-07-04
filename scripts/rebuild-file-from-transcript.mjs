import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");
const targetRel = (process.argv[2] ?? "src/lib/store.ts").replace(/\\/g, "/");

function relPath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith(root)) return path.relative(root, filePath);
  if (filePath.includes("NuevaTemporada")) {
    return filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "");
  }
  return null;
}

let content = null;
const strReplaces = [];

for (const line of fs.readFileSync(transcript, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  for (const part of obj?.message?.content ?? []) {
    if (part?.type !== "tool_use") continue;
    const inp = part?.input ?? {};
    const rel = relPath(inp.path)?.replace(/\\/g, "/");
    if (rel !== targetRel) continue;
    if (part.name === "Write") content = inp.contents;
    if (part.name === "StrReplace" && inp.old_string != null && inp.new_string != null) {
      strReplaces.push({ old_string: inp.old_string, new_string: inp.new_string });
    }
  }
}

if (!content) {
  console.error("No Write found for", targetRel);
  process.exit(1);
}

for (const [index, patch] of strReplaces.entries()) {
  if (!content.includes(patch.old_string)) {
    console.warn("miss", index);
    continue;
  }
  content = content.replace(patch.old_string, patch.new_string);
  console.log("ok", index);
}

const target = path.join(root, targetRel);
fs.writeFileSync(target, content, "utf8");
console.log("written", targetRel, content.length);
