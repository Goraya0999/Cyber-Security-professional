import socket
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
