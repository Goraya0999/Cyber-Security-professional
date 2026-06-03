import type { NetworkAnalysisReport } from "./networkAnalysisEngine";

export type ExportFormat = "json" | "pdf" | "docx";

function reportLines(report: NetworkAnalysisReport): string[] {
  return [
    "DIDS Network Traffic & Threat Analysis Report",
    `File: ${report.fileName}`,
    `Generated: ${new Date(report.createdAt).toLocaleString("en-US")}`,
    `Risk: ${report.riskLevel} (${report.riskScore}/100)`,
    `Packets: ${report.packetCount.toLocaleString()} | Bytes: ${report.totalBytes.toLocaleString()}`,
    `Unique Sources: ${report.uniqueSourceIps} | Unique Destinations: ${report.uniqueDestinationIps}`,
    "",
    "AI Security Summary",
    report.aiReport.summary,
    `Confidence: ${Math.round(report.aiReport.confidenceScore * 100)}%`,
    "",
    "Threat Findings",
    ...(report.threats.length
      ? report.threats.flatMap((finding, index) => [
          `${index + 1}. ${finding.type} - ${finding.severity} (${Math.round(finding.confidence * 100)}%)`,
          `   ${finding.description}`,
          `   Indicators: ${finding.indicators.join("; ")}`,
          `   Mitigation: ${finding.mitigation}`,
        ])
      : ["No strong threat pattern detected."]),
    "",
    "Top Source IPs",
    ...report.topSourceIps.slice(0, 8).map((ip) => `${ip.ip}: ${ip.count} packets, ${ip.bytes} bytes`),
    "",
    "Top Protocols",
    ...report.protocols.slice(0, 8).map((protocol) => `${protocol.protocol}: ${protocol.packets} packets`),
    "",
    "Firewall Recommendations",
    ...report.securityRecommendations.firewall.map((item) => `- ${item}`),
    "",
    "IDS/IPS Recommendations",
    ...report.securityRecommendations.idsIps.map((item) => `- ${item}`),
    "",
    "Network Hardening",
    ...report.securityRecommendations.hardening.map((item) => `- ${item}`),
  ];
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdf(report: NetworkAnalysisReport): Buffer {
  const lines = reportLines(report);
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += 34) {
    const chunk = lines.slice(i, i + 34);
    const text = ["BT", "/F1 10 Tf", "46 780 Td", "14 TL", ...chunk.map((line, index) => `${index === 0 ? "" : "T*"} (${escapePdfText(line.slice(0, 100))}) Tj`), "ET"].join("\n");
    pages.push(text);
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((content, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function writeUInt16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function makeZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const checksum = crc32(file.data);
    const local = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(checksum),
      writeUInt32(file.data.length),
      writeUInt32(file.data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
      file.data,
    ]);
    localParts.push(local);

    centralParts.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(checksum),
      writeUInt32(file.data.length),
      writeUInt32(file.data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name,
    ]));
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(central.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);
  return Buffer.concat([...localParts, central, end]);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function makeDocx(report: NetworkAnalysisReport): Buffer {
  const paragraphs = reportLines(report).map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;

  return makeZip([
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    },
    {
      name: "word/document.xml",
      data: Buffer.from(documentXml),
    },
  ]);
}

export function exportNetworkReport(report: NetworkAnalysisReport, format: ExportFormat): { contentType: string; fileName: string; body: Buffer } {
  const baseName = report.fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "network-analysis";
  if (format === "json") {
    return {
      contentType: "application/json",
      fileName: `${baseName}-analysis.json`,
      body: Buffer.from(JSON.stringify(report, null, 2)),
    };
  }
  if (format === "pdf") {
    return {
      contentType: "application/pdf",
      fileName: `${baseName}-analysis.pdf`,
      body: makePdf(report),
    };
  }
  return {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileName: `${baseName}-analysis.docx`,
    body: makeDocx(report),
  };
}
