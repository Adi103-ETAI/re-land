"""
Evaluate extraction against data/golden_samples/labels.json
Reports per-field precision/recall — build fails if surveyNo <98% etc.
"""
import json, pathlib
GOLDEN = pathlib.Path("data/golden_samples/labels.json")
# TODO: compare predicted vs gold per field, print F1 table
