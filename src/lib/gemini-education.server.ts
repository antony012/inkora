import { readFileSync } from "fs";
import path from "path";

let cachedEducation: string | null = null;

/** Solo servidor — lee config/enderxon-gemini-education.md */
export function loadGeminiEducation(): string {
  if (cachedEducation !== null) return cachedEducation;

  try {
    const file = path.join(process.cwd(), "config", "enderxon-gemini-education.md");
    cachedEducation = readFileSync(file, "utf8").trim();
  } catch {
    cachedEducation = "";
  }

  return cachedEducation;
}
