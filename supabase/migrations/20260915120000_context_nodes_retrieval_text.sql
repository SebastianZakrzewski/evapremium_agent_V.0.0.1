-- Hybrid retrieval: optional search copy per leaf (body unchanged for lookup).
-- Do not apply to PROD without an explicit go-ahead.

alter table eva_bot.context_nodes
  add column if not exists retrieval_text text not null default '';

comment on column eva_bot.context_nodes.retrieval_text is
  'Indexed for slug search (BM25/embeddings). Empty = title + body at ingest.';
