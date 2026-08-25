import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const SRC =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/data/exercises.json";
const outDir = path.join(process.cwd(), "public", "data");
const exDir = path.join(outDir, "ex");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const indexPath = path.join(outDir, "exercises.json");
  if (await exists(indexPath)) {
    console.log("build-data: dati già presenti, skip");
    return;
  }
  console.log("build-data: scarico il dataset...");
  const res = await fetch(SRC);
  if (!res.ok) throw new Error("dataset fetch " + res.status);
  const data = await res.json();

  await mkdir(exDir, { recursive: true });

  const index = [];
  for (const e of data) {
    const media = e.image.split("/").pop().replace(/\.[a-z]+$/i, "");
    index.push({
      i: e.id,
      n: e.name.replace(/в°/g, "°"),
      b: e.body_part,
      e: e.equipment,
      t: e.target,
      s: e.secondary_muscles || [],
      m: media,
    });
    const steps = e.instruction_steps || {};
    await writeFile(
      path.join(exDir, `${e.id}.json`),
      JSON.stringify({ it: steps.it || [], en: steps.en || [] }),
      "utf8"
    );
  }
  await writeFile(indexPath, JSON.stringify(index), "utf8");
  console.log(`build-data: ${index.length} esercizi pronti`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
