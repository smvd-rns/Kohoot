import os
import paramiko
import sys

# Reconfigure stdout/stderr to handle UTF-8 symbols on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ip = "168.144.220.70"
username = "root"
password = "Gauranga@!08SmVd"

def get_sql_files():
    migration_dir = "supabase/migrations"
    files = sorted(os.listdir(migration_dir))
    migration_paths = [os.path.join(migration_dir, f) for f in files if f.endswith(".sql")]
    return migration_paths

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(ip, username=username, password=password, timeout=30)
    print("Connected successfully to run migrations!")
    
    # 1. Run all migrations in order
    migration_files = get_sql_files()
    for file_path in migration_files:
        print(f"Applying migration: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        # Execute migration inside the container using docker exec -i
        stdin, stdout, stderr = ssh.exec_command("docker exec -i supabase-db psql -U postgres -d postgres")
        stdin.write(sql_content)
        stdin.close()
        
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        status = stdout.channel.recv_exit_status()
        
        if status != 0:
            print(f"Migration {file_path} failed with exit status {status}!")
            print(f"Error: {err}")
            sys.exit(1)
        else:
            print(f"Migration {file_path} applied successfully.")
            
    # 2. Run seed data
    seed_path = "supabase/seed.sql"
    if os.path.exists(seed_path):
        print(f"Applying seed data: {seed_path}")
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_content = f.read()
            
        stdin, stdout, stderr = ssh.exec_command("docker exec -i supabase-db psql -U postgres -d postgres")
        stdin.write(seed_content)
        stdin.close()
        
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        status = stdout.channel.recv_exit_status()
        
        if status != 0:
            print(f"Seed failed with exit status {status}!")
            print(f"Error: {err}")
            sys.exit(1)
        else:
            print("Seed data applied successfully.")
            
    ssh.close()
    print("Database migrations and seeding completed successfully!")
    
except Exception as e:
    print("Failed to run migrations:", str(e))
    sys.exit(1)
