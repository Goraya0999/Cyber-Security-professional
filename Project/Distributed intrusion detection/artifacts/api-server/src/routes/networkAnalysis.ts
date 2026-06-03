import express, { Router, type IRouter } from "express";
import { analyzeNetworkFile, type NetworkAnalysisReport } from "../lib/networkAnalysisEngine";
import { exportNetworkReport, type ExportFormat } from "../lib/networkReportExport";

const router: IRouter = Router();
const MAX_UPLOAD_BYTES = Number(process.env["DIDS_ANALYSIS_MAX_UPLOAD_BYTES"] ?? 250 * 1024 * 1024);
const rawUpload = express.raw({
  type: ["application/octet-stream", "application/vnd.tcpdump.pcap", "application/x-pcapng", "text/plain", "application/json", "*/*"],
  limit: MAX_UPLOAD_BYTES,
});

const reports = new Map<string, NetworkAnalysisReport>();
const acceptedExtensions = new Set([".pcap", ".pcapng", ".cap", ".log", ".txt", ".json", ".csv", ".evtx"]);

function extensionOf(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function rememberReport(report: NetworkAnalysisReport): void {
  reports.set(report.id, report);
  if (reports.size > 50) {
    const oldest = [...reports.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (oldest) reports.delete(oldest.id);
  }
}

router.get("/network-analysis", (_req, res) => {
  res.json(
    [...reports.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((report) => ({
        id: report.id,
        fileName: report.fileName,
        fileSize: report.fileSize,
        createdAt: report.createdAt,
        packetCount: report.packetCount,
        riskLevel: report.riskLevel,
        riskScore: report.riskScore,
        threatCount: report.threats.length,
      })),
  );
});

router.post("/network-analysis/upload", rawUpload, (req, res): void => {
  const rawFileName = String(req.headers["x-file-name"] ?? "uploaded-network-file.log");
  const fileName = decodeURIComponent(rawFileName);
  const fileType = String(req.headers["content-type"] ?? "application/octet-stream");
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);

  if (body.length === 0) {
    res.status(400).json({ error: "Uploaded file is empty" });
    return;
  }

  if (body.length > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: `File exceeds maximum upload size of ${MAX_UPLOAD_BYTES} bytes` });
    return;
  }

  const extension = extensionOf(fileName);
  if (extension && !acceptedExtensions.has(extension)) {
    res.status(400).json({
      error: "Unsupported file type",
      supported: [...acceptedExtensions].sort(),
    });
    return;
  }

  const report = analyzeNetworkFile(fileName, fileType, body);
  rememberReport(report);
  res.status(201).json(report);
});

router.get("/network-analysis/:id", (req, res): void => {
  const report = reports.get(req.params.id);
  if (!report) {
    res.status(404).json({ error: "Analysis report not found" });
    return;
  }
  res.json(report);
});

router.get("/network-analysis/:id/export/:format", (req, res): void => {
  const report = reports.get(req.params.id);
  const format = req.params.format as ExportFormat;

  if (!report) {
    res.status(404).json({ error: "Analysis report not found" });
    return;
  }

  if (!["json", "pdf", "docx"].includes(format)) {
    res.status(400).json({ error: "Unsupported export format. Use json, pdf, or docx." });
    return;
  }

  const exported = exportNetworkReport(report, format);
  res.setHeader("Content-Type", exported.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${exported.fileName}"`);
  res.send(exported.body);
});

export default router;
