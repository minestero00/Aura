import fs from "node:fs/promises";
import path from "node:path";

const target = path.resolve(
  process.cwd(),
  "node_modules/react-native-sqlite-storage/platforms/android/build.gradle"
);

async function main() {
  try {
    const source = await fs.readFile(target, "utf8");
    if (!source.includes("jcenter()")) {
      return;
    }

    const fixed = source.replace("jcenter()", "mavenCentral()");
    await fs.writeFile(target, fixed, "utf8");
    console.log("patched react-native-sqlite-storage Android gradle repo (jcenter -> mavenCentral)");
  } catch {
    // Ignore when dependency is not installed yet.
  }
}

void main();
