import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");
const files = new Map();

for (const line of fs.readFileSync(transcript, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  for (const part of obj?.message?.content ?? []) {
    if (part?.type !== "tool_use" || part?.name !== "Write") continue;
    const filePath = part?.input?.path;
    const contents = part?.input?.contents;
    if (!filePath || contents == null) continue;
    let rel;
    if (filePath.startsWith(root)) {
      rel = path.relative(root, filePath);
    } else if (filePath.includes("NuevaTemporada")) {
      rel = filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "");
    } else {
      continue;
    }
    files.set(rel, contents);
  }
}

for (const [rel, contents] of files) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
  console.log("restored", rel);
}

console.log("TOTAL", files.size);
