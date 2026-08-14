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
    print("Connected to VPS!")
    
    # Test connection to the Mumbai pooler
    cmd = "docker exec -i supabase-db pg_isready -h aws-0-ap-south-1.pooler.supabase.com -p 6543"
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='ignore')
    err = stderr.read().decode(errors='ignore')
    status = stdout.channel.recv_exit_status()
    
    print("Status:", status)
    print("Output:", out)
    print("Error:", err)
    
    ssh.close()
except Exception as e:
    print("Failed:", str(e))
