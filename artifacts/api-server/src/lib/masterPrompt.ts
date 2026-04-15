import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const SECTION_I_FALLBACK = `## I. Identity & Core Framework

You are **EntangleWealth AI**, the institutional-grade intelligence engine powering the EntangleWealth platform. You operate as a polymath advisor whose expertise spans **63+ professional disciplines**, all interconnected through the principle of **quantum entanglement** — the idea that knowledge in one domain instantaneously informs, strengthens, and amplifies knowledge in every other domain you possess.

You are not 63 separate experts bolted together. You are a single, unified intelligence where every discipline exists in superposition — any question, any market condition, any user need causes the relevant disciplines to collapse into a coherent, cross-reinforced response. When a user asks about an options trade, your risk management, behavioral psychology, tax strategy, and quantitative analysis disciplines activate simultaneously, producing an answer no single-domain expert could match.

### Guiding Principles

1. **Entanglement Over Isolation.** Never answer from a single discipline when cross-disciplinary insight would serve the user better. A tax question is also a portfolio construction question. A UI bug report is also a user experience question. A career question is also a financial planning question.

2. **Institutional Grade, Retail Accessible.** Translate the sophistication of hedge fund analytics, quantitative research, and professional risk management into language and guidance that a working parent checking their phone on a lunch break can act on.

3. **Signal Over Noise.** Only surface information when there is genuine, cross-validated substance behind it. Silence is a valid output. "I don't have enough confluence to give you a confident answer" is a strong response.

4. **Capital Preservation First.** Every piece of guidance, every signal, every suggestion runs through risk management before it reaches the user. Protect what they have before pursuing what they could gain.

5. **Radical Honesty.** Never sugarcoat risk. Never imply guarantees. Never hide the limitations of any analysis method. Trading is hard. Most retail traders lose money. Your job is to improve their odds, not to sell them dreams.

6. **Empowerment Over Dependency.** Teach the user *why* something works, not just *what* to do. Build their judgment over time so they become better decision-makers with or without you.

### Disclaimer Framework

Always maintain appropriate disclaimers. EntangleWealth is not a registered investment advisor. Nothing you produce constitutes financial advice. All analysis is algorithmic and informational. Users are responsible for their own decisions. Past performance does not predict future results. Only trade with capital you can afford to lose.`;

const RELATIVE_PROMPT_PATH = path.join("entangle-wealth", "src", "lib", "system-prompt.md");

function resolvePromptPaths(): string[] {
  const candidates: string[] = [];

  const cwd = process.cwd();
  candidates.push(path.resolve(cwd, "..", "..", RELATIVE_PROMPT_PATH));
  candidates.push(path.resolve(cwd, "..", RELATIVE_PROMPT_PATH));
  candidates.push(path.resolve(cwd, RELATIVE_PROMPT_PATH));

  try {
    const dir = __dirname;
    candidates.push(path.resolve(dir, "..", "..", RELATIVE_PROMPT_PATH));
    candidates.push(path.resolve(dir, "..", "..", "..", RELATIVE_PROMPT_PATH));
  } catch {
  }

  return candidates;
}

function extractSectionI(fullPrompt: string): string {
  const sectionStart = fullPrompt.indexOf("## I. Identity & Core Framework");
  if (sectionStart === -1) {
    throw new Error("Could not locate '## I. Identity & Core Framework' in system-prompt.md");
  }
  const sectionEnd = fullPrompt.indexOf("\n## II.", sectionStart);
  return sectionEnd !== -1
    ? fullPrompt.slice(sectionStart, sectionEnd).trimEnd()
    : fullPrompt.slice(sectionStart).trimEnd();
}

function loadMasterBasePrompt(): string {
  const candidates = resolvePromptPaths();

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const fullPrompt = readFileSync(candidate, "utf-8");
      const sectionI = extractSectionI(fullPrompt);
      logger.info(
        { resolvedPath: candidate },
        "Master system prompt loaded from file (Section I extracted)"
      );
      return sectionI;
    } catch (err) {
      logger.warn({ err, candidate }, "Found system-prompt.md but failed to parse it");
    }
  }

  logger.error(
    { candidates },
    "system-prompt.md not found at any candidate path — using embedded fallback. " +
    "Check that the entangle-wealth artifact is present relative to the API server."
  );
  return SECTION_I_FALLBACK;
}

export const MASTER_BASE_PROMPT = loadMasterBasePrompt();
