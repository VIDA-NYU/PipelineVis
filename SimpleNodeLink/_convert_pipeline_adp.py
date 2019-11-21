from collections import OrderedDict
import json
from pathlib import Path
from os.path import expanduser
import numpy as np

def extract_primitive_names(pipeline):
    return [s["primitive"]["python_path"] for s in pipeline["steps"]]

def get_default_adp_dict(pipelines):
    adp_dict = OrderedDict()
    for pipeline in pipelines:
        for name in extract_primitive_names(pipeline):
            adp_dict[name] = "0"
    adp_dict["result"] = "False"
    return adp_dict

def export_adb_file(fname, pipelines, success):
    default_adp_dict = get_default_adp_dict(pipelines)
    with open(fname, "w") as f:
        for pipeline in pipelines:
            adp_dict = default_adp_dict.copy()
            for step in pipeline["steps"]:
                adp_dict[step["primitive"]["python_path"]] = "1"
            adp_dict["result"] = "True" if success(pipeline["scores"][0]["value"]) else "False"
            f.write(json.dumps(adp_dict) + "\n")

def export_all_adp(root_dir, pipelines):
    root_dir = Path(expanduser(root_dir))
    pipeline_names = pipelines.keys()
    bins = np.arange(0,1.1,0.1)
    for name in pipeline_names:
        pipeline_dir = root_dir / name
        pipeline_dir.mkdir(parents=True, exist_ok=True)
        for idx in range(len(bins)-1):
            low = bins[idx]
            high = bins[idx+1]
            success = lambda x: x > low and x <= high
            export_adb_file(pipeline_dir / ("interval_{:.2f}_{:.2f}.adp".format(low, high)), pipelines[name], success)


if __name__ == "__main__":
    with open("/Users/jorgehpo/Documents/D3MPipelines/pipelines_processed_20191004.json", "r") as f:
        pipelines = json.load(f)
    pipelines_problem = {}
    for pipeline in pipelines:
        problem_id = pipeline['problem']['id']
        if problem_id not in pipelines_problem:
            pipelines_problem[problem_id] = []
        pipelines_problem[problem_id].append(pipeline)
    export_all_adp("/Users/jorgehpo/Desktop/pipelines_adp", pipelines_problem)