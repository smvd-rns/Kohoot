import paramiko
import sys
import time

# Reconfigure stdout/stderr to handle UTF-8 symbols on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ip = "168.144.220.70"
username = "root"
password = "Gauranga@!08SmVd"

def run_commands(ssh, commands):
    for cmd in commands:
        print(f"\n--- Running: {cmd} ---")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                print(stdout.channel.recv(1024).decode(errors='ignore'), end="")
            if stderr.channel.recv_stderr_ready():
                print(stderr.channel.recv_stderr(1024).decode(errors='ignore'), end="", file=sys.stderr)
            time.sleep(0.1)
            
        print(stdout.read().decode(errors='ignore'), end="")
        print(stderr.read().decode(errors='ignore'), end="", file=sys.stderr)
        
        status = stdout.channel.recv_exit_status()
        print(f"Exit status: {status}")
        if status != 0:
            print("Error executing command. Aborting.")
            return False
    return True

try:
    print(f"Connecting to {ip}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(ip, username=username, password=password, timeout=30)
    print("Connected successfully!")
    
    # Run setup script
    commands = [
        "cd /root && sh /root/supabase/docker/setup.sh -y --project-dir /root/supabase-project --skip-deps"
    ]
    
    if run_commands(ssh, commands):
        print("\nSetup script execution succeeded. Updating URLs in .env...")
        
        # We will use Python on the VPS to update the URLs in the .env file
        python_update_script = """
import re
with open('/root/supabase-project/.env', 'r') as file:
    content = file.read()

# Replace localhost with actual IP
content = re.sub(r'SUPABASE_PUBLIC_URL=http://localhost:8000', 'SUPABASE_PUBLIC_URL=http://168.144.220.70:8000', content)
content = re.sub(r'API_EXTERNAL_URL=http://localhost:8000/auth/v1', 'API_EXTERNAL_URL=http://168.144.220.70:8000/auth/v1', content)

with open('/root/supabase-project/.env', 'w') as file:
    file.write(content)
print("Updated .env URLs successfully!")
"""
        # Execute the python script on the remote server
        stdin, stdout, stderr = ssh.exec_command("python3")
        stdin.write(python_update_script)
        stdin.close()
        print(stdout.read().decode(errors='ignore'))
        print(stderr.read().decode(errors='ignore'), file=sys.stderr)
        
        # Read the .env file to extract generated keys and save them locally
        print("Extracting generated keys...")
        stdin, stdout, stderr = ssh.exec_command("cat /root/supabase-project/.env")
        env_content = stdout.read().decode(errors='ignore')
        
        credentials = {}
        for line in env_content.splitlines():
            if any(x in line for x in ["POSTGRES_PASSWORD", "JWT_SECRET", "ANON_KEY", "SERVICE_ROLE_KEY"]):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    credentials[parts[0]] = parts[1]
                    
        with open('scratch/supabase_credentials.txt', 'w') as f:
            for k, v in credentials.items():
                f.write(f"{k}={v}\n")
        print("Saved credentials to local scratch/supabase_credentials.txt")
        
        # Start docker services
        print("Starting Supabase docker services...")
        start_commands = [
            "cd /root/supabase-project && docker compose up -d"
        ]
        run_commands(ssh, start_commands)
        
    ssh.close()
    
except Exception as e:
    print("Failed setup:", str(e))
    sys.exit(1)
