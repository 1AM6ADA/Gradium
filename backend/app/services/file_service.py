import shutil
import subprocess
from pathlib import Path
from typing import Optional, Tuple


class UnsupportedGenerationFileType(ValueError):
    pass


class PresentationConversionError(RuntimeError):
    pass


def prepare_pdf_for_gemini(file_path: str, filename: str, output_dir: Optional[str] = None) -> Tuple[str, bool]:
    """Return a PDF path ready for Gemini question generation.

    Uploaded PDF files are used directly.
    Uploaded PPTX/PPT files are converted to PDF first.
    Gemini receives only PDF bytes.
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return file_path, False

    if ext in {".pptx", ".ppt"}:
        if output_dir is None:
            output_dir = str(Path(file_path).parent)
        return convert_presentation_to_pdf(file_path, output_dir), True

    raise UnsupportedGenerationFileType(
        "Only PDF and PPTX/PPT files are supported for AI question generation."
    )


def convert_presentation_to_pdf(file_path: str, output_dir: str) -> str:
    """Convert PPTX/PPT to PDF with LibreOffice/soffice."""
    office_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not office_bin:
        raise PresentationConversionError(
            "LibreOffice is not installed. Install it on the server to convert PPTX/PPT to PDF."
        )

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    input_path = Path(file_path)

    command = [
        office_bin,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        output_dir,
        str(input_path),
    ]

    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        raise PresentationConversionError("PPTX/PPT to PDF conversion timed out.") from exc

    if result.returncode != 0:
        details = (result.stderr or result.stdout or "Unknown LibreOffice error").strip()
        raise PresentationConversionError(f"PPTX/PPT to PDF conversion failed: {details}")

    expected_pdf = Path(output_dir) / f"{input_path.stem}.pdf"
    if expected_pdf.exists():
        return str(expected_pdf)

    pdf_candidates = sorted(
        Path(output_dir).glob("*.pdf"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if pdf_candidates:
        return str(pdf_candidates[0])

    raise PresentationConversionError("LibreOffice finished but no PDF file was produced.")
