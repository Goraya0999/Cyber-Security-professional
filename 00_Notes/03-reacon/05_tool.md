# Reconnaissance & Target Enumeration Cheat Sheet

A professional cheat sheet for beginner-to-intermediate reconnaissance workflows used in bug bounty, OSINT, and ethical hacking.

> Educational and authorized security testing only.

---

# 1. Basic Connectivity Check

## Ping a Target

### Command
```bash
ping facebook.com
```

## Purpose
Checks whether a target host is reachable over the network.

## Best Use Cases
- Verify internet connectivity
- Confirm target availability
- Measure latency (response time)
- Basic reconnaissance before scanning

## Notes
- Some companies block ICMP requests
- A blocked ping does NOT mean the website is offline

---

# 2. Important Recon Platforms

---

## ViewDNS

### Website
https://viewdns.info

## Purpose
Provides multiple OSINT and DNS investigation tools.

## Best Use Cases
- Reverse IP lookup
- Reverse Whois lookup
- DNS records investigation
- Subdomain discovery
- IP history analysis

## Useful Features
- Reverse IP
- Reverse DNS
- Whois lookup
- ASN lookup
- Geo IP lookup

## Recommended During
- Early recon phase
- Asset discovery
- Infrastructure mapping

---

## Loops (Brazilian Recon Platform)

### Website
https://lopseg.com.br

## Purpose
Advanced reconnaissance and attack surface intelligence platform.

## Why It Is Interesting
- Large recon dataset
- Asset intelligence
- Infrastructure correlation
- Useful for bug bounty research

## Best Use Cases
- Deep target enumeration
- Discovering hidden assets
- Investigating infrastructure relationships

## Notes
- Particularly useful during large-scale recon

---

## Whoxy

### Website
https://www.whoxy.com

## Purpose
Whois intelligence and domain relationship analysis platform.

## Best Use Cases
- Reverse Whois searches
- Finding domains owned by same organization
- Historical ownership analysis
- Domain correlation

## Free Features
- Limited Whois lookup
- Reverse Whois samples
- DNS information

## Useful For
- Discovering hidden domains
- Organization mapping
- Expanding attack surface

---

## BGP HE (Hurricane Electric)

### Website
https://bgp.he.net

## Purpose
Provides BGP, ASN, and IP block intelligence.

## Best Use Cases
- ASN investigation
- IP range discovery
- Network infrastructure mapping
- Identifying owned IP blocks

## Important Terms

### ASN (Autonomous System Number)
A unique identifier assigned to large networks on the internet.

### IP Blocks
Ranges of IP addresses owned by a company or ISP.

## Example Workflow
1. Search company name
2. Find ASN
3. Enumerate IP ranges
4. Investigate hosted assets

## Useful During
- Advanced recon
- Infrastructure enumeration
- Cloud asset identification

---

## DomainLooks Whois

### Website
https://whois.domainlooks.com

## Purpose
Whois and domain intelligence lookup tool.

## Best Use Cases
- Domain ownership analysis
- DNS investigation
- Registration information gathering
- Expiration tracking

---

# 3. Recon Workflow (Beginner Bug Bounty Methodology)

---

# Task 1 — TryHackMe Pre-Security Roadmap

## Recommended Path

### Phase 1 — Networking Basics
Learn:
- IP addresses
- DNS
- HTTP/HTTPS
- TCP/UDP
- Ports
- Routing

## Recommended Rooms
- What is Networking?
- Intro to LAN
- OSI Model
- Packets & Frames

---

### Phase 2 — Linux Fundamentals

## Learn
- File system
- Permissions
- Bash commands
- Processes
- Networking commands

## Important Commands
```bash
ls
cd
pwd
grep
find
chmod
curl
wget
```

---

### Phase 3 — Web Fundamentals

## Learn
- HTTP requests
- Cookies
- Sessions
- Authentication
- APIs
- Status codes

## Important Concepts
- GET vs POST
- Headers
- JWT
- REST APIs

---

### Phase 4 — Security Fundamentals

## Learn
- CIA Triad
- Vulnerabilities
- OWASP Top 10
- Authentication flaws
- Misconfigurations

---

### Phase 5 — Intro Recon Skills

## Learn
- Whois
- DNS
- Subdomain enumeration
- ASN
- IP ranges

## Beginner Tools
```bash
whois
nslookup
dig
subfinder
amass
assetfinder
```

---

# Task 2 — Target Selection & Asset Enumeration

## Choose a Large Target

### Examples
- Facebook
- Google
- Tesla
- Amazon

---

# Recon Goal

Gather:

- Main domains
- Acquisitions
- Horizontal domains
- Vertical subdomains
- ASN numbers
- IP blocks
- Infrastructure data

---

# Step-by-Step Workflow

---

## Step 1 — Identify Main Domain

### Example
```text
facebook.com
```

---

## Step 2 — Find Acquisitions

## Purpose
Large companies acquire other companies that may introduce security weaknesses.

## Examples
Facebook acquired:
- Instagram
- WhatsApp
- Oculus

## Best Use Cases
- Expanding attack surface
- Discovering less-secured assets

---

## Step 3 — Horizontal Domain Enumeration

## Definition
Different domains owned by same organization.

## Example
```text
facebook.com
instagram.com
whatsapp.com
meta.com
```

## Purpose
Find additional assets outside main domain.

---

## Step 4 — Vertical Subdomain Enumeration

## Definition
Subdomains under a main domain.

## Example
```text
developers.facebook.com
m.facebook.com
business.facebook.com
graph.facebook.com
```

## Enumeration Tools
```bash
subfinder -d facebook.com
assetfinder facebook.com
amass enum -d facebook.com
```

---

## Step 5 — ASN Enumeration

## Goal
Identify company-owned networks.

## Tools
- bgp.he.net
- ViewDNS
- Whois lookup

## Data to Collect
- ASN number
- IP ranges
- Organization name

---

## Step 6 — IP Block Enumeration

## Goal
Find all IP ranges owned by target.

## Why Important
Sometimes forgotten servers exist within owned ranges.

## Best Use Cases
- Asset discovery
- Hidden infrastructure detection
- Cloud exposure analysis

---

# Recommended Beginner Recon Stack

| Purpose | Tool |
|---|---|
| Whois Lookup | Whoxy |
| DNS Investigation | ViewDNS |
| ASN Lookup | bgp.he.net |
| Subdomain Enumeration | Subfinder |
| Passive Recon | Amass |
| IP Investigation | Whois DomainLooks |

---

# Professional Recon Tips

## 1. Start Passive First
Avoid aggressive scanning initially.

---

## 2. Build Asset Lists
Always organize:
- Domains
- Subdomains
- IPs
- ASN data

---

## 3. Focus on Acquisitions
Acquired companies often contain weaker security.

---

## 4. Correlate Infrastructure
Connect:
- Whois data
- ASN
- DNS
- SSL certificates

---

## 5. Document Everything
Professional recon requires:
- Notes
- Screenshots
- Asset mapping
- Scope verification

---

# Recommended Learning Progression

```text
Networking
    ↓
Linux
    ↓
Web Fundamentals
    ↓
Security Basics
    ↓
Recon Skills
    ↓
Bug Bounty Hunting
```

---

# Ethical Reminder

Perform reconnaissance ONLY on:
- Authorized systems
- Bug bounty programs
- Lab environments
- Educational platforms

Unauthorized scanning or testing may violate laws and platform policies.