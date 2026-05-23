# CIDR (Classless Inter-Domain Routing)

## Definition

CIDR stands for:

```text
Classless Inter-Domain Routing
```

CIDR is a method used for:

- IP address allocation
- Network routing
- Improving Internet address efficiency

It was introduced to replace the older class-based IP addressing system.

---

# Why CIDR Was Introduced

Before CIDR, IP addresses were divided into fixed classes:

| Class | Default Subnet Mask | Number of Hosts |
|------|---------------------|----------------|
| Class A | 255.0.0.0 | Very Large |
| Class B | 255.255.0.0 | Medium |
| Class C | 255.255.255.0 | Small |

This caused major problems:

- Wastage of IP addresses
- Inefficient routing
- Rapid exhaustion of IPv4 addresses

CIDR solved these issues by allowing flexible subnet allocation.

---

# CIDR Notation

CIDR uses a slash (`/`) followed by a number.

## Example

```text
192.168.1.0/24
```

### Explanation

| Part | Meaning |
|------|----------|
| `192.168.1.0` | Network Address |
| `/24` | Number of network bits |

---

# CIDR Prefix Meaning

| CIDR | Subnet Mask | Number of Hosts |
|------|-------------|----------------|
| `/8` | 255.0.0.0 | Large Network |
| `/16` | 255.255.0.0 | Medium Network |
| `/24` | 255.255.255.0 | Small Network |
| `/32` | 255.255.255.255 | Single Host |

---

# Benefits of CIDR

## 1. Efficient IP Allocation

CIDR allows organizations to receive only the number of IPs they need.

Example:

Instead of giving:

```text
65,536 IPs
```

An organization may receive:

```text
4,096 IPs
```

This reduces IP wastage.

---

## 2. Better Routing Efficiency

CIDR supports:

- Route aggregation
- Supernetting

This reduces the size of Internet routing tables.

---

## 3. Conserves IPv4 Addresses

CIDR slows down IPv4 exhaustion by allocating addresses more efficiently.

---

# IP Address Pool

An IP pool is a collection of IP addresses assigned to organizations, ISPs, or networks.

Example:

```text
203.0.113.0/24
```

This represents a block of IP addresses.

Organizations use IP pools for:

- Servers
- Customers
- Internal infrastructure
- Cloud services

---

# Autonomous System Number (ASN)

## Definition

An Autonomous System Number (ASN) represents:

```text
A collection of IP addresses and routing policies controlled by one organization.
```

Examples of organizations using ASNs:

- Internet Service Providers (ISPs)
- Cloud Providers
- Large Enterprises
- Universities

---

# Purpose of ASN

ASNs help routers identify:

- Who owns the IP ranges
- Which network controls them
- How traffic should be routed

---

# Example

```text
AS15169 → Google
AS13335 → Cloudflare
AS16509 → Amazon AWS
```

Each ASN controls multiple IP address ranges.

---

# Relationship Between ASN and IP Pools

```text
ASN
 └── Owns IP Address Pools
      └── Advertises Routes on the Internet
```

Example:

```text
AS13335
 └── Controls Cloudflare IP ranges
```

---

# Regional Internet Registries (RIRs)

IP address pools are distributed globally through Regional Internet Registries (RIRs).

These organizations manage and allocate IP addresses in different regions of the world.

---

# The Five Regional Internet Registries

| Registry | Region |
|------|---------|
| AFRINIC | Africa |
| APNIC | Asia-Pacific |
| ARIN | North America |
| LACNIC | Latin America & Caribbean |
| RIPE NCC | Europe, Middle East, Central Asia |

---

# AFRINIC

## Full Form

```text
African Network Information Centre
```

### Region Covered

- Africa

---

# APNIC

## Full Form

```text
Asia-Pacific Network Information Centre
```

### Region Covered

- Asia
- Australia
- Pacific regions

---

# ARIN

## Full Form

```text
American Registry for Internet Numbers
```

### Region Covered

- United States
- Canada
- Parts of the Caribbean

---

# LACNIC

## Full Form

```text
Latin America and Caribbean Network Information Centre
```

### Region Covered

- Latin America
- Caribbean countries

---

# RIPE NCC

## Full Form

```text
Réseaux IP Européens Network Coordination Centre
```

### Region Covered

- Europe
- Middle East
- Central Asia

---

# How IP Allocation Works

```text
IANA
 └── Regional Internet Registries (RIRs)
      └── ISPs / Organizations
           └── Customers / Networks
```

---

# Example Flow

```text
IANA
 └── APNIC
      └── ISP
           └── Customer IP Allocation
```

---

# CIDR in Cybersecurity and Reconnaissance

CIDR is extremely important in:

- Network Scanning
- Reconnaissance
- Penetration Testing
- Vulnerability Assessment

---

# Example Usage in Recon

Security researchers often scan CIDR ranges.

Example:

```text
203.0.113.0/24
```

This means scanning all IPs from:

```text
203.0.113.1 → 203.0.113.254
```

---

# Common Tools Using CIDR

| Tool | Purpose |
|------|----------|
| `Nmap` | Network scanning |
| `Masscan` | High-speed scanning |
| `Shodan` | Internet-wide device search |
| `Amass` | Attack surface mapping |

---

# Example Nmap Scan

```bash
nmap 192.168.1.0/24
```

This scans the entire subnet.

---

# Important Concepts

| Concept | Description |
|------|-------------|
| CIDR | Flexible IP allocation system |
| ASN | Represents a network owner |
| IP Pool | Collection of IP addresses |
| RIR | Regional IP allocation authority |

---

# Conclusion

CIDR revolutionized Internet routing and IP allocation by replacing inefficient class-based addressing.

It provides:

- Efficient IP utilization
- Better routing scalability
- Flexible subnetting
- Reduced routing table sizes

Autonomous System Numbers (ASNs) help identify organizations controlling IP ranges, while Regional Internet Registries distribute global IP address pools across different geographical regions.