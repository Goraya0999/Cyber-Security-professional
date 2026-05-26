# OWASP Top 10 and Lab Activity Notes

---

# OWASP Top 10

OWASP Top 10 is a list of the most dangerous web application security vulnerabilities.

It is very important for:
- Cybersecurity learning
- Penetration testing
- Ethical hacking
- Security interviews

Many interview questions are based on OWASP Top 10 vulnerabilities.

---

# Common OWASP Vulnerabilities

## 1. Broken Access Control
Users can access data or pages without permission.

### Example

```text
/user/profile/1001
```

Changing the ID may allow access to another user's data.

---

## 2. Broken Authentication

Weak login systems allow attackers to:
- Steal accounts
- Guess passwords
- Bypass login

### Common Issues

- Weak passwords
- No MFA
- Session hijacking
- Passwords stored in plain text

---

# Metasploitable

Metasploitable is a vulnerable virtual machine created for:
- Ethical hacking practice
- Penetration testing labs
- Security training

It contains intentionally vulnerable services and applications.

---

# Lab Activity

## Environment Setup

- Kali Linux is already used as the host operating system.
- VirtualBox is used for virtualization.

---

# Download VMware

Install VirtualBox or VMware for running virtual machines.

---

# Download OWASP Broken Web Apps

Official download link:

```text
https://sourceforge.net/projects/owaspbwa/
```

OWASP Broken Web Apps contains multiple intentionally vulnerable web applications for learning web security.

---

# Issue Importing VMDK File in VirtualBox

The VMDK file was not importing correctly through the GUI, so CLI commands were used.

---

# Step 1: Extract ZIP File

Extract the downloaded OWASP BWA ZIP file.

---

# Step 2: Open Terminal

Move inside the extracted folder.

Right click and select:

```text
Open Terminal Here
```

---

# Step 3: Create New Virtual Machine

```bash
VBoxManage createvm --name "OWASP_BWA" -register
```

---

# Step 4: Configure Basic VM Settings

```bash
VBoxManage modifyvm "OWASP_BWA" \
--ostype Ubuntu_64 \
--memory 4096 \
--cpus 2 \
--vram 128 \
--nic1 nat
```

### Explanation

| Option | Purpose |
|--------|---------|
| Ubuntu_64 | Sets operating system type |
| memory 4096 | Allocates 4GB RAM |
| cpus 2 | Assigns 2 CPU cores |
| vram 128 | Video memory |
| nic1 nat | Network adapter using NAT |

---

# Step 5: Create SATA Controller

```bash
VBoxManage storagectl "OWASP_BWA" \
--name "SATA Controller" \
--add sata \
--controller IntelAhci
```

---

# Step 6: Attach Existing VMDK Disk

```bash
VBoxManage storageattach "OWASP_BWA" \
--storagectl "SATA Controller" \
--port 0 \
--device 0 \
--type hdd \
--medium "/home/goraya000/hacking_tool/OWASP_Broken_Web_Apps_VM_1.2/OWASP Broken Web Apps-cl1.vmdk"
```

---

# Step 7: Start Virtual Machine

```bash
VBoxManage startvm "OWASP_BWA"
```

---

# Step 8: Configure Network Settings

After starting the VM:

1. Close the VM
2. Open VirtualBox
3. Right click on OWASP_BWA
4. Open Settings
5. Go to Network
6. Change network mode to:

```text
Bridged Adapter
```

7. Save settings
8. Start VM again

---

# Step 9: Network Troubleshooting

Check network connectivity using ping command.

## Example

```bash
ping google.com
```

or

```bash
ping 192.168.1.1
```

---

# Step 10: Access OWASP Broken Web Apps

Find the IP address of the OWASP BWA virtual machine.

Open browser in Kali Linux and enter:

```text
http://<OWASP_VM_IP>
```

Example:

```text
http://192.168.1.5
```

You will see multiple vulnerable web applications for practice.

---

# Purpose of This Lab

This lab helps in learning:
- Web application security
- Penetration testing
- Vulnerability assessment
- OWASP Top 10
- Ethical hacking practice

---

# Short Summary

| Topic | Description |
|-------|-------------|
| OWASP Top 10 | List of major web vulnerabilities |
| Broken Authentication | Weak login security |
| Metasploitable | Vulnerable VM for practice |
| OWASP BWA | Vulnerable web applications |
| VirtualBox CLI | Used to import VMDK manually |
| Bridged Adapter | Allows VM to access network |
