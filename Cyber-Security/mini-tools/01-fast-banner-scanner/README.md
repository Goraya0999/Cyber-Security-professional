# Fast Banner Scanner 🔍

A simple multi-threaded TCP port scanner and banner grabber built with Python.

## 🚀 Features

* Scan common ports quickly using threading
* Banner grabbing for services (HTTP, FTP, SSH, etc.)
* Supports both IP addresses and hostnames
* Displays open ports even if no banner is returned
* Clean and readable output

## 🛠️ Technologies Used

* Python 3
* socket (networking)
* concurrent.futures (threading)

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/your-username/fast-banner-scanner.git
cd fast-banner-scanner
```

Install requirements (optional):

```bash
pip install -r requirements.txt
```

## ▶️ Usage

Run the scanner:

```bash
python scanner.py
```

Enter target when prompted:

```bash
Target IP/Hostname : scanme.nmap.org
```

## 📊 Example Output

```
[*] Scanning 45.33.32.156 - 12:30:10

Port     Service      Status             Banner
---------------------------------------------------------------
80       http         OPEN               HTTP/1.1 200 OK
22       ssh          OPEN               SSH-2.0-OpenSSH_6.6.1

Scan Completed
Total Open Ports: 2
Ports: [22, 80]
```

## ⚠️ Disclaimer

This tool is created for educational purposes only.
Do not scan systems without permission.

## 📌 Future Improvements

* Add CLI arguments (argparse)
* Save results to file
* Scan custom port ranges
* Improve banner detection

## 👨‍💻 Author

Muhammad Shafiq
