from itertools import combinations, chain
from collections import defaultdict
from sklearn import preprocessing
import numpy as np
from scipy.stats import pointbiserialr

def extract_primitive_names(pipeline):
    return [s['primitive']['python_path'] for s in pipeline['steps']]

def extract_primitive_matrix(pipelines):
    le = preprocessing.LabelEncoder()
    all_primitives = set()
    for pipeline in pipelines:
        all_primitives = all_primitives.union(extract_primitive_names(pipeline))
    le.fit(list(all_primitives))
    data_matrix = np.zeros([len(pipelines), len(le.classes_)], dtype=int)
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


def compute_group_importance(pipelines, scores, up_to_k=5):
    primitive_matrix, primitives = extract_primitive_matrix(pipelines)
    column_idx_map = {p: idx for idx, p  in enumerate(primitives)}
    importances = {}
    for k in range(1, up_to_k+1):
        for selected_columns in combinations(primitives, k):
            selected_columns_idx = np.array([column_idx_map[c] for c in selected_columns])
            sub_matrix = primitive_matrix[:, selected_columns_idx]
            used_all = np.prod(sub_matrix, axis = 1)
            importance, _  = pointbiserialr(used_all, scores)
            importance = 0 if np.isnan(importance) else importance
            importances[frozenset(selected_columns)] = importance

    # keeping only the ones for which importance is greater than those of its component parts
    kept = []
    for selected_columns in importances.keys():
        if (len(selected_columns) > 1):
            to_add = True
            for subgroup in chain(*[list(combinations(selected_columns, take)) for take in range(1, len(selected_columns))]):
                if abs(importances[frozenset(subgroup)]) >= abs(importances[selected_columns]):
                    to_add = False
                    break
            if to_add:
                kept.append({'importance':importances[selected_columns], 'group': list(selected_columns)})
    return sorted(kept, key=lambda x:abs(x['importance']), reverse=True)