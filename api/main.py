import os
import io
import json
import requests
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'static')
)

# ========= ENV =========
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")

client = Groq(api_key=GROQ_API_KEY)

CF_IMAGE_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning"


def ask_groq(system_prompt, user_prompt):
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.8,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    return completion.choices[0].message.content.strip()


def parse_json_safe(raw):
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(raw[start:end])
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not parse JSON: {raw[:300]}")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json()
        idea = data.get("idea", "").strip()
        style = data.get("style", "Cinematic").strip()
        aspect = data.get("aspect", "1:1").strip()

        if not idea:
            return jsonify({"error": "Please enter an idea."}), 400

        system_prompt = """You are VisionAgent AI, an elite AI Creative Director and Prompt Engineer.

Return ONLY valid JSON in this exact format with no other text, no markdown, no explanation:

{
  "plan": "short creative visual plan",
  "final_prompt": "high quality AI image prompt under 320 characters",
  "mood": ["tag1", "tag2", "tag3"],
  "lighting": "short lighting style",
  "camera": "short camera style",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "scene": "short scene summary",
  "use_case": "poster / thumbnail / concept art / product ad etc"
}

Rules:
- Return ONLY the JSON object, nothing else
- No markdown code blocks, no backticks
- Keep plan concise but cinematic (2-3 sentences)
- final_prompt must be powerful and visually rich, under 320 chars
- colors must be valid HEX values starting with #
- mood must be an array of 3-5 single word tags"""

        user_prompt = f"""User idea: {idea}
Preferred style: {style}
Aspect ratio: {aspect}

Create a premium creative direction output."""

        raw_output = ask_groq(system_prompt, user_prompt)
        parsed = parse_json_safe(raw_output)

        parsed.setdefault("plan", "A cinematic visual composition.")
        parsed.setdefault("final_prompt", idea)
        parsed.setdefault("mood", [])
        parsed.setdefault("lighting", "Natural")
        parsed.setdefault("camera", "Wide angle")
        parsed.setdefault("colors", [])
        parsed.setdefault("scene", "Outdoor environment")
        parsed.setdefault("use_case", "Concept Art")
        parsed["style"] = style
        parsed["aspect"] = aspect

        return jsonify(parsed)

    except Exception as e:
        return jsonify({"error": f"Something went wrong: {str(e)}"}), 500


@app.route("/generate-image", methods=["POST"])
def generate_image():
    try:
        data = request.get_json()
        prompt = data.get("prompt", "").strip()
        aspect = data.get("aspect", "1:1").strip()

        if not prompt:
            return jsonify({"error": "Missing prompt"}), 400

        aspect_hint = {
            "1:1": "square composition",
            "16:9": "wide cinematic composition",
            "9:16": "vertical portrait composition",
            "4:5": "social media poster composition"
        }.get(aspect, "square composition")

        enhanced_prompt = f"{prompt}, {aspect_hint}, ultra detailed, high quality, masterpiece"
        if len(enhanced_prompt) > 500:
            enhanced_prompt = enhanced_prompt[:500]

        api_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_IMAGE_MODEL}"

        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }

        response = requests.post(api_url, headers=headers, json={"prompt": enhanced_prompt}, timeout=180)

        if response.status_code != 200:
            try:
                error_detail = response.json().get("errors", [{}])[0].get("message", response.text[:200])
            except Exception:
                error_detail = response.text[:200]
            return jsonify({"error": f"Cloudflare failed ({response.status_code}): {error_detail}"}), 500

        return send_file(io.BytesIO(response.content), mimetype="image/png")

    except requests.Timeout:
        return jsonify({"error": "Image generation timed out. Please try again."}), 504
    except Exception as e:
        return jsonify({"error": f"Image generation error: {str(e)}"}), 500
    
if __name__ == "__main__":
    app.run(debug=True)
    app = app