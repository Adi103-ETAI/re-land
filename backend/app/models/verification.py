"""Verification workflow models -- enums only.

Actual model classes live in extraction.py to avoid duplicate class names.
This module re-exports the enums used by the verification handler.
"""
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    PENDING_REPROCESS = "pending_reprocess"


class VerificationAction(str, enum.Enum):
    ACCEPT = "accept"
    CORRECT = "correct"
    REJECT = "reject"
    REPROCESS = "reprocess"
    ESCALATE = "escalate"


class ApprovalDecision(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"
