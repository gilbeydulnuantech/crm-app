import { API_BASE_URL } from './client';

// Shared secret for the Apex Roofing AI Agent's public chat webhook — same
// pattern the original agent already uses for its portfolio-site widget
// (secret sent as a header from the browser). Not sensitive beyond "keeps
// casual scraping off the endpoint" — the agent itself only ever answers
// from the roofing knowledge base, so a leaked secret can't do more than a
// normal site visitor asking questions could.
const CHAT_SECRET = 'b758c2fccfac839f9a51e5f18023643c';

// gpt-oss models on Groq sometimes leak their raw chain-of-thought before
// the actual formatted answer (the agent's system prompt mandates a
// "HEADER\n- bullet\n- bullet\nCTA sentence" shape) — this strips everything
// before the LAST such header, discarding the leaked reasoning trace.
function extractFinalAnswer(text: string): string {
  const re = /([A-Z]{3,20}(?: [A-Z]{2,20}){0,3})\n-\s/g;
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((m = re.exec(text)) !== null) last = m;
  if (!last) return text.trim();
  return (last[1] + text.slice(last.index + last[1].length)).trim();
}

export async function sendChatMessage(message: string, sessionId: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/webhook/roofing-chat`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'x-webhook-secret': CHAT_SECRET,
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to reach the chat assistant.');
  const text = await res.text();
  let answer: string;
  try {
    const json = JSON.parse(text);
    answer = json.output || json.text || json.reply || text;
  } catch {
    answer = text;
  }
  return extractFinalAnswer(answer);
}
