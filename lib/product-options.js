// Shared lists for the product form, the server actions (to validate input), and the profile card.

export const PLATFORMS = [
  "Web app",
  "iPhone",
  "Android",
  "Mac app",
  "Windows app",
  "Chrome extension",
  "VS Code extension",
  "CLI",
  "API / SDK",
  "MCP server",
  "AI agent skill",
  "Slack / Discord bot",
];

// Hinge-style prompts, software edition. Builders pick up to 3 and answer them.
export const PROMPTS = [
  "My most controversial feature is…",
  "Don't swipe right if you…",
  "The bug I've learned to live with…",
  "My stack's love language is…",
  "Green flag: you'll love me if…",
  "Typical Sunday for me:",
  "2 truths and a lie about my roadmap",
  "I was built because…",
  "First date idea: try this flow…",
  "My changelog says I'm…",
  "I'm weirdly good at…",
  "Looking for someone who…",
];

export const PROMPT_SLOTS = 3;
export const ANSWER_MAX = 150;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
