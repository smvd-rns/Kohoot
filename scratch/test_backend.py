import urllib.request
import urllib.error
import json

url = "http://168.144.220.70:8000/rest/v1/"
publishable_key = "sb_publishable_nt4-xVoH5BdyTAPH20Xgdp_vU4uOFA4"
anon_jwt = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRlOWM2NjcyLWVjYjMtNGY2Zi1iNWZlLTg1NTQ0MzkxNDBkOSJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NjkxNjM4LCJleHAiOjE5NDQzNzE2Mzh9.M9pGFmRfRa7_1Pi96YYVZ6cLJ7cQHiLl4WwXPsTI1wKM8898bZ5E8D4Tf0wuOAqiWYsYonq7_4i2tsOyhXau5A"

req = urllib.request.Request(
    url,
    headers={
        "apikey": publishable_key,
        "Authorization": f"Bearer {anon_jwt}"
    }
)

try:
    print(f"Connecting to {url}...")
    with urllib.request.urlopen(req, timeout=10) as response:
        status_code = response.getcode()
        body = response.read().decode('utf-8')
        print(f"Connection Successful! Status Code: {status_code}")
        data = json.loads(body)
        print("Available tables in API:", list(data.get("definitions", {}).keys()))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Failed to connect:", str(e))
