import pkg_resources
import string
import numpy as np
import json


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
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
	</head>
	<body>
	    <script>
	    {bundle}
	    </script>
	    <div id="{id}">
	    </div>
	    <script>
	        pipelineVis.renderPipelineNodeLink("#{id}", {data_dict});
	    </script>
	</body>
	</html>
	""".format(bundle=bundle, id=id_generator(), data_dict=json.dumps(data_dict))
	return html_all

def plot_pipeline_node_link(data_dict):
    """Takes as input an array of model expl objects (mldiff.compute_exp_obj) and the dataset, and plots coocurring rules
    in the IPython cell."""
    from IPython.core.display import display, HTML
    html_all = make_html(data_dict)
    display(HTML(html_all))
