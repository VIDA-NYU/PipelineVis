from ._plot_pipeline_node_link import plot_pipeline_node_link, plot_merged_pipeline
from ._plot_pipeline_matrix import plot_pipeline_matrix, prepare_data_pipeline_matrix, merge_graphs_comm_api
from ._graph_matching import *
from ._helpers import find_pipeline_digest
get_ipython().kernel.comm_manager.register_target('merge_graphs_comm_api', merge_graphs_comm_api)