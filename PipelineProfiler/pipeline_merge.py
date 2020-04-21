#!/usr/bin/env python
# coding: utf-8

# Script that preprocesses and merges "pipelines" and "pipeline_runs" from D3M Metalearning 
# Last files downloaded from https://metalearning.datadrivendiscovery.org/dumps/2019/10/04/
# Metalearning data description: https://gitlab.com/datadrivendiscovery/metalearning

import json
import argparse

def merge_pipeline_files(pipelines_file, pipeline_runs_file, n=-1, verbose=False):
    # Function that merges the pipelines file with the pipeline_runs file.
    # Arguments:
    # pipelines_file: Path to the pipeline_runs file. See http://metalearning.datadrivendiscovery.org/dumps
    # pipeline_runs_file: Path to the pipelines file. See http://metalearning.datadrivendiscovery.org/dumps
    # n: Number of merged pipelines to output. If n=-1, save all pipelines to the merged file

    # adding pipelines to lookup table {<digest>: <data>}
    print ("Adding pipelines to lookup table...")
    pipelines = {}
    with open(pipelines_file, "r", encoding="utf8") as f:
        for line in f:
            pipeline = json.loads(line)
            pipelines[pipeline["digest"]] = pipeline
    
    # merging pipeline information with pipeline_runs
    print ("Merging pipeline information with pipeline_runs_file (this might take a while)...")
    merged = []
    with open(pipeline_runs_file, "r",  encoding="utf8") as f:
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
                if (verbose):
                    print (repr(e))
        print ("Done.")
    return merged



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pipeline_runs_file", help="Path to the pipeline_runs file. See http://metalearning.datadrivendiscovery.org/dumps", type=str)
    parser.add_argument("pipelines_file", help="Path to the pipelines file. See http://metalearning.datadrivendiscovery.org/dumps", type=str)
    parser.add_argument("output_file", help="Path to output file.", type=str)
    parser.add_argument("-n", "--number_pipelines", help="Number of pipelines to save to the file. If n=-1, save all pipelines to the merged file.", type=int, default=-1)
    parser.add_argument("-v", "--verbose", help="Increase output verbosity (show json key errors)", action="store_true")
    args = parser.parse_args()
    d = merge_pipeline_files(args.pipelines_file, args.pipeline_runs_file, n = args.number_pipelines, verbose=args.verbose)
    with open(args.output_file, "w", encoding="utf8") as f:
        json.dump(d, f)