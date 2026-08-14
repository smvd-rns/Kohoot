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
    
    host = "aws-1-ap-south-1.pooler.supabase.com"
    port = "6543"
    db_user = "postgres.atgfsamrpeuiowhdvfct"
    db_pass = "Prabhupavad%40!08smvd"
    
    tables = [
        "auth.users",
        "public.profiles",
        "public.quizzes",
        "public.questions",
        "public.answer_options"
    ]
    
    for table in tables:
        cmd = f"docker exec -i supabase-db psql \"postgresql://{db_user}:{db_pass}@{host}:{port}/postgres\" -c \"SELECT count(*) FROM {table};\""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode(errors='ignore').strip()
        print(f"Old Table {table}:")
        print(out)
        print("-" * 20)
        
    ssh.close()
except Exception as e:
    print("Failed:", str(e))
