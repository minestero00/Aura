import { spawn } from "node:child_process";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      ...options
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve({
          stdout,
          stderr
        });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}: ${stderr}`));
    });
  });
}

async function ensureDocker() {
  try {
    await runCapture("docker", ["--version"]);
  } catch {
    throw new Error("Docker is not installed. Install Docker Desktop first.");
  }
}

async function resolveComposeCommand() {
  try {
    const result = await runCapture("docker", ["compose", "version"]);
    if (result.stdout.trim().length > 0) {
      return {
        command: "docker",
        argsPrefix: ["compose"]
      };
    }
  } catch {
    // fallback
  }

  try {
    const result = await runCapture("docker-compose", ["version"]);
    if (result.stdout.trim().length > 0 || result.stderr.trim().length > 0) {
      return {
        command: "docker-compose",
        argsPrefix: []
      };
    }
  } catch {
    // fallback
  }

  throw new Error("Docker Compose is not available. Install docker compose plugin or docker-compose.");
}

async function waitForReady(url, timeoutMs = 120000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const { stdout } = await runCapture("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", url]);
      if (stdout.trim() === "200") {
        return;
      }
    } catch {
      // keep retrying
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for readiness endpoint: ${url}`);
}

async function main() {
  await ensureDocker();
  const compose = await resolveComposeCommand();
  await run(compose.command, [...compose.argsPrefix, "-f", "docker-compose.local.yml", "up", "--build", "-d"]);
  await waitForReady("http://127.0.0.1:4000/api/v1/health/ready");
  const smokeEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://aura:aura@127.0.0.1:5432/aura"
  };
  await run("npm", ["run", "smoke:worker", "--workspace", "back"], { env: smokeEnv });
  await run("npm", ["run", "smoke:usage", "--workspace", "back"], { env: smokeEnv });
  console.log("local stack e2e passed");
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
