import pkg_resources
import string
import numpy as np
import json
from ._graph_matching import pipeline_to_graph, merge_multiple_graphs

def merge_graphs_comm_api(comm, open_msg): # this function is connected with the comm api on module load (__init__.py)
        # comm is the kernel Comm instance
        # open_msg is the comm_open message

        # Register handler for later messages
        @comm.on_msg
        def _recv(msg):
            # Use msg['content']['data'] for the data in the message
            pipelines = msg['content']['data']['pipelines']
            print("ZZZ merging {} graphs".format(len(pipelines)))
            graphs = [pipeline_to_graph(pipeline, pipeline['pipeline_digest']) for pipeline in pipelines]
            merged = merge_multiple_graphs(graphs)
            data_dict = nx.readwrite.json_graph.node_link_data(merged)
            comm.send({'merged': data_dict})

def id_generator(size=15):
    """Helper function to generate random div ids. This is useful for embedding
    HTML into ipython notebooks."""
    chars = list(string.ascii_uppercase)
    return ''.join(np.random.choice(chars, size, replace=True))


def make_html(data_dict, id):
	lib_path = pkg_resources.resource_filename(__name__, "build/pipelineVis.js")
	bundle = open(lib_path, "r", encoding="utf8").read()
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
	""".format(bundle=bundle, id=id, data_dict=json.dumps(data_dict))
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

def extract_primitive_info(pipelines, enet_alpha, enet_l1):
    pipelines = sorted(pipelines, key=lambda x: x['scores'][0]['normalized'], reverse=True)
    module_matrix, module_names = extract_module_matrix(pipelines)
    scores = extract_scores(pipelines)
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
            infos[python_path] = {
                "module_desc": module_desc,
                "module_type": module_type,
                "module_name": module_name,
            }
    return infos, module_types

def prepare_data_pipeline_matrix(pipelines, enet_alpha=0.001, enet_l1=0.1):
    info, module_types = extract_primitive_info(pipelines, enet_alpha=enet_alpha, enet_l1=enet_l1)
    data = {
        "infos": info,
        "pipelines": pipelines,
        "module_types": list(module_types),
    }
    return data


def plot_pipeline_matrix(data_dict):
    from IPython.core.display import display, HTML
    id = id_generator()
    html_all = make_html(data_dict, id)
    display(HTML(html_all))
