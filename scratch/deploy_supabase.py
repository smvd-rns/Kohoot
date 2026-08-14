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
        
        # Read output in real-time
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                print(stdout.channel.recv(1024).decode(errors='ignore'), end="")
            if stderr.channel.recv_stderr_ready():
                print(stderr.channel.recv_stderr(1024).decode(errors='ignore'), end="", file=sys.stderr)
            time.sleep(0.1)
            
        # Print final buffers
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
    
    # 1. Update and install Docker
    setup_commands = [
        "apt-get update",
        "apt-get install -y apt-transport-https ca-certificates curl software-properties-common git",
        "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /usr/share/keyrings/docker-archive-keyring.gpg",
        'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null',
        "apt-get update",
        "apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin",
        "docker --version",
        "docker compose version",
        # 2. Clone Supabase
        "rm -rf /root/supabase",
        "git clone --depth 1 https://github.com/supabase/supabase.git /root/supabase",
        "ls -la /root/supabase/docker"
    ]
    
    success = run_commands(ssh, setup_commands)
    ssh.close()
    if not success:
        sys.exit(1)
        
except Exception as e:
    print("Deployment failed:", str(e))
    sys.exit(1)
