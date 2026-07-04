import fs from "node:fs";
import path from "node:path";

const transcript = path.resolve(
  "C:/Users/antony.solorzano/.cursor/projects/c-Users-antony-solorzano-Desktop-NuevaTemporada/agent-transcripts/882c7ca3-5cd1-48f0-b2bf-39b7e733147b/882c7ca3-5cd1-48f0-b2bf-39b7e733147b.jsonl",
);
const root = path.resolve("c:/Users/antony.solorzano/Desktop/NuevaTemporada");

function relPath(filePath) {
  if (filePath.startsWith(root)) return path.relative(root, filePath);
  if (filePath.includes("NuevaTemporada")) {
    return filePath.split("NuevaTemporada")[1].replace(/^[/\\]+/, "");
  }
  return null;
}

function applyPatch(patch) {
  const add = patch.match(/\*\*\* Add File: (.+)\n([\s\S]*?)\*\*\* End Patch/);
  if (add) {
    const rel = relPath(add[1].trim());
    if (!rel) return;
    const body = add[2]
      .split("\n")
      .filter((line) => line.startsWith("+"))
      .map((line) => line.slice(1))
      .join("\n");
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body, "utf8");
    return;
  }

  const update = patch.match(/\*\*\* Update File: (.+)\n([\s\S]*?)\*\*\* End Patch/);
  if (!update) return;
  const rel = relPath(update[1].trim());
  if (!rel) return;
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) return;

  let content = fs.readFileSync(target, "utf8");
  const hunks = update[2].split("@@").slice(1);

  for (const hunk of hunks) {
    const lines = hunk.split("\n");
    lines.shift();
    const oldLines = [];
    const newLines = [];
    for (const line of lines) {
      if (line.startsWith("-")) oldLines.push(line.slice(1));
      else if (line.startsWith("+")) newLines.push(line.slice(1));
      else if (line.startsWith(" ")) {
        oldLines.push(line.slice(1));
        newLines.push(line.slice(1));
      }
    }
    const oldText = oldLines.join("\n");
    const newText = newLines.join("\n");
    if (!content.includes(oldText)) {
      console.warn("hunk miss", rel);
      continue;
    }
    content = content.replace(oldText, newText);
  }

  fs.writeFileSync(target, content, "utf8");
  console.log("patched", rel);
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
    if (part?.type !== "tool_use") continue;
    if (part?.name === "ApplyPatch") {
      applyPatch(part?.input ?? "");
    }
    if (part?.name === "StrReplace") {
      const inp = part?.input ?? {};
      const rel = relPath(inp.path ?? "");
      if (!rel || !inp.old_string || inp.new_string == null) continue;
      const target = path.join(root, rel);
      if (!fs.existsSync(target)) continue;
      let content = fs.readFileSync(target, "utf8");
      if (!content.includes(inp.old_string)) continue;
      content = content.replace(inp.old_string, inp.new_string);
      fs.writeFileSync(target, content, "utf8");
      console.log("strreplaced", rel);
    }
  }
}
