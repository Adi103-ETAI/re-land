"""Pipeline package.

- quick.run_pipeline: lightweight in-memory job pipeline (works offline,
  feeds the frontend job-polling UI)
- runner.PipelineOrchestrator: DB-persisted stage orchestration
"""
from app.services.pipeline.quick import run_pipeline  # noqa: F401
from app.services.pipeline.runner import PipelineOrchestrator  # noqa: F401
