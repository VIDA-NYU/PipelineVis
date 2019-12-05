#!/usr/bin/env python
# coding: utf-8

# Script that preprocesses and merges "pipelines" and "pipeline_runs" from D3M Metalearning 
# Last files downloaded from https://gitlab.com/datadrivendiscovery/metalearning and 
# https://metalearning.datadrivendiscovery.org/dumps/2019/10/04/

import json
from IPython.core.display import display, HTML
display(HTML("<style>.container { width:2500px !important; }</style>"))


def merge_pipeline_files(pipelines_file, pipeline_runs_file, n=1000):
    # adding pipelines to lookup table {<digest>: <data>}
    print ("Adding pipelines to lookup table...")
    pipelines = {}
    with open(pipelines_file, "r") as f:
        for line in f:
            pipeline = json.loads(line)
            pipelines[pipeline["digest"]] = pipeline
    
    # merging pipeline information with pipeline_runs
    print ("Merging pipeline information with pipeline_runs_file...")
    merged = []
    with open(pipeline_runs_file, "r") as f:
        for line in f:
            if len(merged) == n:
                break
            try:
                run = json.loads(line)
                if run['run']['phase']!='PRODUCE':
                    continue
                pipeline = pipelines[run["pipeline"]["digest"]]
                data = {
                    'pipeline_id': pipeline['id'],
                    'pipeline_digest': pipeline['digest'],
                    'pipeline_source': pipeline['source'],
                    'inputs': pipeline['inputs'],
                    'outputs': pipeline['outputs'],
                    'problem': run['problem'],
                    'start': run['start'],
                    'end': run['end'],
                    'steps': pipeline['steps'],
                    'scores': run['run']['results']['scores']
                }
                merged.append(data)
            except Exception as e:
                print (e)
        print ("Done.")
    return merged



if __name__ == "__main__":
	pipeline_runs_file = "/Users/jorgehpo/Documents/D3MPipelines/pipeline_runs-1570214933.json"
	pipelines_file = "/Users/jorgehpo/Documents/D3MPipelines/pipelines-1570214926.json"
	d = merge_pipeline_files(pipelines_file, pipeline_runs_file, n = -1)
	with open("/Users/jorgehpo/Documents/D3MPipelines/pipelines_processed_20191004.json", "w") as f:
	    json.dump(d, f)





