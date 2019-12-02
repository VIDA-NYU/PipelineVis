import pkg_resources
import string
import numpy as np
import json
from scipy import optimize


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
    return scores

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


def extract_primitive_info(pipelines):
    from sklearn.linear_model import ElasticNet
    pipelines = sorted(pipelines, key=lambda x: x['scores'][0]['normalized'], reverse=True)
    module_matrix, module_names = extract_module_matrix(pipelines)
    scores = extract_scores(pipelines)
    #coef, res = optimize.nnls(module_matrix, scores)
    net = ElasticNet(alpha = 0.001, l1_ratio=0.1, positive=True)
    net.fit(module_matrix, scores)
    coef = net.coef_
    module_importances = {}
    for idx, module_name in enumerate(module_names):
        module_importances[module_name] = coef[idx]
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
    return infos, module_types

def prepare_data_pipeline_matrix(pipelines):
    info, module_types = extract_primitive_info(pipelines)
    data = {
        "infos": info,
        "pipelines": pipelines,
        "module_types": list(module_types),
        "module_type_order": ["Preprocessing", "Feature Extraction", "Operator", "Regression", "Classification"],
    }
    return data


def plot_pipeline_matrix(data_dict):
    from IPython.core.display import display, HTML
    html_all = make_html(data_dict)
    display(HTML(html_all))
