import asyncio
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings


class AIServiceError(RuntimeError):
    pass


def _get_gemini_client():
    from google import genai

    if not settings.GEMINI_API_KEY:
        raise AIServiceError("GEMINI_API_KEY is not configured.")

    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_questions_from_presentation_pdf(
    pdf_path: str,
    num_questions: int = 10,
) -> List[Dict[str, Any]]:
    """Generate quiz questions from a visual PDF presentation/document.

    The route must pass a PDF here:
    - uploaded .pdf files are passed directly;
    - uploaded .pptx/.ppt files are converted to .pdf before calling this function.

    This service intentionally does not support text-based question generation.
    """
    return await asyncio.to_thread(
        _generate_questions_from_presentation_pdf_sync,
        pdf_path,
        num_questions,
    )


def _generate_questions_from_presentation_pdf_sync(
    pdf_path: str,
    num_questions: int,
) -> List[Dict[str, Any]]:
    from google.genai import types

    path = Path(pdf_path)
    if not path.exists():
        raise AIServiceError(f"PDF file not found: {pdf_path}")
    if path.suffix.lower() != ".pdf":
        raise AIServiceError("Gemini question generation expects a PDF file.")

    client = _get_gemini_client()
    pdf_bytes = path.read_bytes()

    response = _generate_content(
        client=client,
        model=settings.GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(
                data=pdf_bytes,
                mime_type="application/pdf",
            ),
            _build_presentation_quiz_prompt(num_questions),
        ],
    )

    raw = getattr(response, "text", "") or ""
    questions = _parse_questions_json(raw)
    validated = _validate_questions(questions)

    if len(validated) < num_questions:
        raise AIServiceError(
            f"Gemini returned only {len(validated)} valid questions out of {num_questions}."
        )

    return validated[:num_questions]


def _generate_content(client: Any, model: str, contents: List[Any]) -> Any:
    """Call Gemini with JSON mode, with a minimal fallback for SDK config differences."""
    try:
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=0.35,
            max_output_tokens=8192,
            response_mime_type="application/json",
        )
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except TypeError:
        return client.models.generate_content(
            model=model,
            contents=contents,
            config={
                "temperature": 0.35,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            },
        )


def _build_presentation_quiz_prompt(num_questions: int) -> str:
    return f"""
You are an expert teacher and quiz creator.
Analyze the uploaded presentation visually and semantically. Use the actual slide content: text, formulas, diagrams, charts, tables, visual grouping, and slide context.

Generate exactly {num_questions} multiple-choice questions.

Rules:
- Generate questions in the same language as the presentation.
- Each question must be grounded in the uploaded presentation.
- Do not use outside facts unless the presentation itself requires basic background knowledge.
- Prefer questions that test understanding, not only memorization.
- Each question must have exactly 4 answer options.
- Exactly one option must be correct.
- correct_answer must be the zero-based index of the correct option: 0, 1, 2, or 3.
- time_limit must be an integer number of seconds. Use 30 by default, 45-60 for harder questions.
- Avoid ambiguous wording.
- Avoid options like "all of the above" and "none of the above".

Return ONLY a valid JSON array. No markdown. No explanation.

Required JSON shape:
[
  {{
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "time_limit": 30
  }}
]
""".strip()


def _parse_questions_json(raw: str) -> List[Dict[str, Any]]:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if not match:
            raise AIServiceError("Gemini did not return valid JSON.") from exc
        parsed = json.loads(match.group(0))

    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        return parsed["questions"]
    if isinstance(parsed, list):
        return parsed

    raise AIServiceError("Gemini returned JSON, but not a question array.")


def _validate_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    validated: List[Dict[str, Any]] = []

    for item in questions:
        if not isinstance(item, dict):
            continue

        text = item.get("text")
        options = item.get("options")
        correct_answer = item.get("correct_answer")
        time_limit = item.get("time_limit", 30)

        if not isinstance(text, str) or not text.strip():
            continue
        if not isinstance(options, list) or len(options) != 4:
            continue
        if not all(isinstance(option, str) and option.strip() for option in options):
            continue
        if not isinstance(correct_answer, int) or not 0 <= correct_answer <= 3:
            continue
        if not isinstance(time_limit, int) or time_limit <= 0:
            time_limit = 30

        validated.append(
            {
                "text": text.strip(),
                "options": [option.strip() for option in options],
                "correct_answer": correct_answer,
                "time_limit": time_limit,
            }
        )

    return validated
