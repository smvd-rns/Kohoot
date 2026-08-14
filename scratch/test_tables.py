import urllib.request
import urllib.error
import json

publishable_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NjkxNjI4LCJleHAiOjE5NDQzNzE2Mjh9.kv97ZexnTBqmhwUtufuLFetLU41CxrggPHcI4n2TAV4"
anon_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NjkxNjI4LCJleHAiOjE5NDQzNzE2Mjh9.kv97ZexnTBqmhwUtufuLFetLU41CxrggPHcI4n2TAV4"

def test_endpoint(endpoint):
    url = f"http://168.144.220.70:8000/rest/v1/{endpoint}"
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
            print(f"Success! Status Code: {response.getcode()}")
            print(response.read().decode('utf-8')[:500])
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print("Failed to connect:", str(e))

print("--- Testing 'quizzes' table ---")
test_endpoint("quizzes")

print("\n--- Testing 'profiles' table ---")
test_endpoint("profiles")
