# Network Traffic & Threat Analysis Module

## Overview

The project now includes a protected Network Traffic Analysis module for uploading packet captures and network-related logs.

Supported inputs:

- `.pcap`
- `.pcapng`
- `.cap`
- Wireshark capture files
- Network log files
- IDS/IPS logs
- Firewall logs

The frontend route is:

```text
/network-analysis
```

The backend upload endpoint is:

```http
POST /api/network-analysis/upload
```

The upload uses a raw binary request body with the original filename in the `X-File-Name` header. This avoids base64 overhead and supports larger files than JSON payloads.

## Features

### File Upload

- Drag-and-drop upload interface.
- Manual file picker.
- Upload progress via `XMLHttpRequest.upload.onprogress`.
- Large upload limit controlled by `DIDS_ANALYSIS_MAX_UPLOAD_BYTES`.
- Default backend limit: 250 MB.

### Traffic Parsing

The backend analysis engine extracts:

- Source IP addresses
- Destination IP addresses
- Protocol distribution
- Source/destination ports
- Packet counts
- DNS requests
- HTTP/HTTPS activity
- Timeline buckets for traffic spikes

Binary capture support includes lightweight parsing for classic PCAP and PCAPNG enhanced packet blocks. Text log parsing supports common IP, port, and protocol patterns from firewall and IDS/IPS logs.

### Threat Detection

The engine detects suspicious patterns including:

- Port scanning
- Brute-force attempts
- DDoS indicators
- Malware/C2 communication keywords
- Suspicious DNS requests
- Unusual outbound connections
- High-frequency traffic spikes

### Risk Assessment

Each report receives:

- `Safe`
- `Low Risk`
- `Medium Risk`
- `High Risk`
- `Critical`

Risk is calculated from threat severity and confidence.

### AI-Powered Security Report

The module generates an explainable security report with:

- Why the traffic is suspicious
- Attack indicators found
- Possible threats
- Recommended mitigations
- Confidence score

This is a deterministic local report generator. It does not send uploaded files to an external AI service.

### Dashboard

The frontend displays:

- Network statistics cards
- Risk score visualization
- Top source IPs
- Top destination ports
- Top protocols
- Traffic timeline chart
- DNS request summary
- Threat summary
- Firewall, IDS/IPS, and hardening recommendations

### Export

Reports can be exported as:

- JSON
- PDF
- DOCX

Export endpoints:

```http
GET /api/network-analysis/{id}/export/json
GET /api/network-analysis/{id}/export/pdf
GET /api/network-analysis/{id}/export/docx
```

## Important Notes

- Reports are currently stored in memory and capped to the latest 50 reports.
- For production persistence, store reports and uploaded file metadata in PostgreSQL or object storage.
- PCAP parsing intentionally focuses on IPv4 Ethernet captures and common TCP/UDP/ICMP traffic.
- Deep packet inspection should be extended with tools such as Zeek, Suricata, or tshark for production-grade forensics.

## Environment Variable

```env
DIDS_ANALYSIS_MAX_UPLOAD_BYTES=262144000
```
