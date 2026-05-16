import os
import json
from dotenv import load_dotenv
from main_app.agents import run_agrovet_agent

load_dotenv()

def test_agent():
    print("Testing Agrovet Agent for 'Muranga'...")
    results = run_agrovet_agent("Muranga")
    print(f"Found {len(results)} results.")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    test_agent()
