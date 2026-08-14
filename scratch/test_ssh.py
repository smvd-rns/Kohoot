import paramiko
import sys

ip = "168.144.220.70"
username = "root"
password = "Gauranga@!08SmVd"

try:
    print(f"Connecting to {ip} as {username}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(ip, username=username, password=password, timeout=10)
    print("SSH Connection Successful!")
    stdin, stdout, stderr = ssh.exec_command("uname -a")
    print("OS Info:", stdout.read().decode().strip())
    ssh.close()
except Exception as e:
    print("SSH Connection Failed:", str(e))
    sys.exit(1)
