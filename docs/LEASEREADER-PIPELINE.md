# LeaseReader pipeline

LeaseReader processes authorized `leasereader` documents through the shared private-storage and quota pipeline.

1. Text is extracted per page from the stored PDF or text document.
2. A dedicated, injection-resistant prompt produces a bounded table of facts, clauses, risks and a summary.
3. The table is normalized into `leasereader-result@1.0.0`; every accepted value receives page evidence and confidence.
4. Deterministic patterns independently flag unilateral modification, unlimited liability, acceleration, entry without notice and waiver language.
5. The immutable machine report is stored in `analysis_results` with model, prompt and rules versions.
6. Reviewers approve, reject or request review and may store a validated correction overlay in `document_reviews.corrections`.

Corrections never overwrite the machine output. Consumers display the original and correction together, preserving author and decision timestamps. Trial and Growth include LeaseReader; Starter remains DocAudit-only.
