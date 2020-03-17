import networkx as nx
import numpy as np
from collections import defaultdict

def node_type(g, node):
    node = g.nodes[node]
    path_split = node['data'][0]['python_path'].split('.')
    if (len(path_split) > 2):
        return path_split[2]
    else:
        return node['data'][0]['python_path']

def compute_edge_type(g, edge):
    return '.'.join([node_type(g, edge[0]), node_type(g, edge[1])])

def create_pairwise_conn_graph(g1, g2):
    PCG = nx.DiGraph()
    for edge_g1 in g1.edges:
        for edge_g2 in g2.edges:
            type_edge_g1 = compute_edge_type(g1, edge_g1)
            type_edge_g2 = compute_edge_type(g2, edge_g2)
            if (type_edge_g1 == type_edge_g2): # edge the same type
                s1, d1 = edge_g1
                s2, d2 = edge_g2
                PCG.add_edge((s1, s2), (d1, d2), edge_type = type_edge_g1)
                PCG.add_edge((d1, d2), (s1, s2), edge_type = type_edge_g1)
    return PCG

def transform_induced_propagation_graph(pcg):
    edges = pcg.edges(data=True)
    edge_dict = defaultdict(lambda : defaultdict(lambda: []))
    # creating edge_dict information
    for edge in edges:
        n1 = edge[0]
        n2 = edge[1]
        data = edge[2]
        edge_type=data['edge_type']
        edge_dict[n1][edge_type].append(edge)
    
    edge_weight_map = {}
    
    for node in pcg.nodes:
        for edge_type in edge_dict[node]:
            n_edges_same_type = len(edge_dict[node][edge_type])
            weight = 1/n_edges_same_type
            for edge in edge_dict[node][edge_type]:
                edge_weight_map[edge[:2]] = weight
    nx.set_edge_attributes(pcg, edge_weight_map, 'weight')
    return pcg

def similarity_flooding(similarity_matrix, g1, g2, alpha = 0.01, n_iter = 100):
    pcg = create_pairwise_conn_graph(g1, g2)
    ipg = transform_induced_propagation_graph(pcg)
    g1_node_map = {node:idx for idx, node in enumerate(g1.nodes)}
    g2_node_map = {node:idx for idx, node in enumerate(g2.nodes)}
    adj = nx.adjacency_matrix(pcg, weight='weight').todense()
    
    #setting sim weights to ipg graph
    for node in ipg.nodes:
        g1_idx = g1_node_map[node[0]]
        g2_idx = g2_node_map[node[1]]
        ipg.nodes[node]['similarity'] = similarity_matrix[g1_idx, g2_idx]
    
    #creating similarity vector
    similarity_vector = np.reshape(np.array([node[1]['similarity'] for node in ipg.nodes(data=True)]), [-1,1])
    similarity_vector = similarity_vector / np.max(similarity_vector)
    for it in range(n_iter):
        similarity_vector = alpha * np.dot(adj, similarity_vector) + (1-alpha) * similarity_vector
        similarity_vector = similarity_vector / np.max(similarity_vector)
    
    #retrieving sim weights to similarity_matrix
    for node in ipg.nodes:
        g1_idx = g1_node_map[node[0]]
        g2_idx = g2_node_map[node[1]]
        similarity_matrix[g1_idx, g2_idx] = ipg.nodes[node]['similarity']
    
    return similarity_matrix

