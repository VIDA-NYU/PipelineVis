import networkx as nx
import numpy as np
from scipy.optimize import linear_sum_assignment
from ._similarity_flooding import similarity_flooding

def graph_data_accessor(node, graph_name):
    if 'hyperparams' in node:
        hyperparams = node['hyperparams']
    else:
        hyperparams = {}
    return {
        'python_path': node['primitive']['python_path'],
        'hyperparams': hyperparams,
        'graph_name': graph_name,
        'node_name': node['primitive']['name']
    }

def pipeline_to_graph(pipeline, name=''):
    G = nx.DiGraph(name=name)
    # Adding input node
    G.add_node('inputs.0', data=[{'python_path': 'Input', 'node_name': 'Input', 'hyperparams': {}, 'graph_name': name}])
    # Adding all steps
    steps = pipeline['steps']
    for idx, step in enumerate(steps):
        step_key = 'steps.' + str(idx)
        G.add_node(step_key, data = [graph_data_accessor(step, name)])
        for argument_key in step['arguments']:
            arguments = step['arguments'][argument_key]['data']
            if not isinstance(arguments, list):
                arguments = [arguments]
            for argument in arguments:
                argument_key = '.'.join(argument.split(".")[:2])
                G.add_edge(argument_key, step_key)
    # Adding output node
    G.add_node('outputs.0', data=[{'python_path': 'Output', 'node_name': 'Output', 'hyperparams': {}, 'graph_name': name}])
    out_node_input = '.'.join(pipeline['outputs'][0]['data'].split(".")[:2])
    G.add_edge(out_node_input, 'outputs.0')
    return G

def python_path_similarity(python_path1, python_path2):
    if python_path1 == python_path2:
        return 1
    else:
        split1 = python_path1.split(".")
        split2 = python_path2.split(".")
        if len(split1) > 2 and len(split2) > 2:
            if split1[2] == split2[2]:
                return 0.5
            else:
                return 0
        else:
            return 0

def compute_node_similarity_matrix(g1, g2):
    similarity = np.zeros([len(g1.nodes), len(g2.nodes)])
    for idx_g1, n_g1 in enumerate(g1.nodes):
        for idx_g2, n_g2 in enumerate(g2.nodes):
            datas1 = g1.nodes[n_g1]['data']
            datas2 = g2.nodes[n_g2]['data']
            similarities = []
            for data1 in datas1: # Node can have multiple primitives. Computing the max average similarity
                for data2 in datas2:
                    python_path1 = data1['python_path']
                    python_path2 = data2['python_path']
                    path_similarity = python_path_similarity(python_path1, python_path2)
                    # small hack to consider "neighborhood" (TODO: replace similarity flooding)
                    n_g1_proc = '.'.join(n_g1.split(".")[-2:])
                    n_g2_proc = '.'.join(n_g2.split(".")[-2:])
                    if n_g1_proc == n_g2_proc:
                        path_similarity += 0.05
                    similarities.append(path_similarity)
            similarity[idx_g1, idx_g2] = np.mean(similarities)
    return similarity

def compute_edit_cost_matrix(similarity_matrix, add_cost, del_cost):
    INF = 1000
    # compute
    n_nodes_g1 = similarity_matrix.shape[0]
    n_nodes_g2 = similarity_matrix.shape[1]
    len_g1_plus_g2 = n_nodes_g1 + n_nodes_g2
    cost_matrix = np.zeros([len_g1_plus_g2, len_g1_plus_g2])
    # Substitution cost (top left) of transforming g2 into g1
    cost_matrix[:n_nodes_g1, :n_nodes_g2] = np.max(similarity_matrix) - similarity_matrix # cost = 1 - similarity
    # Addition cost (top right) of adding nodes from g1
    addition = INF * np.ones([n_nodes_g1, n_nodes_g1])
    np.fill_diagonal(addition, add_cost)
    cost_matrix[:n_nodes_g1, n_nodes_g2:] = addition
    # Deletion cost (bottom left) of removing nodes from g2
    deletion = INF * np.ones([n_nodes_g2, n_nodes_g2])
    np.fill_diagonal(deletion, del_cost)
    cost_matrix[n_nodes_g1:, :n_nodes_g2] = deletion
    return cost_matrix


