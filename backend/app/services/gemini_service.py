
import os
import time

from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def generate_simulation_content(topic: str, audience: str, difficulty: str):
    if not API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing")

    client = genai.Client(api_key=API_KEY)

    prompt = f"""
    You are a cybersecurity awareness training assistant.

    Create a SAFE phishing-awareness simulation draft.

    Topic: {topic}
    Audience: {audience}
    Difficulty: {difficulty}

    Return four sections:
    1. Title
    2. Email Subject
    3. Training Email Content
    4. Learning Objective

    Safety requirements:
    - Use fictional organizations.
    - Never collect real passwords or sensitive information.
    - No functional credential-harvesting links.
    - No malicious attachments or executable code.
    - Clearly label the result as a simulation draft.
    - Include educational warning signs.
    """

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt
            )

            if not response.text:
                raise RuntimeError("Gemini returned an empty response")

            return response.text

        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)