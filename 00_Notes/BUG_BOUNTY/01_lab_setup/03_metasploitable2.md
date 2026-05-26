# Lab Activity 2 — Setup Metasploitable2 in VirtualBox

---

# What is Metasploitable2?

Metasploitable2 is a purposely vulnerable Linux virtual machine used for:

- Ethical hacking practice
- Penetration testing
- Vulnerability scanning
- Cybersecurity learning

It contains many insecure services for practice in a safe lab environment.

---

# Requirements

Before setup, make sure these are installed:

- Kali Linux (Host OS)
- VirtualBox
- Internet connection
- Extracted Metasploitable2 files

---

# Download Metasploitable2

Official download link:

```text
https://sourceforge.net/projects/metasploitable/
```

Download the ZIP file and extract it.

---

# Extract Files

After downloading:

1. Right click ZIP file
2. Click:

```text
Extract Here
```

Inside the extracted folder, you will see a VMDK virtual disk file.

Example:

```text
Metasploitable.vmdk
```

---

# Open Terminal in Folder

Move inside the extracted folder.

Right click and select:

```text
Open Terminal Here
```

---

# Step 1: Create New Virtual Machine

```bash
VBoxManage createvm --name "Metasploitable2" --register
```

---

# Step 2: Configure VM Settings

```bash
VBoxManage modifyvm "Metasploitable2" \
--ostype Ubuntu \
--memory 2048 \
--cpus 2 \
--vram 64 \
--nic1 nat
```

---

# Settings Explanation

| Option | Purpose |
|--------|---------|
| Ubuntu | Linux operating system type |
| memory 2048 | Assigns 2GB RAM |
| cpus 2 | Assigns 2 CPU cores |
| vram 64 | Video memory |
| nic1 nat | NAT networking |

---

# Step 3: Create SATA Controller

```bash
VBoxManage storagectl "Metasploitable2" \
--name "SATA Controller" \
--add sata \
--controller IntelAhci
```

---

# Step 4: Attach Existing VMDK File

```bash
VBoxManage storageattach "Metasploitable2" \
--storagectl "SATA Controller" \
--port 0 \
--device 0 \
--type hdd \
--medium "/home/goraya000/hacking_tool/metasploitable2/Metasploitable.vmdk"
```

---

# Step 5: Start Virtual Machine

```bash
VBoxManage startvm "Metasploitable2"
```

---

# Default Login Credentials

After booting, login using:

```text
Username: msfadmin
Password: msfadmin
```

---

# Step 6: Configure Network

1. Close VM
2. Open VirtualBox
3. Right click on Metasploitable2
4. Open Settings
5. Go to Network
6. Change Adapter to:

```text
Bridged Adapter
```

7. Save settings
8. Start VM again

---

# Step 7: Check IP Address

Inside Metasploitable2 terminal, type:

```bash
ifconfig
```

or

```bash
ip a
```

Find the IP address.

Example:

```text
192.168.1.10
```

---

# Step 8: Test Connectivity

From Kali Linux host machine:

```bash
ping 192.168.1.10
```

If replies are received, the network is working correctly.

---

# Step 9: Scan Metasploitable2

Use Nmap to discover open ports and services.

```bash
nmap -sV 192.168.1.10
```

---

# Example Open Services

Metasploitable2 contains many intentionally vulnerable services:

| Service | Purpose |
|---------|---------|
| FTP | File transfer |
| SSH | Remote login |
| Telnet | Remote terminal |
| Apache | Web server |
| MySQL | Database |
| Samba | File sharing |

---

# Purpose of Metasploitable2 Lab

This lab helps in learning:

- Vulnerability assessment
- Port scanning
- Exploitation practice
- Service enumeration
- Penetration testing
- Linux security

---

# Important Note

Metasploitable2 is intentionally vulnerable.

Use it only:
- In local lab environments
- For ethical learning
- For cybersecurity practice

Never expose it to the public internet.

---

# Short Summary

| Topic | Description |
|-------|-------------|
| Metasploitable2 | Vulnerable Linux VM |
| VirtualBox | Used to run VM |
| VMDK | Virtual hard disk file |
| Bridged Adapter | Gives network access |
| Nmap | Used for scanning |
| msfadmin | Default username/password |
