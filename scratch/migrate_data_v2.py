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
    
    # Step 1: Dump data from old DB
    dump_cmd = (
        f"docker exec -i supabase-db pg_dump "
        f"\"postgresql://{db_user}:{db_pass}@{host}:{port}/postgres\" "
        f"--data-only --schema=public --schema=auth > /tmp/old_data.sql"
    )
    print("\n--- Step 1: Dumping data from old Supabase database ---")
    stdin, stdout, stderr = ssh.exec_command(dump_cmd)
    status = stdout.channel.recv_exit_status()
    print("Dump Status:", status)
    if status != 0:
        print("Dump Error:", stderr.read().decode(errors='ignore'))
        ssh.close()
        sys.exit(1)
        
    # Step 2: Truncate current tables in new database
    truncate_sql = """
    SET session_replication_role = 'replica';
    TRUNCATE TABLE auth.users CASCADE;
    TRUNCATE TABLE public.platform_settings CASCADE;
    TRUNCATE TABLE public.profiles CASCADE;
    TRUNCATE TABLE public.quizzes CASCADE;
    TRUNCATE TABLE public.questions CASCADE;
    TRUNCATE TABLE public.answer_options CASCADE;
    TRUNCATE TABLE public.quiz_sessions CASCADE;
    TRUNCATE TABLE public.session_participants CASCADE;
    TRUNCATE TABLE public.participant_answers CASCADE;
    TRUNCATE TABLE public.custom_fields CASCADE;
    TRUNCATE TABLE public.custom_field_responses CASCADE;
    TRUNCATE TABLE public.achievements CASCADE;
    TRUNCATE TABLE public.student_achievements CASCADE;
    TRUNCATE TABLE public.certificates CASCADE;
    SET session_replication_role = 'origin';
    """
    print("\n--- Step 2: Truncating tables in new database ---")
    truncate_cmd = f"docker exec -i supabase-db psql -U postgres -d postgres"
    stdin, stdout, stderr = ssh.exec_command(truncate_cmd)
    stdin.write(truncate_sql)
    stdin.close()
    print("Truncate Status:", stdout.channel.recv_exit_status())
    
    # Step 3: Restore using correct piping that executes both commands in the same session
    restore_cmd = (
        f"(echo \"SET session_replication_role = 'replica';\"; cat /tmp/old_data.sql) | "
        f"docker exec -i supabase-db psql -U postgres -d postgres"
    )
    print("\n--- Step 3: Restoring old data into new database ---")
    print(f"Running: {restore_cmd}")
    stdin, stdout, stderr = ssh.exec_command(restore_cmd)
    
    out = stdout.read().decode(errors='ignore')
    err = stderr.read().decode(errors='ignore')
    status = stdout.channel.recv_exit_status()
    
    print("Restore Status:", status)
    if status != 0:
        print("Restore Error:", err)
        ssh.close()
        sys.exit(1)
        
    # Query row counts in new DB to verify
    print("\n--- Verifying Row Counts in New DB ---")
    tables = [
        "auth.users",
        "public.profiles",
        "public.quizzes",
        "public.questions",
        "public.answer_options"
    ]
    for table in tables:
        cmd = f"docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT count(*) FROM {table};\""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(f"Table {table}:")
        print(stdout.read().decode(errors='ignore').strip())
        print("-" * 20)
        
    # Clean up
    ssh.exec_command("rm -f /tmp/old_data.sql")
    ssh.close()
    
except Exception as e:
    print("Failed migration:", str(e))
    sys.exit(1)
