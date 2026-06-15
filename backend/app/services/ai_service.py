import json, re
from typing import List, Dict, Any
from app.config import settings

GROQ_MODEL = "llama-3.3-70b-versatile"


def _get_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


async def generate_questions_from_text(text: str, num_questions: int = 10) -> List[Dict[str, Any]]:
    if not settings.GROQ_API_KEY:
        return _fallback_questions(num_questions)

    truncated = text[:12000]
    prompt = f"""You are an expert quiz creator for educational content.
Based on the following educational content, generate exactly {num_questions} multiple-choice questions.

Requirements:
- Each question must test understanding of key concepts
- Each question has exactly 4 answer options
- Questions should range from easy to challenging
- Be clear and unambiguous

Content:
{truncated}

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {{
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "time_limit": 30
  }}
]

Where correct_answer is the 0-based index (0=A, 1=B, 2=C, 3=D).
Generate exactly {num_questions} questions."""

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4096,
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        # Find the JSON array in the response
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            raw = match.group(0)
        questions = json.loads(raw)
        validated = []
        for q in questions:
            if (
                isinstance(q.get("text"), str)
                and isinstance(q.get("options"), list)
                and len(q["options"]) == 4
                and isinstance(q.get("correct_answer"), int)
                and 0 <= q["correct_answer"] <= 3
            ):
                validated.append({
                    "text": q["text"],
                    "options": q["options"],
                    "correct_answer": q["correct_answer"],
                    "time_limit": q.get("time_limit", 30),
                })
        return validated[:num_questions]
    except Exception as e:
        print(f"AI generation error: {e}")
        return _fallback_questions(num_questions)


async def summarize_text(text: str) -> str:
    if not settings.GROQ_API_KEY:
        return "AI summarization requires a GROQ_API_KEY in backend/.env"

    truncated = text[:15000]
    prompt = f"""Please provide a comprehensive yet concise summary of the following educational content.
Structure your summary with:
- **Main Topics**: Key subjects covered
- **Key Concepts**: Important ideas and definitions
- **Key Points**: Critical information to remember
- **Summary**: 2-3 sentence overview

Content:
{truncated}"""

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=2048,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating summary: {str(e)}"


def _fallback_questions(num: int) -> List[Dict[str, Any]]:
    return [
        {
            "text": f"Sample question {i+1}: What is the main concept discussed in this material?",
            "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
            "correct_answer": 0,
            "time_limit": 30,
        }
        for i in range(num)
    ]
