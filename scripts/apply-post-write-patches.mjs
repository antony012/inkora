import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");

function relPath(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith(root)) return path.relative(root, filePath);
  if (filePath.includes("NuevaTemporada")) {
    return filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "");
  }
  return null;
}

const lastWriteLine = new Map();
const strReplaces = [];

const lines = fs.readFileSync(transcript, "utf8").split(/\r?\n/);
lines.forEach((line, index) => {
  if (!line.trim()) return;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return;
  }
  for (const part of obj?.message?.content ?? []) {
    if (part?.type !== "tool_use") continue;
    const inp = part?.input ?? {};
    const rel = relPath(inp.path);
    if (!rel) continue;
    if (part.name === "Write") lastWriteLine.set(rel, index);
    if (part.name === "StrReplace") {
      strReplaces.push({ line: index, rel, old_string: inp.old_string, new_string: inp.new_string });
    }
  }
});

for (const patch of strReplaces) {
  const writeLine = lastWriteLine.get(patch.rel);
  if (writeLine == null || patch.line <= writeLine) continue;
  const target = path.join(root, patch.rel);
  if (!fs.existsSync(target)) continue;
  let content = fs.readFileSync(target, "utf8");
  if (!content.includes(patch.old_string)) {
    console.warn("skip miss", patch.rel, patch.line);
    continue;
  }
  content = content.replace(patch.old_string, patch.new_string);
  fs.writeFileSync(target, content, "utf8");
  console.log("applied", patch.rel, patch.line);
}
