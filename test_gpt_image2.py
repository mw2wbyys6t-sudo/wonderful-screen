import requests
import json
import os
import time

API_KEY = "mdlx-hVCG1tqofQFaCDys6NnleNuxbTeQN1282OQIaW5K4Nekb6Qk"
BASE_URL = "https://api.modellix.ai/api/v1/openai/gpt-image-2"

def generate_image(prompt, output_path):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "prompt": prompt,
        "size": "1024x1536",
        "quality": "high",
        "n": 1
    }
    print(f"Submitting task for {output_path}...")
    resp = requests.post(BASE_URL, headers=headers, json=payload, timeout=60)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    if not resp.ok:
        raise Exception(f"API error: {resp.status_code} {resp.text}")
    data = resp.json()
    # Handle direct URL or task_id polling
    if "data" in data and len(data["data"]) > 0:
        url = data["data"][0].get("url")
        if url:
            download_image(url, output_path)
            return
    # Check for task id
    task_id = data.get("id") or data.get("task_id")
    if task_id:
        poll_task(task_id, output_path)
        return
    raise Exception(f"Unexpected response format: {json.dumps(data, ensure_ascii=False)[:500]}")

def download_image(url, output_path):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(r.content)
    print(f"Saved to {output_path}")

def poll_task(task_id, output_path):
    print(f"Polling task {task_id}...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    for i in range(300):
        resp = requests.get(f"{BASE_URL}/tasks/{task_id}", headers=headers, timeout=30)
        print(f"Poll {i}: {resp.status_code} {resp.text[:300]}")
        if resp.ok:
            data = resp.json()
            status = data.get("status")
            if status == "completed" or status == "success":
                url = data.get("output", {}).get("url") or data.get("url") or (data.get("data") and data["data"][0].get("url"))
                if url:
                    download_image(url, output_path)
                    return
            if status in ("failed", "error"):
                raise Exception(f"Task failed: {data}")
        time.sleep(2)
    raise Exception("Polling timeout")

if __name__ == "__main__":
    prompt = "A beautiful anime movie poster featuring Elaina from Majo no Tabitabi. Long silver hair, azure blue eyes, wearing a white witch hat and robe with a dark cape and yellow ribbon. Standing in a dreamy sunset sky with floating pages and distant castle towers. Cinematic lighting, vertical composition, high quality anime illustration, magazine cover layout with Japanese title text placeholders."
    generate_image(prompt, "/workspace/images/login/test-elaina.jpg")
