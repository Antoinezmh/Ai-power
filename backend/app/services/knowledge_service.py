"""Small, curated retrieval layer for platform-operation questions.

The first version intentionally uses local Markdown rather than a vendor-bound
embedding API. It keeps answers grounded in reviewed platform rules, runs
without another secret, and can later be replaced by a vector index without
changing the chat API.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


KNOWLEDGE_DIR = Path(__file__).resolve().parents[2] / "knowledge"


@dataclass(frozen=True)
class KnowledgeMatch:
    title: str
    source: str
    excerpt: str
    score: int


class KnowledgeService:
    @staticmethod
    def _tokens(value: str) -> set[str]:
        normalized = value.lower()
        words = set(re.findall(r"[a-z0-9_/-]{2,}|[\u4e00-\u9fff]{2,}", normalized))
        chinese = "".join(re.findall(r"[\u4e00-\u9fff]", normalized))
        words.update(chinese[index:index + 2] for index in range(max(0, len(chinese) - 1)))
        return words

    @classmethod
    def _documents(cls) -> list[tuple[str, str, str]]:
        documents: list[tuple[str, str, str]] = []
        if not KNOWLEDGE_DIR.exists():
            return documents
        for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
            text = path.read_text(encoding="utf-8").strip()
            if not text:
                continue
            title_match = re.search(r"^#\s+(.+)$", text, flags=re.MULTILINE)
            title = title_match.group(1).strip() if title_match else path.stem
            sections = re.split(r"(?=^##\s+)", text, flags=re.MULTILINE)
            for section in sections:
                cleaned = re.sub(r"^#\s+.+$", "", section, count=1, flags=re.MULTILINE).strip()
                if cleaned:
                    documents.append((title, path.name, cleaned))
        return documents

    @classmethod
    def search(cls, query: str, limit: int = 4) -> list[KnowledgeMatch]:
        query_tokens = cls._tokens(query)
        if not query_tokens:
            return []
        matches: list[KnowledgeMatch] = []
        for title, source, content in cls._documents():
            score = len(query_tokens & cls._tokens(f"{title}\n{content}"))
            if score:
                excerpt = re.sub(r"\s+", " ", content).strip()[:520]
                matches.append(KnowledgeMatch(title=title, source=source, excerpt=excerpt, score=score))
        matches.sort(key=lambda item: (-item.score, item.title, item.source))
        return matches[:limit]
