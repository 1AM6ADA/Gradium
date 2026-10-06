import textwrap
from pathlib import Path

import fitz  # PyMuPDF

PAGE_W, PAGE_H = 595, 842  # A4 in points
MARGIN = 50
LINE_HEIGHT = 16
FONT_SIZE = 11
TITLE_SIZE = 18
HEADING_SIZE = 14


def _find_font(names: tuple[str, ...]) -> str | None:
    for base in (
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/dejavu",
        "/usr/share/fonts/TTF",
        "/usr/share/fonts/truetype/liberation",
    ):
        for name in names:
            p = Path(base) / name
            if p.exists():
                return str(p)
    return None


# PyMuPDF's built-in Base-14 fonts (helv/hebo) cover Latin-1 only, so Cyrillic
# (or any other non-Latin) quiz text would render as garbage in the exported
# handout. Prefer a system TTF with full Unicode coverage when available
# (fonts-dejavu is installed in the backend Docker image).
_UNI_FONT = _find_font(("DejaVuSans.ttf", "LiberationSans-Regular.ttf"))
_UNI_FONT_BOLD = _find_font(("DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf")) or _UNI_FONT


def _wrap(text: str, width: int = 92) -> list[str]:
    return textwrap.wrap(text, width=width) or [""]


class _Writer:
    """Minimal line-based PDF writer on top of PyMuPDF, paginating as needed."""

    def __init__(self, doc: "fitz.Document"):
        self.doc = doc
        self.page = doc.new_page(width=PAGE_W, height=PAGE_H)
        self.y = MARGIN

    def _new_page(self):
        self.page = self.doc.new_page(width=PAGE_W, height=PAGE_H)
        self.y = MARGIN

    def line(self, text: str, size: float = FONT_SIZE, bold: bool = False, gap: float = 0):
        if self.y + LINE_HEIGHT > PAGE_H - MARGIN:
            self._new_page()
        fontfile = _UNI_FONT_BOLD if bold else _UNI_FONT
        if fontfile:
            self.page.insert_text(
                (MARGIN, self.y), text, fontsize=size,
                fontname="uni-bold" if bold else "uni", fontfile=fontfile,
            )
        else:
            self.page.insert_text((MARGIN, self.y), text, fontsize=size, fontname="hebo" if bold else "helv")
        self.y += LINE_HEIGHT + gap

    def space(self, amount: float = LINE_HEIGHT):
        self.y += amount

    def page_break(self):
        self._new_page()


def generate_quiz_pdf(quiz, include_answers: bool = False) -> bytes:
    """Render a printable handout for a quiz/test: questions with blank
    answer space, optionally followed by a separate answer-key page.

    A separate trailing page (rather than inline answers) keeps the
    question pages usable as a clean student handout even when the
    teacher also wants their own copy with the key.
    """
    doc = fitz.open()
    w = _Writer(doc)

    w.line(quiz.title or "Untitled", size=TITLE_SIZE, bold=True, gap=4)
    if quiz.description:
        for ln in _wrap(quiz.description, 100):
            w.line(ln, size=10)
        w.space(4)
    w.line("Name: _________________________________     Date: ______________", size=10, gap=14)

    questions = sorted(quiz.questions, key=lambda q: q.order)
    for i, q in enumerate(questions, start=1):
        w.space(6)
        q_lines = _wrap(f"{i}. {q.text}", 92)
        for j, ln in enumerate(q_lines):
            w.line(ln, bold=(j == 0))

        if q.qtype == "open_ended":
            for _ in range(3):
                w.line("_" * 90)
        else:
            for k, opt in enumerate(q.options or []):
                letter = chr(65 + k)
                opt_lines = _wrap(f"     {letter}. {opt}", 88)
                for ln in opt_lines:
                    w.line(ln)

    if include_answers:
        w.page_break()
        w.line("Answer Key", size=HEADING_SIZE, bold=True, gap=10)
        for i, q in enumerate(questions, start=1):
            if q.qtype == "open_ended":
                answer_text = q.expected_answer or "(manual grading — no fixed answer)"
                for j, ln in enumerate(_wrap(f"{i}. {answer_text}", 92)):
                    w.line(ln)
            elif q.multiple:
                letters = ", ".join(chr(65 + idx) for idx in sorted(q.correct_answers or []))
                w.line(f"{i}. {letters or '—'}")
            else:
                options = q.options or []
                letter = chr(65 + q.correct_answer) if 0 <= q.correct_answer < len(options) else "—"
                w.line(f"{i}. {letter}")

    data = doc.tobytes()
    doc.close()
    return data
