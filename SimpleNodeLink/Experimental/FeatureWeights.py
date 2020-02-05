# Code that computes feature weights from Linear Regression using the Johnson method (approximation to Shapley
# regression values).


def extract_primitive_names(pipeline):
    return [s['primitive']['name'] for s in pipeline['steps']]

def extract_coef_matrix(pipelines):
    from sklearn import preprocessing
    import numpy as np
    le = preprocessing.LabelEncoder()
    all_primitives = set()
    for pipeline in pipelines:
        all_primitives = all_primitives.union(extract_primitive_names(pipeline))
    le.fit(list(all_primitives))
    data_matrix = np.zeros([len(pipelines), len(le.classes_)])
    for i, pipeline in enumerate(pipelines):
        for j, primitive in enumerate(extract_primitive_names(pipeline)):
            idx_primitive = le.transform([primitive])
            data_matrix[i, idx_primitive] = 1
    return data_matrix, le.classes_

def extract_scores(pipelines):
    scores = []
    for pipeline in pipelines:
        score = pipeline['scores'][0]['value']
        scores.append(score)
    return scores

coefs = extract_coef_matrix(pipelines_problem["185_baseball_problem_TRAIN"])
scores = np.array(extract_scores(pipelines_problem["185_baseball_problem_TRAIN"]))

import rpy2.robjects as robjects
from rpy2.robjects import numpy2ri
numpy2ri.activate()
robjects.r('''
       source('johnson_green_fabbris_metrics.r')
''')

johnsonR = robjects.globalenv['johnsonR']
johnsonBoot = robjects.globalenv['johnsonBoot']

data = np.hstack([scores.reshape([-1,1]), coefs])
x = johnsonBoot(data)