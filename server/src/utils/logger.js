// Minimal structured JSON logger. Never pass resume content, tokens or passwords here.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export function createLogger({ level = 'info' } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const write =
    (lvl) =>
    (msg, fields = {}) => {
      if (LEVELS[lvl] < threshold) return;
      const line = JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...fields });
      (lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout).write(`${line}\n`);
    };
  return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') };
}
