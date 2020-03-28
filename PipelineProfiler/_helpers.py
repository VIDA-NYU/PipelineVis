def find_pipeline_digest(pipelines, digest):
    if type(digest) != list:
        digest = [digest]
    digestMap = {d: True for d in digest}
    ret = []
    for pipeline in pipelines:
        if pipeline['pipeline_digest'] in digestMap:
            ret.append(pipeline)
    return ret