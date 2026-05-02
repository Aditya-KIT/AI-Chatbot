"""
main.py — FastAPI backend server
Start with: uvicorn main:app --reload
"""

import os
import fitz  # PyMuPDF
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ── Gemini client (new google.genai package) ──────────────────────────────────
client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

# ── Read PDFs once when server starts ────────────────────────────────────────
def read_pdf(path: str) -> str:
    try:
        doc = fitz.open(path)
        text = " ".join(page.get_text() for page in doc)
        print(f"✅ Loaded: {path} ({len(text)} characters)")
        return text
    except Exception as e:
        print(f"⚠️  Warning: Could not read {path} — {e}")
        return ""

RESUME_TEXT = read_pdf("data/resume.pdf")
FAQ_TEXT    = read_pdf("data/faq.pdf")

# ── System prompt — update your name and email ────────────────────────────────
SYSTEM_PROMPT = f"""You are an AI assistant for Aryan's portfolio website.
You help recruiters learn about Aryan's skills, experience, projects, and background.
Be professional, friendly, and concise.
Only answer questions relevant to Aryan's career and portfolio.
If asked something you don't know, suggest the recruiter email aryan@example.com directly.
Always encourage interested recruiters to connect on LinkedIn or schedule a call.

RESUME:
{RESUME_TEXT}

FAQ:
{FAQ_TEXT}
"""

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Portfolio Chatbot API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request model ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list = []

# ── Helper ────────────────────────────────────────────────────────────────────
def build_gemini_history(history: list[dict]) -> list:
    """Convert frontend history to Gemini Content format."""
    gemini_history = []
    for msg in history:
        role    = "model" if msg.get("role") == "assistant" else "user"
        content = msg.get("content", "")
        gemini_history.append(
            genai.types.Content(
                role=role,
                parts=[genai.types.Part(text=content)]
            )
        )
    return gemini_history

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):
    message = req.message.strip()
    history = req.history

    if not message:
        return {"error": "Message cannot be empty."}

    gemini_history = build_gemini_history(history)

    def token_stream():
        try:
            # Add current message to history
            contents = gemini_history + [
                genai.types.Content(
                    role="user",
                    parts=[genai.types.Part(text=message)]
                )
            ]

            # Stream response using new google.genai client
            response = client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=8192,
                    temperature=0.4,
                )
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            yield f"\n\n[Error generating response: {str(e)}]"

    return StreamingResponse(token_stream(), media_type="text/plain")