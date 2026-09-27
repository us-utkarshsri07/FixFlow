from __future__ import annotations
import re
import httpx
from typing import Any, Dict, Optional

from app.config import get_settings
from app.models.schemas import (
    Issue,
    PullRequest,
    RepositoryResponse,
)


def _parse_github_url(url: str) -> tuple[str, str]:
    match = re.match(r"https://github\.com/([\w.\-]+)/([\w.\-]+)/?$", url)
    if not match:
        raise ValueError(f"Invalid GitHub URL: {url}")
    return match.group(1), match.group(2)


def _auth_headers() -> Dict[str, str]:
    settings = get_settings()
    headers: Dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return headers


def _raise_for_github_status(response: httpx.Response, resource: str = "resource") -> None:
    """Map GitHub HTTP errors to clear Python exceptions."""
    if response.status_code == 200:
        return
    if response.status_code == 401:
        raise PermissionError("GitHub authentication failed — check your GITHUB_TOKEN.")
    if response.status_code == 403:
        raise PermissionError("GitHub rate limit exceeded or access forbidden.")
    if response.status_code == 404:
        raise LookupError(f"GitHub {resource} not found (404).")
    if response.status_code == 429:
        raise ConnectionAbortedError("GitHub API rate limit exceeded (429).")
    response.raise_for_status()


async def fetch_repository(github_url: str) -> RepositoryResponse:
    """Fetch repository metadata, open issues, and recent pull requests."""
    owner, repo = _parse_github_url(github_url)
    settings = get_settings()
    base = settings.GITHUB_API_BASE
    headers = _auth_headers()

    async with httpx.AsyncClient(timeout=15.0) as client:
        repo_resp = await client.get(f"{base}/repos/{owner}/{repo}", headers=headers)
        _raise_for_github_status(repo_resp, "repository")
        repo_data: Dict[str, Any] = repo_resp.json()
        topics_resp = await client.get(
            f"{base}/repos/{owner}/{repo}/topics",
            headers={**headers, "Accept": "application/vnd.github.mercy-preview+json"},
        )
        topics: list[str] = []
        if topics_resp.status_code == 200:
            topics = topics_resp.json().get("names", [])
        issues_resp = await client.get(
            f"{base}/repos/{owner}/{repo}/issues",
            headers=headers,
            params={"state": "open", "per_page": 5, "sort": "created"},
        )
        raw_issues = issues_resp.json() if issues_resp.status_code == 200 else []
        issues = [
            Issue(
                number=i["number"],
                title=i["title"],
                state=i["state"],
                url=i["html_url"],
                labels=[lb["name"] for lb in i.get("labels", [])],
                created_at=i["created_at"],
            )
            for i in raw_issues
            if "pull_request" not in i  
        ][:5]
        prs_resp = await client.get(
            f"{base}/repos/{owner}/{repo}/pulls",
            headers=headers,
            params={"state": "open", "per_page": 5, "sort": "created"},
        )
        raw_prs = prs_resp.json() if prs_resp.status_code == 200 else []
        prs = [
            PullRequest(
                number=p["number"],
                title=p["title"],
                state=p["state"],
                url=p["html_url"],
                created_at=p["created_at"],
            )
            for p in raw_prs
        ][:5]
        readme_preview: Optional[str] = None
        readme_resp = await client.get(
            f"{base}/repos/{owner}/{repo}/readme",
            headers={**headers, "Accept": "application/vnd.github.raw+json"},
        )
        if readme_resp.status_code == 200:
            readme_preview = readme_resp.text[:500]

    return RepositoryResponse(
        owner=owner,
        name=repo,
        full_name=repo_data["full_name"],
        description=repo_data.get("description"),
        default_branch=repo_data.get("default_branch", "main"),
        stars=repo_data.get("stargazers_count", 0),
        forks=repo_data.get("forks_count", 0),
        open_issues=repo_data.get("open_issues_count", 0),
        language=repo_data.get("language"),
        topics=topics,
        recent_issues=issues,
        recent_prs=prs,
        readme_preview=readme_preview,
    )


