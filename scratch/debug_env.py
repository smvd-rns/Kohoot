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

    stdin, stdout, stderr = ssh.exec_command("cat /root/supabase-project/.env")
    env_content = stdout.read().decode(errors='ignore')
    
    # Let's see some config keys
    for line in env_content.splitlines():
        if any(x in line for x in ["ANON_KEY", "JWT_SECRET", "API_KEYS", "JWT_KEYS", "GOTRUE_JWT_KEYS", "SUPABASE_PUBLISHABLE_KEY"]):
            print(line)
            
    ssh.close()
except Exception as e:
    print("Failed:", str(e))
