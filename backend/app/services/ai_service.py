import asyncio
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings

# Slide text sent to a text-only provider (DeepSeek) is capped to stay well
# within context limits; this is plenty for a multi-slide lecture deck.
_MAX_SLIDE_TEXT_CHARS = 14000


class AIServiceError(RuntimeError):
    pass


# ===========================================================================
# Public API — dispatches to the configured provider (settings.AI_PROVIDER).
# Both providers return the same validated dict shapes, so routes never need
# to know which one is active.
# ===========================================================================

async def generate_questions_from_presentation_pdf(
    pdf_path: str,
    num_questions: int = 10,
    topics: List[str] | None = None,
) -> List[Dict[str, Any]]:
    if settings.AI_PROVIDER == "deepseek":
        return await asyncio.to_thread(_deepseek_generate_quiz_sync, pdf_path, num_questions, topics)
    return await asyncio.to_thread(_gemini_generate_quiz_sync, pdf_path, num_questions, topics)


async def generate_test_questions_from_presentation_pdf(
    pdf_path: str,
    num_questions: int = 10,
    num_open_ended: int = 0,
    topics: List[str] | None = None,
) -> List[Dict[str, Any]]:
    num_open_ended = max(0, min(num_open_ended, num_questions))
    if settings.AI_PROVIDER == "deepseek":
        return await asyncio.to_thread(_deepseek_generate_test_sync, pdf_path, num_questions, num_open_ended, topics)
    return await asyncio.to_thread(_gemini_generate_test_sync, pdf_path, num_questions, num_open_ended, topics)


async def extract_topics_from_presentation_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """List the distinct topics covered in a deck, without generating any
    questions yet — lets a teacher pick a subset before generation runs."""
    if settings.AI_PROVIDER == "deepseek":
        return await asyncio.to_thread(_deepseek_extract_topics_sync, pdf_path)
    return await asyncio.to_thread(_gemini_extract_topics_sync, pdf_path)


async def regenerate_question_from_presentation_pdf(
    pdf_path: str,
    qtype: str,
    existing_text: str,
    avoid_texts: List[str],
) -> Dict[str, Any]:
    if settings.AI_PROVIDER == "deepseek":
        return await asyncio.to_thread(_deepseek_regenerate_sync, pdf_path, qtype, existing_text, avoid_texts)
    return await asyncio.to_thread(_gemini_regenerate_sync, pdf_path, qtype, existing_text, avoid_texts)


# ===========================================================================
# Gemini — reads the PDF visually (sends raw bytes; no text extraction).
# ===========================================================================

def _get_gemini_client():
    from google import genai

    if not settings.GEMINI_API_KEY:
        raise AIServiceError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _gemini_generate_content(contents: List[Any]) -> str:
    from google.genai import types

    client = _get_gemini_client()
    try:
        config = types.GenerateContentConfig(
            temperature=0.35,
            max_output_tokens=8192,
            response_mime_type="application/json",
        )
        response = client.models.generate_content(model=settings.GEMINI_MODEL, contents=contents, config=config)
    except TypeError:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config={"temperature": 0.35, "max_output_tokens": 8192, "response_mime_type": "application/json"},
        )
    return getattr(response, "text", "") or ""


def _load_pdf_part(pdf_path: str):
    from google.genai import types

    path = Path(pdf_path)
    if not path.exists():
        raise AIServiceError(f"PDF file not found: {pdf_path}")
    if path.suffix.lower() != ".pdf":
        raise AIServiceError("Gemini question generation expects a PDF file.")
    return types.Part.from_bytes(data=path.read_bytes(), mime_type="application/pdf")


def _gemini_generate_quiz_sync(pdf_path: str, num_questions: int, topics: List[str] | None = None) -> List[Dict[str, Any]]:
    raw = _gemini_generate_content([_load_pdf_part(pdf_path), _build_presentation_quiz_prompt(num_questions, visual=True, topics=topics)])
    validated = _validate_questions(_parse_questions_json(raw))
    if len(validated) < num_questions:
        raise AIServiceError(f"Gemini returned only {len(validated)} valid questions out of {num_questions}.")
    return validated[:num_questions]


def _gemini_generate_test_sync(pdf_path: str, num_questions: int, num_open_ended: int, topics: List[str] | None = None) -> List[Dict[str, Any]]:
    raw = _gemini_generate_content([_load_pdf_part(pdf_path), _build_test_prompt(num_questions, num_open_ended, visual=True, topics=topics)])
    validated = _validate_test_questions(_parse_questions_json(raw))
    if len(validated) < num_questions:
        raise AIServiceError(f"Gemini returned only {len(validated)} valid test questions out of {num_questions}.")
    return validated[:num_questions]


