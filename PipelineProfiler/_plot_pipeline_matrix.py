import pkg_resources
import string
import numpy as np
import json
from scipy import optimize
from tsp_solver.greedy import solve_tsp

def id_generator(size=15):
    """Helper function to generate random div ids. This is useful for embedding
    HTML into ipython notebooks."""
    chars = list(string.ascii_uppercase)
    return ''.join(np.random.choice(chars, size, replace=True))


def make_html(data_dict):
	lib_path = pkg_resources.resource_filename(__name__, "build/pipelineVis.js")
	bundle = open(lib_path).read()
	html_all = """
	<html>
	<head>
	</head>
	<body>
	    <script>
	    {bundle}
	    </script>
	    <div id="{id}">
	    </div>
	    <script>
	        pipelineVis.renderPipelineMatrixBundle("#{id}", {data_dict});
	    </script>
	</body>
	</html>
	""".format(bundle=bundle, id=id_generator(), data_dict=json.dumps(data_dict))
	return html_all

def extract_primitive_names(pipeline):
    return [s['primitive']['python_path'] for s in pipeline['steps']]

def extract_module_matrix(pipelines):
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
    return np.array(scores)

def transform_module_type(module_type):
    map = {
        'feature_extraction': 'Feature Extraction',
        'learner': 'Classification',
        'normalization': 'Preprocessing',
        'feature_construction': 'Feature Extraction',
        'classification': 'Classification',
        'data_transformation': 'Preprocessing',
        'schema_discovery': 'Preprocessing',
        'data_preprocessing': 'Preprocessing',
        'data_cleaning': 'Preprocessing',
        'regression': 'Regression',
        'operator': 'Operator',
        'feature_selection': 'Feature Extraction'
    }
    if module_type in map:
        return map[module_type]
    else:
        return module_type


def compute_diff_score(feature_idx, coefs, scores):
    idx_used = np.where(coefs[:, feature_idx] == 1)[0]
    idx_unused = np.where(coefs[:, feature_idx] == 0)[0]
    if len(idx_used) == len(scores):
        return 0
    return np.mean(scores[idx_used]) - np.mean(scores[idx_unused])

def extract_primitive_info(pipelines, enet_alpha, enet_l1):
    pipelines = sorted(pipelines, key=lambda x: x['scores'][0]['normalized'], reverse=True)
    module_matrix, module_names = extract_module_matrix(pipelines)
    scores = extract_scores(pipelines)
    meanDiff = [compute_diff_score(i, module_matrix, scores) for  i in range(module_matrix.shape[1])]
    mean_score = np.mean(meanDiff)
    module_importances = {}
    for idx, module_name in enumerate(module_names):
        module_importances[module_name] = meanDiff[idx]
    infos = {}
    module_types = set()
    for pipeline in pipelines:
        for step in pipeline['steps']:
            python_path = step['primitive']['python_path']
            if python_path in infos:
                continue
            split = python_path.split(".")
            module_desc = step['primitive']['name']
            module_type = transform_module_type(split[2])
            module_types.add(module_type)
            module_name = split[3]
            module_importance = module_importances[python_path]
            infos[python_path] = {
                "module_desc": module_desc,
                "module_type": module_type,
                "module_name": module_name,
                "module_importance": module_importance
            }
    return infos, module_types, mean_score

def tsp_sort (pipelines):
    def extract_primitives(p):
        primitives = set()
        for module in p['steps']:
            module_id = '.'.join(module['primitive']['python_path'].split('.')[2:])
            primitives.add(module_id)
        return primitives

    def pipeline_jaccard(p1, p2):
        s1 = extract_primitives(p1)
        s2 = extract_primitives(p2)
        return len(s1 & s2) / len(s1 | s2)

    def jaccard_matrix(pipelines):
        n = len(pipelines)
        matrix = np.zeros([n, n])
        for i in range(n-1):
            for j in range(i+1, n):
                matrix[i, j] = pipeline_jaccard(pipelines[i], pipelines[j])
        matrix += matrix.T
        matrix += np.eye(n)
        return matrix

    J = jaccard_matrix(pipelines)
    return solve_tsp(J)

def prepare_data_pipeline_matrix(pipelines, enet_alpha=0.001, enet_l1=0.1):
    info, module_types, mean_score = extract_primitive_info(pipelines, enet_alpha=enet_alpha, enet_l1=enet_l1)
    similarity_sort = tsp_sort(pipelines)
    for idx, pipeline in enumerate(pipelines):
        pipeline['tsp_sort'] = similarity_sort[idx]

    data = {
        "infos": info,
        "pipelines": pipelines,
        "module_types": list(module_types),
        "mean_score": mean_score,
        "module_type_order": ["Preprocessing", "Feature Extraction", "Operator", "Regression", "Classification"],
    }
    return data


def plot_pipeline_matrix(data_dict):
    from IPython.core.display import display, HTML
    html_all = make_html(data_dict)
    display(HTML(html_all))
