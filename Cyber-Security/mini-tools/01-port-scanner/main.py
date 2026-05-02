"""import socket
import sys

target = input("Enter Target ip :")

for port in range(1, 1025):
    try:
        s = socket.socket()
        s.settimeout(1)
        s.connect((target, port))
        print(f"[OPEN] port {port}")
        s.close()
    except:
        pass

print("\nScan completed ...")
"""
#------------------->UPGRAED VERSION<------------------
import socket
import threading
from datetime import datetime

target = input("Target IP: ")
open_ports = []

lock = threading.Lock()

def scan_port(port):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)

        result = s.connect_ex((target, port))   # ✅ correct way

        if result == 0:
            banner = ""
            try:
                banner = s.recv(1024).decode("utf-8", errors="ignore").strip()
            except:
                pass

            with lock:
                open_ports.append((port, banner))
                print(f"[OPEN] Port {port}")

        s.close()

    except Exception as e:
        pass  # you can log error if needed


print(f"Scanning {target}...\nStart Time: {datetime.now()}")

threads = []

# ⚡ Limit threads (IMPORTANT)
for port in range(1, 1025):
    t = threading.Thread(target=scan_port, args=(port,))
    threads.append(t)
    t.start()

# Wait for all threads
for t in threads:
    t.join()

print("\nScan completed.")

# 🔥 Output
if open_ports:
    print("\nOpen Ports:")
    for port, banner in open_ports:
        print(f"Port {port} | Banner: {banner}")
else:
    print("No open ports found.")