# Reconnaissance Tools for IP, ASN, WHOIS, and Infrastructure Mapping

These tools are commonly used in:

- Reconnaissance (Recon)
- Penetration Testing
- Bug Bounty Hunting
- OSINT (Open Source Intelligence)
- Attack Surface Mapping

They help researchers gather information about:

- Domains
- IP ranges
- Autonomous System Numbers (ASN)
- DNS records
- Ownership data
- Infrastructure relationships

---

# 1. ARIN WHOIS

## Website

```text
whois.arin.net
```

## Purpose

ARIN WHOIS provides information about:

- IP address ownership
- ASN ownership
- Organization details
- Netblocks (IP ranges)

---

# What is ARIN?

ARIN stands for:

```text
American Registry for Internet Numbers
```

It manages IP allocations for:

- United States
- Canada
- Parts of the Caribbean

---

# Why ARIN WHOIS is Important

ARIN WHOIS can reveal:

- Large IP blocks owned by organizations
- ASN numbers
- Network contacts
- Infrastructure ownership

---

# Example Use Case

Searching:

```text
facebook.com
```

may reveal:

```text
157.240.0.0/16
```

This helps identify Meta-owned infrastructure.

---

# Common Recon Usage

- Identify target IP ranges
- Discover netblocks
- Map infrastructure
- Find ASN ownership

---

# Example Command

```bash
whois 157.240.0.0
```

---

# 2. MXToolbox

## Website

```text
mxtoolbox.com
```

---

# Purpose

MXToolbox provides tools for:

- ASN lookup
- DNS analysis
- MX record lookup
- Blacklist checking
- Email infrastructure analysis

---

# ASN Lookup

An ASN (Autonomous System Number) represents:

```text
A collection of IP ranges controlled by one organization.
```

---

# Example

Searching:

```text
AS32934
```

may show:

```text
Meta / Facebook infrastructure
```

---

# Why ASN Lookup Matters

ASN lookup helps identify:

- Organization-owned IP ranges
- Internet routing information
- Network relationships
- Infrastructure scope

---

# Common Recon Usage

- IP range discovery
- ASN correlation
- Infrastructure mapping
- Network ownership analysis

---

# 3. IPAddressGuide

## Website

```text
ipaddressguide.com
```

---

# Purpose

Used for:

- CIDR to IP conversion
- Subnet calculations
- Network range analysis

---

# Example

Input:

```text
192.168.1.0/24
```

Output:

```text
192.168.1.1 → 192.168.1.254
```

---

# Why Important

Helps researchers:

- Understand subnet ranges
- Prepare network scans
- Analyze IP blocks

---

# Common Recon Usage

- CIDR expansion
- IP range calculations
- Subnet analysis

---

# 4. BGP HE

## Website

```text
bgp.he.net
```

---

# Purpose

Provides:

- BGP routing information
- ASN analysis
- Prefix information
- Internet routing relationships

---

# What is BGP?

BGP stands for:

```text
Border Gateway Protocol
```

It is the protocol used to route traffic across the Internet.

---

# Example Usage

Search:

```text
AS13335
```

Result:

```text
Cloudflare network information
```

---

# Information Revealed

- ASN owner
- Advertised IP prefixes
- Peering relationships
- Routing details

---

# Why Important in Recon

BGP analysis helps identify:

- Organization infrastructure
- Routing relationships
- Hidden IP ranges
- Network topology

---

# Common Recon Usage

- ASN intelligence gathering
- IP range discovery
- Infrastructure mapping

---

# 5. ViewDNS

## Website

```text
viewdns.info
```

---

# Purpose

ViewDNS provides multiple OSINT tools for:

- Reverse IP lookup
- Reverse DNS lookup
- WHOIS lookup
- DNS records
- Port scanning

---

# Reverse IP Lookup

Finds domains hosted on the same IP.

---

# Example

Input:

```text
104.16.132.229
```

May reveal:

```text
example1.com
example2.com
example3.com
```

---

# Why Important

Helps identify:

- Shared hosting
- Related domains
- Hidden assets

---

# Common Recon Usage

- Infrastructure correlation
- Shared hosting discovery
- Domain relationship mapping

---

# 6. WHOIS

## Definition

WHOIS is a protocol used to retrieve:

- Domain ownership information
- Registrar data
- Registration dates
- Contact information
- Name servers

---

# Example Command

```bash
whois facebook.com
```

---

# Information Revealed

| Information | Description |
|------|-------------|
| Registrar | Domain provider |
| Creation Date | Registration date |
| Expiration Date | Domain expiry |
| Name Servers | DNS servers |
| Registrant Info | Owner details |

---

# Why Important in Recon

WHOIS helps identify:

- Organization ownership
- Related domains
- Technical contacts
- Infrastructure patterns

---

# Common Recon Usage

- Domain intelligence
- Ownership correlation
- Historical analysis

---

# 7. Reverse WHOIS Lookup by Email

## Definition

Reverse WHOIS searches for domains registered using the same:

- Email address
- Phone number
- Organization name

---

# Example

Search email:

```text
admin@example.com
```

Possible results:

```text
example.com
example.net
example.org
```

---

# Why Important

Helps discover:

- Hidden domains
- Related assets
- Forgotten infrastructure
- Subsidiary websites

---

# Common Recon Usage

- Asset discovery
- Domain correlation
- Organizational mapping

---

# Example Recon Workflow

```text
1. Perform WHOIS lookup
2. Identify ASN numbers
3. Discover IP ranges
4. Analyze BGP routes
5. Enumerate domains
6. Use reverse WHOIS
7. Map infrastructure
```

---

# Tool Comparison Table

| Tool | Main Purpose |
|------|--------------|
| ARIN WHOIS | IP ownership and netblocks |
| MXToolbox | ASN and DNS analysis |
| IPAddressGuide | CIDR and subnet calculations |
| BGP HE | BGP and ASN routing analysis |
| ViewDNS | DNS and reverse lookups |
| WHOIS | Domain ownership information |
| Reverse WHOIS | Related domain discovery |

---

# Recon Strategy Using These Tools

## Horizontal Correlation

Discover related domains:

```text
facebook.com
instagram.com
whatsapp.com
```

---

## Vertical Correlation

Discover subdomains:

```text
api.facebook.com
help.facebook.com
```

---

## Infrastructure Mapping

Discover:

- ASN ranges
- Netblocks
- CIDR ranges
- Routing paths

---

## Asset Discovery

Identify:

- Acquired companies
- Forgotten domains
- Shared infrastructure

---

# Important Security Note

These tools are commonly used in:

- Ethical hacking
- Bug bounty programs
- Penetration testing
- Defensive security analysis

Always ensure:

- Proper authorization
- Legal scope
- Responsible use

---

# Conclusion

Reconnaissance tools such as:

- ARIN WHOIS
- MXToolbox
- BGP HE
- ViewDNS
- Reverse WHOIS

help security researchers map organizational infrastructure and discover related assets.

These tools provide visibility into:

- Domains
- IP ranges
- ASNs
- DNS infrastructure
- Routing relationships
- Ownership patterns

which are critical for effective attack surface analysis and cybersecurity assessments.