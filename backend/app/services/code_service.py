from __future__ import annotations
import re
import uuid
from typing import Optional
from app.models.schemas import Bug
def analyse_code_snippet(
    description: str,
    title: str,
    severity_hint: str,
    repository_url: str,
    environment: Optional[str] = None,
) -> Bug:
    """
    Return a Bug built entirely from the user-supplied input.
    No pattern matching — every field comes from what the user wrote.
    """
    final_severity = severity_hint if severity_hint != "auto" else "medium"

    line_number = _extract_line(description)
    confidence  = 60 if severity_hint == "auto" else 72

    return Bug(
        id=str(uuid.uuid4()),
        title=title or "Unclassified Bug",
        detected_severity=final_severity,
        root_cause=description[:300] if description else "See description.",
        affected_file="unknown — add OPEN_AI_KEY to enable file detection",
        line_number=line_number,
        explanation=description[:500] if description else "No description provided.",
        impact="Unknown — add OPEN_AI_KEY to enable impact analysis.",
        recommended_fix="Add OPEN_AI_KEY to .env for AI-powered fix suggestions.",
        confidence=confidence,
    )


def _extract_line(text: str) -> int:
    """Pull an explicit line number from the text, fall back to 0."""
    match = re.search(r"line\s+(\d+)", text, re.IGNORECASE)
    return int(match.group(1)) if match else 0
