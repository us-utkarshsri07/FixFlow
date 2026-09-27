from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, field_validator
import re
class RepositoryRequest(BaseModel):
    github_url: str
    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not re.match(r"^https://github\.com/[\w.\-]+/[\w.\-]+/?$", v.strip()):
            raise ValueError("Must be a valid GitHub repository URL (e.g. https://github.com/owner/repo)")
        return v.strip().rstrip("/")
class Issue(BaseModel):
    number: int
    title: str
    state: str
    url: str
    labels: List[str] = []
    created_at: str
class PullRequest(BaseModel):
    number: int
    title: str
    state: str
    url: str
    created_at: str
class RepositoryResponse(BaseModel):
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str
    stars: int
    forks: int
    open_issues: int
    language: Optional[str] = None
    topics: List[str] = []
    recent_issues: List[Issue] = []
    recent_prs: List[PullRequest] = []
    readme_preview: Optional[str] = None
class AnalysisRequest(BaseModel):
    repository_url: str
    title: str
    severity: str = "auto"
    description: str
    environment: Optional[str] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"auto", "low", "medium", "high", "critical"}
        if v.lower() not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v.lower()
class Bug(BaseModel):
    id: str
    title: str
    detected_severity: str
    root_cause: str
    affected_file: str
    line_number: int
    explanation: str
    impact: str
    recommended_fix: str
    confidence: int
class AnalysisResponse(BaseModel):
    bug: Bug
    repository_url: str
    analyzed_at: str
class FixRequest(BaseModel):
    bug_id: str
    repository_url: str
    affected_file: str
    root_cause: str
    recommended_fix: str
class FileDiff(BaseModel):
    file: str
    before: str
    after: str
    explanation: str
class FixResponse(BaseModel):
    analysis_id: str
    branch_name: str
    commit_message: str
    diffs: List[FileDiff]
    generated_at: str
