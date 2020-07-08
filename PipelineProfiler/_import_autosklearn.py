import numpy as np

class DefaultOrder:
    def __init__(self, order):
        self.order_map = {}
        for idx, elem in enumerate(order):
            self.order_map[elem] = idx
    def __call__(self, elem):
        if elem not in self.order_map:
            self.order_map[elem] = len(self.order_map)
        return self.order_map[elem]

def find_metric_name(automl):
    try:
        statistics = automl.sprint_statistics()
        lines = statistics.split("\n")
        my_line = list(filter(lambda x: x.upper().find("METRIC") > -1, lines))[0]
        metric = my_line.split(":")[1].strip().upper()
        return metric
    except Exception as e:
        return "METRIC"

def find_ensemble_weights(all_params, models_with_weights):
    weights = np.zeros(len(all_params))
    try:
      for idx, param in enumerate(all_params):
          for weight, pipeline in models_with_weights:
              weighted_param = pipeline.config.get_dictionary()
              if param == weighted_param:
                  weights[idx] = weight
                  break
    except Exception:
        pass
    return weights

def import_autosklearn(automl, source='auto-sklearn'):
    cv_results = automl.cv_results_
    weights = find_ensemble_weights(automl.cv_results_['params'], automl.get_models_with_weights())
    node_order = DefaultOrder(['balancing', 'data_preprocessing', 'feature_preprocessor','classifier', 'regressor'])
    n_models = len(cv_results['mean_test_score'])
    pipelines = []
    metric_name = find_metric_name(automl)
    for i in range(n_models):
        # Computing auxiliary pipeline structure
        struct = {}
        for key in cv_results['params'][i]:
            split = key.split(":")
            if split[0] == 'balancing' and split[1] == 'strategy':
                if cv_results['params'][i][key] != 'none':
                    struct['balancing'] = {'class_balancing': {'strategy': cv_results['params'][i][key]}}
                continue
            if split[1] == '__choice__':
                continue
            module_type = split[0]
            if module_type not in struct:
                struct[module_type] = {}    
            module_name = split[1]
            if module_name not in struct[module_type]:
                struct[module_type][module_name] = {}
            module_param = '_'.join(filter(lambda x: x != '__choice__', split[2:]))
            struct[module_type][module_name][module_param] = cv_results['params'][i][key]
        ordered_types = struct.keys()
        ordered_types = sorted(ordered_types, key=lambda x: node_order(x))

        # Creating pipeline graph
        pipeline = {
            'inputs': [{'name': 'input dataset'}],
            'steps': [],
            'scores': [{
                'metric': {'metric': metric_name, 'params': {'pos_label': '1'}},
                'normalized': cv_results['mean_test_score'][i],
                'value': cv_results['mean_test_score'][i],
            },
            {
                'metric': {'metric': 'ENSEMBLE WEIGHT', 'params': {'pos_label': '2'}},
                'normalized': weights[i],
                'value': weights[i]
            },{
                'metric': {'metric': 'MEAN FIT TIME', 'params': {'pos_label': '3'}},
                'normalized': cv_results['mean_fit_time'][i],
                'value': cv_results['mean_fit_time'][i],
            }],
            'pipeline_source': {'name': source},
            'pipeline_digest': '{}'.format(i),
        }
        prev_list = ['inputs.0']
        cur_step_idx = 0
        for module_type in ordered_types:
            new_prev_list = []
            modules = struct[module_type]
            for module in modules:
                step_ref = 'steps.{}.produce'.format(cur_step_idx)
                cur_step_idx += 1
                new_prev_list.append(step_ref)
                step = {
                    'primitive': {'python_path':'auto_sklearn.primitives.{}.{}'.format(module_type, module), 'name': module},
                    'arguments':{},
                    'outputs': [{'id': 'produce'}],
                    'reference': {'type': 'CONTAINER', 'data': step_ref},
                    'hyperparams': {}
                }
                for param in struct[module_type][module]:
                    step['hyperparams'][param] = {
                        'type': 'VALUE',
                        'data': struct[module_type][module][param]
                    }                
                for idx, prev in enumerate(prev_list):
                    cur_argument_idx = 'input{}'.format(idx)
                    step['arguments'][cur_argument_idx] = {
                        'data': prev
                    }
                pipeline['steps'].append(step)
            prev_list = new_prev_list
        pipeline['outputs'] = []
        for prev in prev_list:
            pipeline['outputs'].append({'data': prev})        
        pipelines.append(pipeline)
    return pipelines

def import_autosklearn_test_data(automl, test_X, test_y, metric_eval, source='auto-sklearn'):
    node_order = DefaultOrder(['balancing', 'data_preprocessing', 'feature_preprocessor','classifier', 'regressor'])
    models_with_weights = automl.get_models_with_weights()
    weights = []
    models = []
    for weight, model in models_with_weights:
        weights.append(weight)
        models.append(model)
    n_models = len(models)
    pipelines = []
    for i in range(n_models):
        # Computing auxiliary pipeline structure
        config = models[i].config.get_dictionary()
        struct = {}
        for key in config:
            split = key.split(":")
            if split[0] == 'balancing' and split[1] == 'strategy':
                if config[key] != 'none':
                    struct['balancing'] = {'class_balancing': {'strategy': config[key]}}
                continue
            if split[1] == '__choice__':
                continue
            module_type = split[0]
            if module_type not in struct:
                struct[module_type] = {}
            module_name = split[1]
            if module_name not in struct[module_type]:
                struct[module_type][module_name] = {}
            module_param = '_'.join(filter(lambda x: x != '__choice__', split[2:]))
            struct[module_type][module_name][module_param] = config[key]
        ordered_types = struct.keys()
        ordered_types = sorted(ordered_types, key=lambda x: node_order(x))

        # Computing score
        pred_y = models[i].predict(test_X)
        score = metric_eval(test_y, pred_y)

        # Creating pipeline graph
        pipeline = {
            'inputs': [{'name': 'input dataset'}],
            'steps': [],
            'scores': [{
                'metric': {'metric': str(metric_eval).capitalize(), 'params': {'pos_label': '1'}},
                'normalized': score,
                'value': score,
            },
            {
                'metric': {'metric': 'Ensemble Weight', 'params': {'pos_label': '2'}},
                'normalized': weights[i],
                'value': weights[i]
            }],
            'pipeline_source': {'name': source},
            'pipeline_digest': '{}'.format(i),
        }
        prev_list = ['inputs.0']
        cur_step_idx = 0
        for module_type in ordered_types:
            new_prev_list = []
            modules = struct[module_type]
            for module in modules:
                step_ref = 'steps.{}.produce'.format(cur_step_idx)
                cur_step_idx += 1
                new_prev_list.append(step_ref)
                step = {
                    'primitive': {'python_path':'auto_sklearn.primitives.{}.{}'.format(module_type, module), 'name': module},
                    'arguments':{},
                    'outputs': [{'id': 'produce'}],
                    'reference': {'type': 'CONTAINER', 'data': step_ref},
                    'hyperparams': {}
                }
                for param in struct[module_type][module]:
                    step['hyperparams'][param] = {
                        'type': 'VALUE',
                        'data': struct[module_type][module][param]
                    }
                for idx, prev in enumerate(prev_list):
                    cur_argument_idx = 'input{}'.format(idx)
                    step['arguments'][cur_argument_idx] = {
                        'data': prev
                    }
                pipeline['steps'].append(step)
            prev_list = new_prev_list
        pipeline['outputs'] = []
        for prev in prev_list:
            pipeline['outputs'].append({'data': prev})
        pipelines.append(pipeline)
    return pipelines