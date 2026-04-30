import socket
import sys
import concurrent.futures
from datetime import datetime

COMMON_PORTS = [
    21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445,
    993, 1723, 3306, 3389, 5432, 8080, 8443
]

def grab(ip, port):
    try:
        s = socket.socket()
        s.settimeout(1)

        # FIX: connect_ex takes a tuple
        result = s.connect_ex((ip, port))

        if result == 0:  # port open
            if port in [80, 8080, 443, 8443]:
                s.send(b"HEAD / HTTP/1.0\r\n\r\n")

            banner = s.recv(1024).decode("utf-8", errors="ignore").strip()
            s.close()
            return port, banner[:80]

        s.close()
        return port, None

    except:
        return port, None


def main():
    target = input("Target IP/Hostname : ").strip()

    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror:
        print("Invalid hostname")
        sys.exit()

    print(f"\n[*] Banner grabbing {ip} - {datetime.now():%H:%M:%S}\n")
    print(f"{'Port':<8} {'Service':<12} {'Banner'}")
    print("-" * 65)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(grab, ip, p): p for p in COMMON_PORTS}

        for f in concurrent.futures.as_completed(futures):
            port, banner = f.result()

            if banner:
                try:
                    svc = socket.getservbyport(port, "tcp") if port < 1024 else ""
                except:
                    svc = ""

                print(f"{port:<8} {svc:<12} {banner[:45]}")


if __name__ == "__main__":
    main()