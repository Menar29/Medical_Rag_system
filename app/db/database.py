"""
SQLite persistence layer — conversations, messages, feedback.
Thread-safe via a single connection per request using FastAPI dependency injection.
"""

import sqlite3
import os
import time
from typing import List, Dict, Any, Optional
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "app/db/cerviscan.sqlite")


def init_db() -> None:
    """Create tables if they don't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id          TEXT PRIMARY KEY,
                role        TEXT NOT NULL DEFAULT 'patient',
                language    TEXT NOT NULL DEFAULT 'fr',
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id),
                role            TEXT NOT NULL,   -- 'user' | 'assistant'
                content         TEXT NOT NULL,
                language        TEXT,
                confidence      REAL,
                created_at      INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT,
                message_id      TEXT,
                query           TEXT,
                response        TEXT,
                rating          TEXT NOT NULL,   -- 'up' | 'down'
                comment         TEXT,
                created_at      INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_msg  ON feedback(message_id);
        """)


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Conversations ──────────────────────────────────────────────────────────────

def create_conversation(conv_id: str, role: str = "patient", language: str = "fr") -> Dict:
    now = int(time.time() * 1000)
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO conversations (id, role, language, created_at, updated_at) VALUES (?,?,?,?,?)",
            (conv_id, role, language, now, now),
        )
    return {"id": conv_id, "role": role, "language": language, "created_at": now}


def get_conversation(conv_id: str) -> Optional[Dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
    return dict(row) if row else None


def list_conversations(limit: int = 50) -> List[Dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


# ── Messages ───────────────────────────────────────────────────────────────────

def add_message(
    msg_id: str,
    conv_id: str,
    role: str,
    content: str,
    language: Optional[str] = None,
    confidence: Optional[float] = None,
) -> Dict:
    now = int(time.time() * 1000)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, language, confidence, created_at) VALUES (?,?,?,?,?,?,?)",
            (msg_id, conv_id, role, content, language, confidence, now),
        )
        conn.execute(
            "UPDATE conversations SET updated_at=? WHERE id=?", (now, conv_id)
        )
    return {"id": msg_id, "conversation_id": conv_id, "role": role, "content": content}


def get_messages(conv_id: str, limit: int = 20) -> List[Dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT ?",
            (conv_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Feedback ───────────────────────────────────────────────────────────────────

def save_feedback(
    feedback_id: str,
    rating: str,
    query: str = "",
    response: str = "",
    message_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    comment: Optional[str] = None,
) -> Dict:
    now = int(time.time() * 1000)
    with _connect() as conn:
        conn.execute(
            """INSERT INTO feedback
               (id, conversation_id, message_id, query, response, rating, comment, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (feedback_id, conversation_id, message_id, query, response, rating, comment, now),
        )
    return {"id": feedback_id, "rating": rating, "created_at": now}


def get_feedback_stats() -> Dict:
    with _connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN rating='up' THEN 1 ELSE 0 END) as positive, "
            "SUM(CASE WHEN rating='down' THEN 1 ELSE 0 END) as negative "
            "FROM feedback"
        ).fetchone()
    total = row["total"] or 0
    positive = row["positive"] or 0
    return {
        "total": total,
        "positive": positive,
        "negative": row["negative"] or 0,
        "satisfaction_rate": round(positive / total, 3) if total else None,
    }