def _gemini_extract_topics_sync(pdf_path: str) -> List[Dict[str, Any]]:
    raw = _gemini_generate_content([_load_pdf_part(pdf_path), _build_topic_extraction_prompt(visual=True)])
    return _validate_topics(_parse_topics_json(raw))


def _gemini_regenerate_sync(pdf_path: str, qtype: str, existing_text: str, avoid_texts: List[str]) -> Dict[str, Any]:
    try:
        part = _load_pdf_part(pdf_path)
    except AIServiceError:
        raise AIServiceError("No source material available to regenerate from. Re-upload your slides.")
    raw = _gemini_generate_content([part, _build_regenerate_prompt(qtype, existing_text, avoid_texts, visual=True)])
    return _finalize_regenerated_question(_parse_single_question_json(raw), qtype)


# ===========================================================================
# DeepSeek — text-only (OpenAI-compatible API). Slides are converted to PDF
# upstream as usual, then text is extracted here since DeepSeek's chat API
# cannot read PDF/image bytes.
# ===========================================================================

def _get_deepseek_client():
    from openai import OpenAI

    if not settings.DEEPSEEK_API_KEY:
        raise AIServiceError("DEEPSEEK_API_KEY is not configured.")
    return OpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url=settings.DEEPSEEK_BASE_URL)


def _deepseek_chat_json(prompt: str) -> str:
    client = _get_deepseek_client()
    try:
        response = client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise AIServiceError(f"DeepSeek request failed: {exc}") from exc
    return response.choices[0].message.content or ""


def _extract_slide_text(pdf_path: str) -> str:
    from app.services.file_service import extract_text_from_pdf, TextExtractionError

    try:
        text = extract_text_from_pdf(pdf_path)
    except TextExtractionError as exc:
        raise AIServiceError(str(exc)) from exc
    if len(text) > _MAX_SLIDE_TEXT_CHARS:
        text = text[:_MAX_SLIDE_TEXT_CHARS] + "\n...(truncated)"
    return text


def _deepseek_generate_quiz_sync(pdf_path: str, num_questions: int, topics: List[str] | None = None) -> List[Dict[str, Any]]:
    slide_text = _extract_slide_text(pdf_path)
    raw = _deepseek_chat_json(_build_presentation_quiz_prompt(num_questions, visual=False, slide_text=slide_text, topics=topics))
    validated = _validate_questions(_parse_questions_json(raw))
    if len(validated) < num_questions:
        raise AIServiceError(f"DeepSeek returned only {len(validated)} valid questions out of {num_questions}.")
    return validated[:num_questions]


def _deepseek_generate_test_sync(pdf_path: str, num_questions: int, num_open_ended: int, topics: List[str] | None = None) -> List[Dict[str, Any]]:
    slide_text = _extract_slide_text(pdf_path)
    raw = _deepseek_chat_json(_build_test_prompt(num_questions, num_open_ended, visual=False, slide_text=slide_text, topics=topics))
    validated = _validate_test_questions(_parse_questions_json(raw))
    if len(validated) < num_questions:
        raise AIServiceError(f"DeepSeek returned only {len(validated)} valid test questions out of {num_questions}.")
    return validated[:num_questions]


def _deepseek_extract_topics_sync(pdf_path: str) -> List[Dict[str, Any]]:
    slide_text = _extract_slide_text(pdf_path)
    raw = _deepseek_chat_json(_build_topic_extraction_prompt(visual=False, slide_text=slide_text))
    return _validate_topics(_parse_topics_json(raw))


def _deepseek_regenerate_sync(pdf_path: str, qtype: str, existing_text: str, avoid_texts: List[str]) -> Dict[str, Any]:
    slide_text = _extract_slide_text(pdf_path)
    raw = _deepseek_chat_json(_build_regenerate_prompt(qtype, existing_text, avoid_texts, visual=False, slide_text=slide_text))
    return _finalize_regenerated_question(_parse_single_question_json(raw), qtype)


# ===========================================================================
# Shared prompt builders — `visual=True` frames the instructions around an
# attached file (Gemini); `visual=False` embeds extracted slide_text instead.
# ===========================================================================

def _source_block(visual: bool, slide_text: str | None) -> str:
    if visual:
        return (
            "Analyze the uploaded presentation visually and semantically. Use the "
            "actual slide content: text, formulas, diagrams, charts, tables, visual "
            "grouping, and slide context. Each page of the PDF is one slide — note "
            "which page/slide number (starting at 1) grounds each question."
        )
    return (
        "Use the following text extracted from the lecture slides as your only "
        "source. It is divided into sections marked '--- Slide/Page N ---' — note "
        "which slide number grounds each question.\n\n---\n" + (slide_text or "") + "\n---"
    )


