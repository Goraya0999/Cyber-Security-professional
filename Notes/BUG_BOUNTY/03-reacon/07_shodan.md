# WWW vs Internet

Many people use **WWW (World Wide Web)** and **Internet** as if they are the same thing, but they are different.

## Internet
The **Internet** is the global network of connected computers, servers, routers, and devices.

It provides services such as:

- Websites (WWW)
- Email
- File transfer (FTP)
- Online gaming
- Cloud services
- Video calls

Think of the Internet as the **entire road network**.

## WWW (World Wide Web)

The **World Wide Web (WWW)** is a service that runs on top of the Internet.

It consists of:

- Websites
- Web pages
- Hyperlinks
- Browsers

Examples:

- Google
- YouTube
- Facebook
- Wikipedia

Think of the WWW as the **cars traveling on the roads (Internet)**.

### Simple Formula

Internet ≠ WWW

WWW ⊂ Internet

The WWW is only one part of the Internet.

---

# Google

**Google** is a search engine.

Its job is to:

1. Crawl websites
2. Index information
3. Allow users to search for content

Example:

When you search "Python tutorial", Google searches its index and shows relevant websites.

---

# What is Shodan?

**Shodan** is often called the search engine for Internet-connected devices.

Unlike Google, which indexes websites, Shodan indexes:

- Servers
- Routers
- CCTV cameras
- IoT devices
- Industrial control systems
- Databases
- Firewalls

Shodan collects information by scanning publicly accessible devices and recording their banners and service information.

Because of this, Shodan is widely used by:

- Ethical hackers
- Security researchers
- Network administrators
- Penetration testers

---

# Shodan Use Cases

## 1. Asset Discovery

Find exposed devices belonging to an organization.

Example:

```text
org:"Google"
```

## 2. Vulnerability Assessment

Identify systems running outdated software.

Example:

```text
apache
nginx
openssh
```

## 3. Exposure Monitoring

Detect accidentally exposed services:

- Databases
- Admin panels
- Remote desktop services

## 4. Threat Intelligence

Monitor exposed infrastructure used by attackers.

## 5. Security Auditing

Check whether company assets are publicly visible on the Internet.

---

# Common Shodan Filters

## Country Filter

Find devices in a specific country.

Example:

```text
country:"US" webcam
```

Meaning:

- Search webcams
- Located in the United States

---

## Port Filter

Find devices exposing a specific port.

Example:

```text
port:21
```

Meaning:

- Devices with FTP service exposed

---

## ASN Filter

ASN = Autonomous System Number

Used to search devices belonging to a specific ISP or organization.

Example:

```text
asn:AS3239
```

---

## HTTP Title Filter

Search based on webpage title.

Example:

```text
http.title:"5xx Server Error"
```

Meaning:

- Find systems showing server error pages

---

## Combining Filters

Example:

```text
asn:AS3239 http.title:"5xx Server Error"
```

Meaning:

- Devices in ASN AS3239
- Showing a 5xx server error page

---

## Excluding Results

Example:

```text
asn:AS3239 -http.title:"5xx Server Error"
```

Meaning:

- Devices in ASN AS3239
- Exclude pages containing "5xx Server Error"

---

## SSL Filter

Search SSL certificate information.

Example:

```text
ssl:"Meta Platforms, Inc"
```

Meaning:

- Find systems using SSL certificates containing "Meta Platforms, Inc"

---

## SSL Certificate Subject

Search certificate subject fields.

Example:

```text
ssl.cert.subject.cn:"example.com"
```

Meaning:

- Search certificates where Common Name (CN) matches the target

---

# Directory Brute Force

Directory brute forcing is the process of discovering hidden files and directories on a web server by testing many possible paths from a wordlist.

Example targets:

```text
/admin
/login
/backup
/uploads
```

Common tools:

- FFUF
- DIRB
- Gobuster
- Feroxbuster

---

# FFUF

FFUF (Fast Web Fuzzer) is a fast tool used to discover:

- Directories
- Files
- Parameters
- Virtual hosts

Basic example:

```bash
ffuf -u http://target/FUZZ -w wordlist.txt
```

`FUZZ` is replaced with each word from the wordlist.

---

# DIRB

DIRB is a classic web content scanner.

Basic example:

```bash
dirb http://target
```

DIRB uses a wordlist to discover:

- Hidden directories
- Hidden files
- Backup files

Example findings:

```text
/admin
/config.php
/backup.zip
```

---

# Quick Comparison

| Tool | Purpose | Speed |
|--------|---------|--------|
| Google | Search websites | Fast |
| Shodan | Search Internet-connected devices | Fast |
| FFUF | Directory/File fuzzing | Very Fast |
| DIRB | Directory discovery | Medium |

---

# Key Point

- **Internet** = Entire network of connected devices.
- **WWW** = Websites running on the Internet.
- **Google** = Search engine for websites.
- **Shodan** = Search engine for Internet-connected devices.
- **FFUF/DIRB** = Tools used to discover hidden files and directories on web servers.