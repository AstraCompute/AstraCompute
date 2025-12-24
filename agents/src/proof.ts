import { execSync } from "node:child_process";
import { detectHardware, sampleGpu, HostCompute } from "./lib/hardware";

/**
 * PROOF that the compute is real. Samples Windows' own CPU load counter
 * before and during a burn, so the numbers come from the OS - not from us.
 *   npx tsx src/proof.ts
 * (Watch Task Manager > Performance > CPU at the same time.)
 */
function systemCpuLoad(): number {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"',
      { timeout: 8000 }
    ).toString().trim();
    return Math.round(Number(out));
  } catch {
    return -1;
  }
}

async function main() {
  const hw = detectHardware();
  console.log("\n=== AGORA compute proof ===");
  console.log(`machine   ${hw.hostname}`);
  console.log(`cpu       ${hw.cpuModel} (${hw.cores} threads)`);
  console.log(`gpu       ${hw.gpuName}${hw.hasNvidiaSmi ? " [nvidia-smi live]" : ""}`);
  console.log(`ram       ${hw.ramGB} GB\n`);

  const before = systemCpuLoad();
  const gpuBefore = sampleGpu();
  console.log(`OS-reported CPU load BEFORE burn: ${before}%`);