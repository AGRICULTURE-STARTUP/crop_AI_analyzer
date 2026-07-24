"""Inference helpers and Celery tasks (scanner + RAG). TF must only be imported inside scanner tasks."""

default_app_config = "inference.apps.InferenceConfig"
