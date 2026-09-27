from __future__ import annotations
import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.config import get_settings
from app.models.schemas import Bug, FileDiff, FixResponse
from app.services import code_service


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

async def analyze_bug(
    repository_url: str,
    title: str,
    severity: str,
    description: str,
    environment: Optional[str],
) -> Bug:
    """
    Analyse a bug report and return a structured Bug.

    - If OPEN_AI_KEY is set   → calls OpenAI and returns AI analysis.
    - If OPEN_AI_KEY is not set → falls back to plain-input passthrough
      (no fake data, just the user's own description as the result).
    """
    settings = get_settings()

    if not settings.OPEN_AI_KEY:
        return code_service.analyse_code_snippet(
            description=description,
            title=title,
            severity_hint=severity,
            repository_url=repository_url,
            environment=environment,
        )

    try:
        import openai  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("openai package is not installed. Run: pip install openai")

    try:
        client = openai.AsyncOpenAI(api_key=settings.OPEN_AI_KEY)

        system_prompt = (
            "You are an expert software security and reliability engineer. "
            "Analyse the bug report and return a JSON object with these exact keys: "
            "title, detected_severity (one of: low/medium/high/critical), root_cause, "
            "affected_file, line_number (integer), explanation, impact, recommended_fix, "
            "confidence (integer 0-100). "
            "Return raw JSON only — no markdown fences."
        )
        user_prompt = (
            f"Repository: {repository_url}\n"
            f"Bug title: {title}\n"
            f"Severity hint: {severity}\n"
            f"Description:\n{description}\n"
            f"Environment: {environment or 'not specified'}"
        )

        response = await client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        data = json.loads(response.choices[0].message.content or "{}")

        return Bug(
            id=str(uuid.uuid4()),
            title=data.get("title", title),
            detected_severity=data.get("detected_severity", "medium"),
            root_cause=data.get("root_cause", ""),
            affected_file=data.get("affected_file", "unknown"),
            line_number=int(data.get("line_number", 0)),
            explanation=data.get("explanation", ""),
            impact=data.get("impact", ""),
            recommended_fix=data.get("recommended_fix", ""),
            confidence=int(data.get("confidence", 75)),
        )

    except Exception as exc:
        raise RuntimeError(f"OpenAI analysis failed: {exc}") from exc
async def generate_fix(
    bug_id: str,
    repository_url: str,
    affected_file: str,
    root_cause: str,
    recommended_fix: str,
) -> FixResponse:
    """
    Generate a real code fix with OpenAI.

    Raises RuntimeError with a clear message if OPEN_AI_KEY is missing
    or the API call fails.
    """
    settings = get_settings()

    if not settings.OPEN_AI_KEY:
        raise RuntimeError(
            "OPEN_AI_KEY is not set in backend/.env. "
            "Add your OpenAI API key to enable fix generation."
        )

    try:
        import openai  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("openai package is not installed. Run: pip install openai")

    try:
        client = openai.AsyncOpenAI(api_key=settings.OPEN_AI_KEY)

        system_prompt = (
            "You are a senior software engineer. "
            "Generate a code fix for the described bug. "
            "Return a JSON object with keys: branch_name, commit_message, diffs. "
            "diffs is a list of objects each with: file, before (original code snippet), "
            "after (fixed code snippet), explanation. Return raw JSON only."
        )
        user_prompt = (
            f"Repository: {repository_url}\n"
            f"Affected file: {affected_file}\n"
            f"Root cause: {root_cause}\n"
            f"Recommended fix: {recommended_fix}"
        )

        response = await client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        data = json.loads(response.choices[0].message.content or "{}")

        diffs = [
            FileDiff(
                file=d.get("file", affected_file),
                before=d.get("before", ""),
                after=d.get("after", ""),
                explanation=d.get("explanation", ""),
            )
            for d in data.get("diffs", [])
        ]

        return FixResponse(
            analysis_id=bug_id,
            branch_name=data.get("branch_name", f"fix/{bug_id[:8]}"),
            commit_message=data.get("commit_message", "fix: address detected bug"),
            diffs=diffs,
            generated_at=_now_iso(),
        )

    except Exception as exc:
        raise RuntimeError(f"OpenAI fix generation failed: {exc}") from exc
