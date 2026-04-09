import { spawn } from "node:child_process";

function runCapture(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });
    child.on("error", () => {
      resolve({
        ok: false,
        stdout: "",
        stderr: ""
      });
    });
    child.on("close", code => {
      resolve({
        ok: code === 0,
        stdout,
        stderr
      });
    });
  });
}

async function check(name, command, args) {
  const result = await runCapture(command, args);
  return {
    name,
    ok: result.ok,
    detail: result.ok ? result.stdout.trim() : "not found"
  };
}

async function main() {
  const checks = await Promise.all([
    check("docker", "docker", ["--version"]),
    check("docker compose", "docker", ["compose", "version"]),
    check("node", "node", ["--version"]),
    check("npm", "npm", ["--version"])
  ]);

  console.log("Local Doctor");
  console.log("------------");
  for (const item of checks) {
    console.log(`${item.ok ? "OK " : "NO "} ${item.name}: ${item.detail}`);
  }

  const ready = checks.every(item => item.ok);
  if (!ready) {
    console.log("");
    console.log("Next:");
    console.log("1. Install Docker Desktop and make sure `docker` and `docker compose` work.");
    console.log("2. Run: npm run local:test:e2e");
    process.exit(1);
  }

  console.log("");
  console.log("Ready. Run: npm run local:test:e2e");
}

main();
