import requests
import json
import random
import string

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def main():
    url = "http://localhost:3000/api/auth/register"
    name = "Test User " + random_string(5)
    email = "testuser_" + random_string(5) + "@example.com"
    password = "password123"

    payload = {
        "name": name,
        "email": email,
        "password": password
    }

    headers = {
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: {e}")
        print("Please make sure the server is running on http://localhost:3000")

if __name__ == "__main__":
    main()
