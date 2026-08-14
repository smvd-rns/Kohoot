import paramiko
import sys

# Reconfigure stdout/stderr to handle UTF-8 symbols on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ip = "168.144.220.70"
username = "root"
password = "Gauranga@!08SmVd"

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(ip, username=username, password=password, timeout=30)
    print("Connected!")

    print("\n--- Running docker ps ---")
    stdin, stdout, stderr = ssh.exec_command("docker ps")
    print(stdout.read().decode(errors='ignore'))

    print("\n--- Running docker logs supabase-envoy ---")
    stdin, stdout, stderr = ssh.exec_command("docker logs supabase-envoy | tail -n 50")
    print(stdout.read().decode(errors='ignore'))
    print(stderr.read().decode(errors='ignore'), file=sys.stderr)
    
    ssh.close()
except Exception as e:
    print("Failed:", str(e))
