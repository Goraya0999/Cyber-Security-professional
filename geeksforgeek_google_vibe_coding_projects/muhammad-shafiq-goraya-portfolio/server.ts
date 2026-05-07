import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/contact", (req, res) => {
    const { name, email, message } = req.body;
    console.log("Contact Form Submission:", { name, email, message });
    res.json({ success: true, message: "COMMUNICATION_ESTABLISHED: Muhammad will respond via secure channel shortly." });
  });

  app.get("/api/projects", (req, res) => {
    res.json([
      {
        id: 1,
        title: "AI-Base-Malware-Detection",
        description: "A sophisticated machine learning system designed to classify and detect malware patterns through behavioral analysis.",
        tech: ["Python", "FastAPI", "Machine Learning", "Scikit-Learn"],
        github: "https://github.com/Goraya0999/Cyber-sec-and-Ai-Api-Dev-journey/tree/main/Ai-Base-Malware-Detection-System",
        category: "AI_SECURITY"
      },
      {
        id: 2,
        title: "Fast-Banner-Scanner",
        description: "High-performance reconnaissance tool for network service identification and banner grabbing.",
        tech: ["Python", "Nmap", "Networking"],
        github: "https://github.com/Goraya0999/Cyber-sec-and-Ai-Api-Dev-journey/tree/main/Cyber-Security/mini-tools/01-fast-banner-scanner",
        category: "NET_SEC"
      },
      {
        id: 3,
        title: "vsFTPd 2.3.4 Backdoor Writeup",
        description: "Comprehensive security research and exploitation walkthrough of the vsFTPd backdoor vulnerability.",
        tech: ["Metasploit", "Kali Linux", "Netcat"],
        github: "https://github.com/Goraya0999/Cyber-sec-and-Ai-Api-Dev-journey/tree/main/Cyber-Security/CTF-writeups/From-Netcat-to-Metasploit-vsFTPd-2.3.4-Backdoor-Exploitation",
        category: "CTF_RESEARCH"
      },
      {
        id: 4,
        title: "CRUD Auth Prototype",
        description: "A foundational implementation of secure API authentication and database management.",
        tech: ["Python", "SQLite", "FastAPI"],
        github: "https://github.com/Goraya0999/Cyber-sec-and-Ai-Api-Dev-journey/blob/main/Ai-Api-dev/Projects/api-basic.py",
        category: "API_DEV"
      }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
