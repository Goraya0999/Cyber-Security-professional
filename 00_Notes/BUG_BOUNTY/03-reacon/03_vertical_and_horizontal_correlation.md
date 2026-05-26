# Domain Classification in Reconnaissance

During reconnaissance (Recon), security researchers classify domains and assets into different categories to better understand an organization's attack surface.

Two important classifications are:

1. Vertical Correlation
2. Horizontal Correlation

---

# Target Example

```text
facebook.com
```

---

# 1. Horizontal Correlation

## Definition

Horizontal correlation refers to:

```text
Different domains, brands, companies, or regional domains owned or controlled by the same organization.
```

These domains are usually parallel assets rather than subdomains.

---

# Characteristics

- Different root domains
- Same parent organization
- Same infrastructure or ownership
- Related business ecosystem

---

# Examples

## Target

```text
facebook.com
```

## Horizontally Related Domains

```text
facebook.cn
instagram.com
whatsapp.com
meta.com
```

These are separate domains but related to the same company.

---

# Why Horizontal Correlation Matters

Organizations often own multiple domains.

A vulnerability in one related domain may help attackers:

- Discover shared infrastructure
- Find reused credentials
- Identify common technologies
- Expand the attack surface

---

# Example Scenario

```text
facebook.com
instagram.com
```

Both may:

- Use similar APIs
- Share authentication systems
- Use common cloud infrastructure

---

# Horizontal Correlation Diagram

```text
                Meta
                  │
 ┌────────────────┼────────────────┐
 │                │                │
facebook.com   instagram.com   whatsapp.com
```

---

# 2. Vertical Correlation

## Definition

Vertical correlation refers to:

```text
Subdomains and nested services under the same root domain.
```

These assets belong directly to the target domain hierarchy.

---

# Examples

## Target

```text
facebook.com
```

## Vertically Related Subdomains

```text
blog.facebook.com
help.facebook.com
developers.facebook.com
api.facebook.com
```

These are all subdomains of the main domain.

---

# Why Vertical Correlation Matters

Subdomains often expose:

- APIs
- Admin panels
- Internal systems
- Development environments
- Documentation portals

Each subdomain may have different security configurations.

---

# Vertical Correlation Diagram

```text
facebook.com
│
├── blog.facebook.com
├── help.facebook.com
├── api.facebook.com
└── developers.facebook.com
```

---

# Horizontal vs Vertical Correlation

| Feature | Horizontal Correlation | Vertical Correlation |
|------|-----------------------|---------------------|
| Structure | Different root domains | Same root domain |
| Example | instagram.com | help.facebook.com |
| Ownership | Same organization | Same organization |
| Relation | Parallel assets | Child assets |
| Purpose | Expand ecosystem mapping | Expand subdomain mapping |

---

# Reconnaissance Strategy

A proper reconnaissance strategy usually includes:

1. Horizontal Enumeration
2. Vertical Enumeration
3. IP Block Analysis
4. Acquisition Discovery

---

# 1. Horizontal Subdomain / Domain Enumeration

## Goal

Identify:

- Related companies
- Sister domains
- Regional domains
- Acquired platforms

---

## Examples

```text
facebook.com
instagram.com
whatsapp.com
meta.com
```

---

## Methods

- WHOIS analysis
- ASN correlation
- Certificate Transparency Logs
- Reverse WHOIS
- Google Dorking

---

## Why Important

Sometimes smaller acquired domains have weaker security than the main company infrastructure.

---

# 2. Vertical Subdomain Enumeration

## Goal

Discover subdomains under the main target.

---

## Examples

```text
api.facebook.com
m.facebook.com
developers.facebook.com
business.facebook.com
```

---

## Common Tools

| Tool | Purpose |
|------|----------|
| `Subfinder` | Passive enumeration |
| `Amass` | Advanced discovery |
| `Assetfinder` | Related assets |
| `crt.sh` | SSL certificate logs |

---

## Importance

Subdomains may expose:

- APIs
- Admin panels
- Debug systems
- Staging environments

---

# 3. IP Block Analysis

## Definition

Organizations often own large IP ranges.

Recon analysts identify these IP blocks to map infrastructure.

---

# Example

```text
157.240.0.0/16
```

This may belong to Meta infrastructure.

---

# Why Important

IP block analysis helps discover:

- Hidden hosts
- Shared infrastructure
- Internal services
- Cloud deployments

---

# Common Techniques

- ASN lookup
- CIDR scanning
- Reverse IP lookup
- BGP analysis

---

# Common Tools

| Tool | Purpose |
|------|----------|
| `whois` | ASN and ownership lookup |
| `Amass` | Infrastructure mapping |
| `Shodan` | Internet-wide scanning |
| `Nmap` | Host discovery |

---

# 4. Acquisition Discovery

## Definition

Large companies often acquire smaller companies.

These acquired assets may still use old infrastructure.

---

# Example

```text
Meta acquired Instagram and WhatsApp
```

Domains:

```text
instagram.com
whatsapp.com
```

---

# Why Important

Acquired systems may contain:

- Legacy applications
- Old servers
- Weak security policies
- Forgotten assets

---

# Recon Workflow Example

```text
1. Start with target domain
2. Discover horizontal assets
3. Enumerate vertical subdomains
4. Identify ASN and IP ranges
5. Scan infrastructure
6. Analyze acquisitions
7. Search for vulnerabilities
```

---

# Complete Recon Mapping Example

```text
Meta
│
├── facebook.com
│   ├── api.facebook.com
│   ├── help.facebook.com
│   └── developers.facebook.com
│
├── instagram.com
│
├── whatsapp.com
│
└── meta.com
```

---

# Key Takeaways

| Concept | Meaning |
|------|----------|
| Horizontal Correlation | Related root domains owned by same organization |
| Vertical Correlation | Subdomains under same root domain |
| IP Block Analysis | Mapping organization-owned IP ranges |
| Acquisition Discovery | Identifying acquired company assets |

---

# Conclusion

Understanding horizontal and vertical correlation is essential in reconnaissance because it helps security researchers:

- Expand attack surface visibility
- Discover hidden assets
- Identify related infrastructure
- Analyze organizational ecosystems
- Perform effective penetration testing

A strong recon strategy combines:

- Horizontal enumeration
- Vertical subdomain discovery
- IP range analysis
- Acquisition tracking

to create a complete attack surface map.