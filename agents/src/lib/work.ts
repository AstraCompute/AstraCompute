import { ethers } from "ethers";

/**
 * The actual work. Tasks are machine-verifiable toy workloads: the poster
 * publishes a deterministic spec, the agent computes the answer (on rented
 * compute), and the poster re-derives the answer to verify the submitted
 * hash. Rejections in the demo are REAL failed verification, not theater -
 * an agent with skill < 1.0 sometimes computes garbage and gets slashed
 * for it.
 *
 * Spec grammar: "KIND:arg1,arg2"
 *   PRIME_SUM:n          sum of the first n primes
 *   SHA_CHAIN:seed,k     keccak256 applied k times to the seed
 *   MONTE_PI:samples,seed  deterministic Monte-Carlo estimate of pi (4dp)
 *   MATMUL_TRACE:seed,n  trace of A^2 for a seeded n x n integer matrix
 *   MEME:seed            deterministic meme caption (creative "work")
 */

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function primeSum(n: number): bigint {
  const limit = Math.max(1000, Math.floor(n * (Math.log(n + 1) + Math.log(Math.log(n + 3))) * 1.3) + 100);
  const sieve = new Uint8Array(limit + 1);
  let count = 0;
  let sum = 0n;
  for (let i = 2; i <= limit && count < n; i++) {
    if (!sieve[i]) {
      count++;
      sum += BigInt(i);
      for (let j = i * i; j <= limit; j += i) sieve[j] = 1;
    }
  }
  return sum;
}

function shaChain(seed: string, k: number): string {
  let h = ethers.keccak256(ethers.toUtf8Bytes(seed));
  for (let i = 1; i < k; i++) h = ethers.keccak256(h);