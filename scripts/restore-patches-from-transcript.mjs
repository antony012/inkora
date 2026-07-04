import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");
const files = new Map();

function decodePatch(patch) {
  const match = patch.match(/\*\*\* Add File: (.+)\n([\s\S]*?)\*\*\* End Patch/);
  if (!match) return null;
  const filePath = match[1].trim();
  const body = match[2]
    .split("\n")
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1))
    .join("\n");
  return { filePath, body };
}

function decodeUpdatePatch(patch) {
  // For Update patches we skip - Write has final versions
  return null;
}

for (const line of fs.readFileSync(transcript, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  for (const part of obj?.message?.content ?? []) {
    if (part?.type !== "tool_use" || part?.name !== "ApplyPatch") continue;
    const patch = part?.input ?? "";
    if (typeof patch !== "string") continue;
    if (!patch.includes("*** Add File:")) continue;
    const decoded = decodePatch(patch);
    if (!decoded) continue;
    let rel;
    if (decoded.filePath.startsWith(root)) {
      rel = path.relative(root, decoded.filePath);
    } else if (decoded.filePath.includes("NuevaTemporada")) {
      rel = decoded.filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "");
    } else {
      continue;
    }
    files.set(rel, decoded.body);
  }
}

for (const [rel, contents] of files) {
  const target = path.join(root, rel);
  if (fs.existsSync(target)) {
    console.log("skip existing", rel);
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
  console.log("restored patch", rel);
}

console.log("PATCH FILES", files.size);
