import subprocess

sql = """
UPDATE users 
SET password = '$2a$10$LNhS3b0XxeDxPSDRIxqntOORUz.Jf/pi6p5qOFcrpu1PLtFXRpd4q'
WHERE email IN ('adem@gmail.com', 'gold@pif.tn');
"""

cmd = ["docker", "exec", "-i", "pif-postgres", "psql", "-U", "postgres", "-d", "pif_trading_db", "-c", sql]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Returncode:", res.returncode)
print("Stdout:", res.stdout)
print("Stderr:", res.stderr)

