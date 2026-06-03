import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const outDir = path.join(root, "presentation_assets", "screenshots");
await fs.mkdir(outDir, { recursive: true });

const jwtPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400, sub: 1 })).toString("base64url");
const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${jwtPayload}.signature`;
const user = { id: 1, username: "zaid", email: "zaid@dids.local", createdAt: new Date().toISOString() };

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function json(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
      const page = pages.find((p) => p.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error("Could not connect to Chromium DevTools");
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--remote-debugging-port=9222",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--window-size=1440,1100",
  `--user-data-dir=${path.join(outDir, "chrome-profile")}`,
  "about:blank",
], { stdio: "ignore" });

try {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((resolve) => (ws.onopen = resolve));
  const client = new CDP(ws);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1.25,
    mobile: false,
  });

  async function navigate(route, authenticated = false) {
    await client.send("Page.navigate", { url: `http://127.0.0.1:5173${route}` });
    await wait(900);
    if (authenticated) {
      await client.send("Runtime.evaluate", {
        expression: `localStorage.setItem('dids_auth_token', ${JSON.stringify(token)}); localStorage.setItem('dids_auth_user', ${JSON.stringify(JSON.stringify(user))});`,
      });
      await client.send("Page.navigate", { url: `http://127.0.0.1:5173${route}` });
      await wait(1800);
    }
  }

  async function screenshot(name) {
    await wait(500);
    const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
    await fs.writeFile(path.join(outDir, `${name}.png`), Buffer.from(shot.data, "base64"));
    console.log(`captured ${name}`);
  }

  await navigate("/login");
  await screenshot("01-login");
  await navigate("/signup");
  await screenshot("02-register");
  await navigate("/", true);
  await screenshot("03-dashboard");
  await client.send("Runtime.evaluate", {
    expression: `Array.from(document.querySelectorAll('*')).find(el => el.textContent?.trim() === 'Live Traffic Scanner')?.closest('[class*="cursor-pointer"]')?.click()`,
  });
  await wait(500);
  await client.send("Runtime.evaluate", {
    expression: `Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('SYN flood'))?.click()`,
  });
  await wait(300);
  await client.send("Runtime.evaluate", {
    expression: `Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Run Scan'))?.click()`,
  });
  await wait(900);
  await screenshot("04-live-scanner-result");
  await navigate("/logs", true);
  await screenshot("05-network-logs");
  await navigate("/alerts", true);
  await screenshot("06-threat-alerts");
  await navigate("/analytics", true);
  await wait(1200);
  await screenshot("07-analytics");
  await navigate("/network-analysis", true);
  await wait(1200);
  await screenshot("08-network-analysis");
  ws.close();
} finally {
  chrome.kill("SIGTERM");
}
