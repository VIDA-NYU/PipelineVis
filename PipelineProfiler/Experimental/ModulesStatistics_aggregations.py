def count_used_modules_per_team(pipelines):
    from collections import defaultdict
    import pandas as pd
    team_module_count = defaultdict(lambda: defaultdict(int))
    for pipeline in pipelines:
        source_name = pipeline['pipeline_source']['name']
        for module in pipeline['steps']:
            module_id = '.'.join(module['primitive']['python_path'].split('.')[2:])
            team_module_count[module_id][source_name] += 1
    df = pd.DataFrame(team_module_count).fillna(0)
    df = df.reset_index().melt(id_vars="index")
    return df

df = count_used_modules_per_team(pipelines_problem["185_baseball_problem_TRAIN"])

alt.Chart(df).mark_circle().encode(x = "variable",
                                   y="value",
                                   color='index',
                                   tooltip=['index','variable', 'value']
                                  ).properties(
    title='Module usage per team'
)

def count_hyperparameters_per_team(pipelines):
    from collections import defaultdict
    import pandas as pd
    team_module_param_count = defaultdict(lambda: defaultdict(int))
    for pipeline in pipelines:
        source_name = pipeline['pipeline_source']['name']
        for module in pipeline['steps']:
            module_id = '.'.join(module['primitive']['python_path'].split('.')[2:])
            if ('hyperparams' in module):
                team_module_param_count[module_id][source_name] += 1
            else:
                team_module_param_count[module_id][source_name] += 0
    df = pd.DataFrame(team_module_param_count).fillna(0)
    df = df.reset_index().melt(id_vars="index")
    return df

df = count_hyperparameters_per_team(pipelines_problem["185_baseball_problem_TRAIN"])

alt.Chart(df).mark_circle().encode(x = "variable",
                                   y="value",
                                   color='index',
                                   tooltip=['index','variable', 'value']
                                  ).properties(
    title='Hyperparams tuned per team'
)