
// utils/emotes.js

export function getEmoteForMessage(message: String) {
  const msg = message.toLowerCase();
  if (msg.includes("love") || msg.includes("beautiful")) return "heart_eyes.webm";
  if (msg.includes("joke") || msg.includes("funny")) return "laugh.webm";
  if (msg.includes("mad") || msg.includes("angry")) return "eye_roll.webm";
  if (msg.includes("kiss")) return "kiss.webm";
  if (msg.includes("blush")) return "smile.webm";
  if (msg.includes("wow") || msg.includes("shocked")) return "gasp.webm";
  if (msg.includes("wink")) return "wink.webm";
  if (msg.includes("sad") || msg.includes("cry")) return "pout.webm";
  return "smile.webm"; // default fallback
}
