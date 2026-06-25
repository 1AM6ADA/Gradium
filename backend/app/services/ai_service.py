import asyncio
import json
import re
from pathlib import Path
from typing import Any, Dict, List

import requests
from markitdown import MarkItDown

from app.config import settings


class AIServiceError(RuntimeError):
    pass


async def generate_questions_from_presentation_pdf(
    pdf_path: str,
    num_questions: int = 10,
) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(
        _generate_questions_from_presentation_pdf_sync,
        pdf_path,
        num_questions,
    )


def _generate_questions_from_presentation_pdf_sync(
    pdf_path: str,
    num_questions: int,
) -> List[Dict[str, Any]]:
    path = Path(pdf_path)

    if not path.exists():
        raise AIServiceError(f"PDF file not found: {pdf_path}")

    if path.suffix.lower() != ".pdf":
        raise AIServiceError("Question generation expects a PDF file.")

    markdown_text = _extract_markdown_from_pdf(str(path))

    if not markdown_text.strip():
        raise AIServiceError("MarkItDown returned empty text from the PDF.")

    prompt = _build_local_llm_quiz_prompt(
        markdown_text=markdown_text,
        num_questions=num_questions,
    )

    raw = _call_ollama(prompt)
    questions = _parse_questions_json(raw)
    validated = _validate_questions(questions)

    if len(validated) < num_questions:
        raise AIServiceError(
            f"Local LLM returned only {len(validated)} valid questions out of {num_questions}."
        )

    return validated[:num_questions]


def _extract_markdown_from_pdf(pdf_path: str) -> str:
    try:
        converter = MarkItDown()
        result = converter.convert(pdf_path)
        return result.text_content or ""
    except Exception as exc:
        raise AIServiceError(f"MarkItDown failed to process PDF: {exc}") from exc


def _call_ollama(prompt: str) -> str:
    ollama_url = getattr(settings, "OLLAMA_URL", "http://ollama:11434")
    model = getattr(settings, "LOCAL_LLM_MODEL", "qwen2.5:3b")

    try:
        response = requests.post(
            f"{ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2,
                    "num_ctx": 8192,
                },
            },
            timeout=300,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise AIServiceError(f"Ollama request failed: {exc}") from exc

    data = response.json()
    return data.get("response", "")


def _build_local_llm_quiz_prompt(markdown_text: str, num_questions: int) -> str:
    return f"""
You are an expert teacher and quiz creator.

You will receive lecture content extracted from a PDF presentation as Markdown.
Generate exactly {num_questions} multiple-choice questions based only on this content.

Rules:
- Generate questions in the same language as the lecture content.
- Each question must be grounded in the provided content.
- Do not use outside facts.
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

Lecture content:
\"\"\"
{markdown_text[:24000]}
\"\"\"
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
            raise AIServiceError("Local LLM did not return valid JSON.") from exc
        parsed = json.loads(match.group(0))

    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        return parsed["questions"]
    if isinstance(parsed, list):
        return parsed

    raise AIServiceError("Local LLM returned JSON, but not a question array.")


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
