# PipelineProfiler

AutoML Pipeline exploration tool compatible with Jupyter Notebooks. Supports auto-sklearn and D3M pipeline format.

[![arxiv badge](https://img.shields.io/badge/arXiv-2005.00160-red)](https://arxiv.org/abs/2005.00160)

![System screen](https://github.com/VIDA-NYU/PipelineVis/blob/master/imgs/system.png)

(Shift click to select multiple pipelines)

**Paper**: [https://arxiv.org/abs/2005.00160](https://arxiv.org/abs/2005.00160)

**Video**: [https://youtu.be/2WSYoaxLLJ8](https://youtu.be/2WSYoaxLLJ8)

**Blog**: [Medium post](https://towardsdatascience.com/exploring-auto-sklearn-models-with-pipelineprofiler-5b2c54136044)

## Demo

Live demo (Google Colab):
- [Heart Stat Log data](https://colab.research.google.com/drive/1k_h4HWUKsd83PmYMEBJ87UP2SSJQYw9A?usp=sharing)
- [auto-sklearn classification](https://colab.research.google.com/drive/1_2FRIkHNFGOiIJt-n_3zuh8vpSMLhwzx?usp=sharing)

In Jupyter Notebook:
~~~~
import PipelineProfiler
data = PipelineProfiler.get_heartstatlog_data()
PipelineProfiler.plot_pipeline_matrix(data)
~~~~

## Install

### Option 1: install via pip:
~~~~
pip install pipelineprofiler
~~~~

### Option 2: Run the docker image:
~~~~
docker build -t pipelineprofiler .
docker run -p 9999:8888 pipelineprofiler
~~~~

Then copy the access token and log in to jupyter in the browser url:
~~~~
localhost:9999
~~~~

## Data preprocessing

PipelineProfiler reads data from the D3M Metalearning database. You can download this data from: https://metalearning.datadrivendiscovery.org/dumps/2020/03/04/metalearningdb_dump_20200304.tar.gz

You need to merge two files in order to explore the pipelines: pipelines.json and pipeline_runs.json.  To do so, run
~~~~
python -m PipelineProfiler.pipeline_merge [-n NUMBER_PIPELINES] pipeline_runs_file pipelines_file output_file
~~~~

## Pipeline exploration

~~~~
import PipelineProfiler
import json
~~~~

In a jupyter notebook, load the output_file 

~~~~
with open("output_file.json", "r") as f:
    pipelines = json.load(f)
~~~~

and then plot it using:

~~~~
PipelineProfiler.plot_pipeline_matrix(pipelines[:10])
~~~~

## Data postprocessing

You might want to group pipelines by problem type, and select the top k pipelines from each team. To do so, use the code:

~~~~
def get_top_k_pipelines_team(pipelines, k):
    team_pipelines = defaultdict(list)
    for pipeline in pipelines:
        source = pipeline['pipeline_source']['name']
        team_pipelines[source].append(pipeline)
    for team in team_pipelines.keys():
        team_pipelines[team] = sorted(team_pipelines[team], key=lambda x: x['scores'][0]['normalized'], reverse=True)
        team_pipelines[team] = team_pipelines[team][:k]
    new_pipelines = []
    for team in team_pipelines.keys():
        new_pipelines.extend(team_pipelines[team])
    return new_pipelines

def sort_pipeline_scores(pipelines):
    return sorted(pipelines, key=lambda x: x['scores'][0]['value'], reverse=True)    

pipelines_problem = {}
for pipeline in pipelines:  
    problem_id = pipeline['problem']['id']
    if problem_id not in pipelines_problem:
        pipelines_problem[problem_id] = []
    pipelines_problem[problem_id].append(pipeline)
for problem in pipelines_problem.keys():
    pipelines_problem[problem] = sort_pipeline_scores(get_top_k_pipelines_team(pipelines_problem[problem], k=100))
~~~~