def compute_node_equivalence(g1, g2):
    helper_graph = nx.union(g1, g2, rename=('g1-','g2-')) #nodes start with `rename` prefix. Used to check for cycles
    equivalence_g1 = {} # maps nodes from g1 to g2
    equivalence_g2 = {} # maps nodes from g2 to g1
    len_g1 = len(g1.nodes)
    len_g2 = len(g2.nodes)
    similarity_matrix = compute_node_similarity_matrix(g1, g2)
    try:
        similarity_matrix = similarity_flooding(similarity_matrix, g1, g2, alpha = 0.1, n_iter = 50)
    except Exception:
        print("Similarity flooding failed. PCG graph has no nodes or edges.")
    edit_cost_matrix = compute_edit_cost_matrix(similarity_matrix, 0.4, 0.4)
    rows, cols = linear_sum_assignment(edit_cost_matrix)
    nodes_g1 = list(g1.nodes)
    nodes_g2 = list(g2.nodes)
    for pairs in zip(rows, cols):
        if pairs[0] < len_g1 and pairs[1] < len_g2:
            # nodes are equivalent
            eq_g1 = nodes_g1[pairs[0]]
            eq_g2 = nodes_g2[pairs[1]]
            merged_helper = nx.algorithms.minors.contracted_nodes(helper_graph, 'g1-'+eq_g1, 'g2-'+eq_g2, self_loops=False)
            try:
                if 'g1-inputs.0' in merged_helper:
                    cycles = nx.algorithms.cycles.find_cycle(merged_helper, source = 'g1-inputs.0')
                if 'g2-inputs.0' in merged_helper:
                    cycles = nx.algorithms.cycles.find_cycle(merged_helper, source = 'g2-inputs.0')
            except nx.NetworkXNoCycle as n:
                equivalence_g2[eq_g2] = eq_g1
                equivalence_g1[eq_g1] = eq_g2
                helper_graph = merged_helper
    return equivalence_g1, equivalence_g2

def dict_append(dictionary, key, value):
    if key in dictionary:
        dictionary[key].append(value)
    else:
        dictionary[key] = [value]

def merge_graphs(g1, g2):
    equivalence_g1, equivalence_g2 = compute_node_equivalence(g1, g2)
    G = nx.DiGraph()
    # Adding g1 node data
    for node in g1.nodes:
        data = g1.nodes[node]["data"]
        if node not in equivalence_g1:
            node = "G1." + node
        G.add_node(node)
        G.nodes[node]["data"] = data

    # Adding g2 node data
    for node in g2.nodes:
        data = g2.nodes[node]["data"]
        if node not in equivalence_g2:
            node = "G2." + node
            G.add_node(node, data = data)
        else:
            node = equivalence_g2[node]
            G.nodes[node]["data"] = G.nodes[node]["data"] + data

    # Adding edges from g1
    for edge in g1.edges:
        source, dest = edge
        if source not in equivalence_g1:
            source = "G1." + source
        if dest not in equivalence_g1:
            dest = "G1." + dest
        G.add_edge(source, dest)

    # Merging edges from g2
    for edge in g2.edges:
        source, dest = edge
        if source not in equivalence_g2:
            source = "G2." + source
        else:
            source = equivalence_g2[source]
        if dest not in equivalence_g2:
            dest = "G2." + dest
        else:
            dest = equivalence_g2[dest]
        G.add_edge(source, dest)
    return G

def merge_multiple_graphs(graphs):
    merged = merge_graphs(graphs[0], graphs[1])
    for graph in graphs[2:]:
        merged = merge_graphs(merged, graph)
    return merged