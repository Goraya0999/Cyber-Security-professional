import { z } from "zod";
import type { TrafficInput } from "./mlDetectionClient";

const PacketMetadata = z.object({
  sourceIp: z.string().min(1),
  destinationIp: z.string().min(1),
  protocol: z.string().min(1),
  nodeId: z.string().min(1),
  payload: z.string().optional(),
  bytesSent: z.number().int().nonnegative().optional(),
  sourcePort: z.number().int().min(0).max(65535).optional(),
  destinationPort: z.number().int().min(0).max(65535).optional(),
  flags: z.array(z.string()).optional(),
});

export const PacketScanBody = z.object({
  nodeId: z.string().min(1).optional(),
  packet: PacketMetadata.optional(),
  rawPacket: z.string().min(1).optional(),
}).refine((body) => body.packet || body.rawPacket, {
  message: "Either packet metadata or rawPacket must be provided",
});

type PacketScanBody = z.infer<typeof PacketScanBody>;

const TCPDUMP_PATTERN =
  /IP\s+(?<src>\d{1,3}(?:\.\d{1,3}){3})(?:\.(?<srcPort>\d+))?\s*>\s*(?<dst>\d{1,3}(?:\.\d{1,3}){3})(?:\.(?<dstPort>\d+))?:\s*(?<rest>.*)/i;

function protocolFromPacket(rest: string, srcPort?: number, dstPort?: number): string {
  const upper = rest.toUpperCase();
  if (upper.includes("ICMP")) return "ICMP";
  if (upper.includes("UDP")) return "UDP";
  if (srcPort === 53 || dstPort === 53) return "DNS";
  if (srcPort === 80 || dstPort === 80) return "HTTP";
  if (srcPort === 443 || dstPort === 443) return "HTTPS";
  if (srcPort === 22 || dstPort === 22) return "SSH";
  if (srcPort === 21 || dstPort === 21) return "FTP";
  return "TCP";
}

function bytesFromRaw(rawPacket: string): number {
  const lengthMatch = rawPacket.match(/\blength\s+(?<length>\d+)/i);
  if (lengthMatch?.groups?.["length"]) return Number(lengthMatch.groups["length"]);
  return Buffer.byteLength(rawPacket, "utf8");
}

function normalizeFlags(flags?: string[]): string {
  if (!flags?.length) return "";
  return ` flags=${flags.map((flag) => flag.toUpperCase()).join(",")}`;
}

export function packetToTrafficInput(body: PacketScanBody): TrafficInput {
  if (body.packet) {
    const packet = body.packet;
    const portInfo = [
      packet.sourcePort !== undefined ? `srcPort=${packet.sourcePort}` : null,
      packet.destinationPort !== undefined ? `dstPort=${packet.destinationPort}` : null,
    ].filter(Boolean).join(" ");

    return {
      sourceIp: packet.sourceIp,
      destinationIp: packet.destinationIp,
      protocol: packet.protocol.toUpperCase(),
      nodeId: body.nodeId ?? packet.nodeId,
      bytesSent: packet.bytesSent ?? Buffer.byteLength(packet.payload ?? "", "utf8"),
      data: [packet.payload ?? "Captured packet metadata", portInfo, normalizeFlags(packet.flags)]
        .filter(Boolean)
        .join(" ")
        .trim(),
    };
  }

  const rawPacket = body.rawPacket ?? "";
  const match = rawPacket.match(TCPDUMP_PATTERN);
  if (!match?.groups) {
    throw new Error("rawPacket must look like tcpdump output: IP <source> > <destination>: <details>");
  }

  const srcPort = match.groups["srcPort"] ? Number(match.groups["srcPort"]) : undefined;
  const dstPort = match.groups["dstPort"] ? Number(match.groups["dstPort"]) : undefined;
  const rest = match.groups["rest"] ?? "";

  return {
    sourceIp: match.groups["src"],
    destinationIp: match.groups["dst"],
    protocol: protocolFromPacket(rest, srcPort, dstPort),
    nodeId: body.nodeId ?? "packet-node-01",
    bytesSent: bytesFromRaw(rawPacket),
    data: rawPacket,
  };
}