def _topics_block(topics: List[str] | None) -> str:
    if not topics:
        return ""
    topic_list = "\n".join(f"- {t}" for t in topics)
    return (
        "\n\nIMPORTANT: The teacher has pre-selected a subset of topics. Only "
        "generate questions about these topics — ignore everything else in the "
        f"source material:\n{topic_list}\n"
    )


def _build_presentation_quiz_prompt(num_questions: int, visual: bool, slide_text: str | None = None, topics: List[str] | None = None) -> str:
    return f"""
You are an expert teacher and quiz creator.
{_source_block(visual, slide_text)}
{_topics_block(topics)}
Generate exactly {num_questions} multiple-choice questions.

Rules:
- Generate questions in the same language as the source material.
- Each question must be grounded in the source material.
- Do not use outside facts unless basic background knowledge is required.
- Prefer questions that test understanding, not only memorization.
- Each question must have exactly 4 answer options.
- Exactly one option must be correct.
- correct_answer must be the zero-based index of the correct option: 0, 1, 2, or 3.
- time_limit must be an integer number of seconds. Use 30 by default, 45-60 for harder questions.
- Avoid ambiguous wording.
- Avoid options like "all of the above" and "none of the above".
- Include "source_slide": the 1-based slide/page number this question is grounded in.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{{
  "questions": [
    {{
      "text": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "time_limit": 30,
      "source_slide": 1
    }}
  ]
}}
""".strip()


def _build_test_prompt(num_questions: int, num_open_ended: int, visual: bool, slide_text: str | None = None, topics: List[str] | None = None) -> str:
    num_multiple_choice = num_questions - num_open_ended
    return f"""
You are an expert teacher building a written test (like a Google Form), NOT a live quiz.
{_source_block(visual, slide_text)}
{_topics_block(topics)}
Generate exactly {num_questions} test questions:
- {num_multiple_choice} of type "multiple_choice"
- {num_open_ended} of type "open_ended" (short or extended free-text answer)

Rules for "multiple_choice" questions:
- Exactly 4 answer options.
- Exactly one option is correct.
- correct_answer is the zero-based index (0-3) of the correct option.
- Include a "points" integer (suggested weight for this question, typically 5-15,
  harder/longer questions worth more).

Rules for "open_ended" questions:
- options must be an empty array [].
- correct_answer must be null (you cannot reliably grade free text — the teacher
  will grade these manually).
- Include a "points" integer (suggested weight, typically 10-25, since open-ended
  answers usually carry more weight).

General rules:
- Generate questions in the same language as the source material.
- Each question must be grounded in the source material.
- Prefer questions that test understanding, not only memorization.
- Avoid ambiguous wording, and avoid "all of the above" / "none of the above".
- Include "source_slide": the 1-based slide/page number this question is grounded in.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{{
  "questions": [
    {{
      "qtype": "multiple_choice",
      "text": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "points": 10,
      "source_slide": 1
    }},
    {{
      "qtype": "open_ended",
      "text": "Explain ...",
      "options": [],
      "correct_answer": null,
      "points": 20,
      "source_slide": 3
    }}
  ]
}}
""".strip()


def _build_regenerate_prompt(qtype: str, existing_text: str, avoid_texts: List[str], visual: bool, slide_text: str | None = None) -> str:
    avoid_block = "\n".join(f"- {t}" for t in avoid_texts) or "(none)"
    type_rules = (
        """- Exactly 4 answer options.
- Exactly one option is correct.
- correct_answer is the zero-based index (0-3) of the correct option.
- Include a "points" integer (5-15)."""
        if qtype == "multiple_choice"
        else """- options must be an empty array [].
- correct_answer must be null.
- Include a "points" integer (10-25)."""
    )

    return f"""
You are an expert teacher. {_source_block(visual, slide_text)}

Generate exactly ONE new "{qtype}" question to REPLACE this existing one:
"{existing_text}"

The new question must cover similar ground (same general topic/difficulty) but
must be meaningfully different in wording and focus. It must NOT duplicate or
closely resemble any of these existing questions already in the same quiz:
{avoid_block}

Rules:
{type_rules}
- Generate the question in the same language as the source material.
- The question must be grounded in the source material.
- Include "source_slide": the 1-based slide/page number this question is grounded in.

Return ONLY a single valid JSON object (no markdown, no explanation) with this
exact shape:
{{
  "text": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 0,
  "points": 10,
  "source_slide": 1
}}
""".strip()


