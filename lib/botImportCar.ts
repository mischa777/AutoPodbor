import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { ImportedCar } from "@/lib/importCar";

const execFileAsync = promisify(execFile);
const DEFAULT_BOT_ROOT = "C:\\Users\\Mishanya\\Documents\\AutoScoutBot";
const DEFAULT_BOT_PYTHON = `${DEFAULT_BOT_ROOT}\\.venv\\Scripts\\python.exe`;

export async function importCarWithAutoScoutBot(url: string, eurRubRate: number): Promise<ImportedCar> {
  if (process.env.VERCEL || process.env.AUTOSCOUTBOT_DISABLED === "1") {
    throw new Error("AutoScoutBot bridge is disabled in this environment.");
  }

  const python = process.env.AUTOSCOUTBOT_PYTHON || DEFAULT_BOT_PYTHON;
  const botRoot = process.env.AUTOSCOUTBOT_PATH || DEFAULT_BOT_ROOT;
  const scriptPath = path.join(process.cwd(), "scripts", "import_from_autoscoutbot.py");

  const { stdout } = await execFileAsync(
    python,
    [scriptPath, url, "--eur-rub", String(eurRubRate)],
    {
      cwd: botRoot,
      env: {
        ...process.env,
        AUTOSCOUTBOT_PATH: botRoot,
        PYTHONIOENCODING: "utf-8"
      },
      timeout: 75_000,
      maxBuffer: 1024 * 1024 * 4,
      windowsHide: true
    }
  );

  return JSON.parse(stdout) as ImportedCar;
}
