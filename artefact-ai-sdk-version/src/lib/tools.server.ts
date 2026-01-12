import "server-only";
import { tool } from "ai";
import { z } from "zod";

export const calculator = tool({
  description: "Deterministic local calculator for arithmetic expressions.",
  inputSchema: z.object({
    expression: z.string().describe('Math expression, e.g. "128 * 46"'),
  }),
  execute: async ({ expression }) => {
    console.log("[TOOL] Using local CALCULATOR");
    // minimal safe-ish eval: allow digits/operators only
    const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleaned.trim()) {
      throw new Error("Calculator input is empty after sanitization.");
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned});`)();
    if (!Number.isFinite(result)) {
      throw new Error("Calculator result is not a valid number.");
    }
    return Number(result);
  },
});

function ensureFiniteNumber(value: unknown, label: string): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} result is not a valid number.`);
  }
  return num;
}

export const fx_convert = tool({
  description: "Convert fiat currencies using a public FX API.",
  inputSchema: z.object({
    amount: z.number().describe("Amount to convert"),
    from: z.string().describe("Base currency (e.g. USD)"),
    to: z.string().describe("Target currency (e.g. BRL)"),
  }),
  execute: async ({ amount, from, to }) => {
    console.log("[TOOL] Using FX CONVERTER");
    const base = from.toUpperCase();
    const target = to.toUpperCase();
    const url = new URL(`https://open.er-api.com/v6/latest/${base}`);

    const r = await fetch(url.toString());
    if (!r.ok) {
      throw new Error(`FX API error: ${r.status}`);
    }
    const data = await r.json();
    if (data?.result !== "success") {
      throw new Error("FX API did not return success.");
    }
    const rate = ensureFiniteNumber(data?.rates?.[target], "FX");
    const result = rate * Number(amount);
    return Number(result.toFixed(2));
  },
});

export const crypto_convert = tool({
  description:
    "Crypto price/conversion using CoinGecko (no API key required). Use ids like 'bitcoin', 'ethereum'.",
  inputSchema: z.object({
    id: z.string().describe("CoinGecko coin id (e.g. bitcoin)"),
    vs: z.string().describe("Fiat currency (e.g. brl, usd)"),
    amount: z.number().default(1).describe("Amount of crypto"),
  }),
  execute: async ({ id, vs, amount }) => {
    console.log("[TOOL] Using CRYPTO CONVERTER (CoinGecko)");
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", id.toLowerCase());
    url.searchParams.set("vs_currencies", vs.toLowerCase());

    const r = await fetch(url.toString());
    if (!r.ok) {
      throw new Error(`CoinGecko API error: ${r.status}`);
    }
    const data = await r.json();
    const price = data?.[id.toLowerCase()]?.[vs.toLowerCase()];
    const unitPrice = ensureFiniteNumber(price, "CoinGecko");

    return Number((unitPrice * Number(amount)).toFixed(2));
  },
});

export const TOOLS = { calculator, fx_convert, crypto_convert };