def _finalize_regenerated_question(parsed: Dict[str, Any], qtype: str) -> Dict[str, Any]:
    if qtype == "open_ended":
        validated = _validate_test_questions([{**parsed, "qtype": "open_ended"}])
    else:
        single = _validate_questions([parsed])
        if not single:
            raise AIServiceError("The model did not return a valid replacement question.")
        validated = [{**single[0], "qtype": "multiple_choice", "grading_mode": "auto", "points": parsed.get("points", 10)}]

    if not validated:
        raise AIServiceError("The model did not return a valid replacement question.")
    return validated[0]


def _build_topic_extraction_prompt(visual: bool, slide_text: str | None = None) -> str:
    return f"""
You are an expert teacher analyzing a lecture/presentation before writing a quiz.
{_source_block(visual, slide_text)}

Identify the distinct topics or concepts covered that could each become quiz
questions. Group related slides under one topic — don't list every slide
individually. Aim for 4 to 12 topics depending on how much material there is.

Rules:
- Name each topic in the same language as the source material.
- Each topic name should be short (3-8 words) and specific enough that a
  teacher recognizes it at a glance (not just "Introduction" or "Summary").
- Include "source_slide": the 1-based slide/page number where this topic
  is first introduced.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{{
  "topics": [
    {{"topic": "Short topic name", "source_slide": 1}}
  ]
}}
""".strip()


def _extract_source_label(item: Dict[str, Any]) -> str | None:
    """Normalize the model's reported slide number into a display label."""
    slide = item.get("source_slide")
    if isinstance(slide, bool):
        return None
    if isinstance(slide, int) and slide > 0:
        return f"Slide {slide}"
    if isinstance(slide, str) and slide.strip().isdigit():
        return f"Slide {int(slide.strip())}"
    return None


# ===========================================================================
# Parsing & validation — provider-agnostic.
# ===========================================================================

def _parse_questions_json(raw: str) -> List[Dict[str, Any]]:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if not match:
            raise AIServiceError("The model did not return valid JSON.") from exc
        parsed = json.loads(match.group(0))

    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        return parsed["questions"]
    if isinstance(parsed, list):
        return parsed

    raise AIServiceError("The model returned JSON, but not a question array.")


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
                "source_label": _extract_source_label(item),
            }
        )

    return validated


def _validate_test_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    validated: List[Dict[str, Any]] = []

    for item in questions:
        if not isinstance(item, dict):
            continue

        text = item.get("text")
        qtype = item.get("qtype")
        options = item.get("options")
        correct_answer = item.get("correct_answer")
        points = item.get("points", 10)

        if not isinstance(text, str) or not text.strip():
            continue
        if qtype not in ("multiple_choice", "open_ended"):
            continue
        if not isinstance(points, int) or points <= 0:
            points = 10

        if qtype == "multiple_choice":
            if not isinstance(options, list) or len(options) != 4:
                continue
            if not all(isinstance(o, str) and o.strip() for o in options):
                continue
            if not isinstance(correct_answer, int) or not 0 <= correct_answer <= 3:
                continue
            validated.append({
                "qtype": "multiple_choice",
                "text": text.strip(),
                "options": [o.strip() for o in options],
                "correct_answer": correct_answer,
                "points": points,
                "grading_mode": "auto",
                "source_label": _extract_source_label(item),
            })
        else:  # open_ended
            validated.append({
                "qtype": "open_ended",
                "text": text.strip(),
                "options": [],
                "correct_answer": -1,
                "points": points,
                "grading_mode": "manual",
                "source_label": _extract_source_label(item),
            })

    return validated


def _parse_topics_json(raw: str) -> List[Dict[str, Any]]:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if not match:
            raise AIServiceError("The model did not return valid JSON.") from exc
        parsed = json.loads(match.group(0))

    if isinstance(parsed, dict) and isinstance(parsed.get("topics"), list):
        return parsed["topics"]
    if isinstance(parsed, list):
        return parsed

    raise AIServiceError("The model returned JSON, but not a topic array.")


def _validate_topics(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    validated: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for item in items:
        if not isinstance(item, dict):
            continue
        topic = item.get("topic")
        if not isinstance(topic, str) or not topic.strip():
            continue
        key = topic.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        validated.append({"topic": topic.strip(), "source_label": _extract_source_label(item)})

    return validated


def _parse_single_question_json(raw: str) -> Dict[str, Any]:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if not match:
                raise AIServiceError("The model did not return valid JSON.") from exc
        parsed = json.loads(match.group(0))

    if isinstance(parsed, list) and parsed:
        parsed = parsed[0]
    if not isinstance(parsed, dict):
        raise AIServiceError("The model returned JSON, but not a question object.")
    return parsed
