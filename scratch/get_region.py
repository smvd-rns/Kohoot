import urllib.request

url = "https://atgfsamrpeuiowhdvfct.supabase.co"

try:
    print(f"Connecting to {url}...")
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Status Code:", response.getcode())
        print("Headers:")
        for k, v in response.getheaders():
            print(f"  {k}: {v}")
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Headers:")
    for k, v in e.headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print("Failed to connect:", str(e))
