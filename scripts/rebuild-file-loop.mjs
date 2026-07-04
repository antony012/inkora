import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");
const targetRel = "src/lib/store.ts";

function relPath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith(root)) return path.relative(root, filePath).replace(/\\/g, "/");
  if (filePath.includes("NuevaTemporada")) {
    return filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "").replace(/\\/g, "/");
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
    const rel = relPath(inp.path);
    if (rel !== targetRel) continue;
    if (part.name === "Write") content = inp.contents;
    if (part.name === "StrReplace" && inp.old_string != null && inp.new_string != null) {
      strReplaces.push({ old_string: inp.old_string, new_string: inp.new_string });
    }
  }
}

let applied = 0;
let pass = 0;
while (pass < 20) {
  pass += 1;
  let changed = false;
  for (const patch of strReplaces) {
    if (!content.includes(patch.old_string)) continue;
    content = content.replace(patch.old_string, patch.new_string);
    applied += 1;
    changed = true;
  }
  if (!changed) break;
}

const target = path.join(root, targetRel);
fs.writeFileSync(target, content, "utf8");
console.log("passes", pass, "applied", applied, "len", content.length, "registerUser", content.includes("registerUser"));
