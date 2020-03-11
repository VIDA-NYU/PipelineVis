def find_pipeline_digest(pipelines, digest):
	for pipeline in pipelines:
		if pipeline['pipeline_digest'] == digest:
			return pipeline
	return null