import { mean, median, deviation } from 'd3-array';
import {startCase} from "lodash";

export function createGettersSetters(container, parameterDict){
  let keys = Object.keys(parameterDict);
  for (let kid in keys){
    let key = keys[kid];
    container[key] = function(value){
      if (!arguments.length)
        return parameterDict[key];
      parameterDict[key] = value;
      return container;
    }
  }
}

export function extractHyperparams(infos, pipelines){
  const uniqueHyperparams = {};
  const hyperparams = {};
  /* ==============================================
     Hyperparams shape
     ==============================================
       hyperparams = {
        [module_name]: [
          { // pipeline_i
             [hyperparam_1]: [value_1],
             [hyperparam_2]: [value_2],
             ...
             [hyperparam_n]: [value_n],
          }
          ...
        ],
        [module_name]: [
          {

          }
        ]
       }

   */
  const moduleNames = Object.keys(infos);

  moduleNames.forEach(moduleName => {
    hyperparams[moduleName] = [];
  });

  pipelines.forEach((pipeline) => {
    pipeline.steps.forEach(step => {
      if ('hyperparams' in step) {
        const moduleName = step.primitive.python_path;
        const moduleParams = {};
        Object.keys(step['hyperparams']).forEach(paramName => {
          const hValue = JSON.stringify(step['hyperparams'][paramName]['data'], JSONStringReplacer);

          if (! (moduleName in uniqueHyperparams)) {
            uniqueHyperparams[moduleName] = {};
          }
          if (! (paramName in uniqueHyperparams[moduleName])) uniqueHyperparams[moduleName][paramName] = {};

          uniqueHyperparams[moduleName][paramName][hValue] = true;
          moduleParams[paramName] = hValue;

        });
        hyperparams[moduleName].push(moduleParams);
      }
    });
  });

  // Since not all hyperparams are used by all modules, normalizing hyperparam table
  moduleNames.forEach(moduleName => {
    hyperparams[moduleName].forEach(pipeline => {
      Object.keys(uniqueHyperparams[moduleName]).forEach(paramName => {
        if (!(paramName in pipeline)){
          pipeline[paramName] = 'default';
        }
      });
    });
  });
  return hyperparams;
}

function extractPrimitiveNames(pipeline){
  return pipeline['steps'].map(step => step['primitive']['python_path'])
}

function computePipelinePrimitiveHashTable(pipelines) {
  const pipelinePrimitiveLookup = [];
  for (const pipeline of pipelines) {
    const hash = {};
    for (const primitive of extractPrimitiveNames(pipeline)){
      hash[primitive] = true;
    }
    pipelinePrimitiveLookup.push(hash)
  }
  return pipelinePrimitiveLookup;
}


function JSONStringReplacer(key, value) {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value;
}


export function extractMetric (pipelines, scoreRequest) { // scoreRequest: {type: constants.scoreRequest, name: str}
  if (scoreRequest['type'] === constants.scoreRequest.TIME){
    return pipelines.map(p => (new Date(p['end']) - new Date(p['start'])) / 1000);
  } else if (scoreRequest['type'] === constants.scoreRequest.D3MSCORE) {
    let idxScore = -1;
    pipelines[0]['scores'].forEach((score, idx) => {
      if (score['metric']['metric'] === scoreRequest.name) {
        idxScore = idx;
      }
    });
    if (idxScore === -1) {
      return null;
    }
    return pipelines.map(p => p['scores'][idxScore]['value']);
  }
}

function computePrimitiveImportanceBiserialCorrelation(pipelinePrimitiveLookup, scores, primitive) {
  // using bisserial correlation of primitives and scores
  const used = [];
  const notUsed= [];

  pipelinePrimitiveLookup.forEach((hash, idx) => {
    if (primitive in hash){
      used.push(scores[idx]);
    } else {
      notUsed.push(scores[idx]);
    }
  });

  const meanUsed = mean(used);
  const meanNotUsed = mean(notUsed);

  const dev = deviation(scores);

  const n = scores.length;

  const corr = ((meanUsed - meanNotUsed)/dev) * Math.sqrt((used.length * notUsed.length) / (n * (n-1)));
  if (isFinite(corr)){
    return corr;
  } else {
    return 0;
  }
}

export function getPrimitiveLabel(python_path) {
  const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

  const path_parts = python_path.split('.');
  let name;
  if (path_parts.length > 3){
    name = path_parts[3];
    name = name.split("_").map(x=>capitalize(x)).join(" ")
  } else {
    name = python_path;
  }
  return name;
}

export function computePrimitiveImportances(infos, pipelines, scoreRequest) {
  const primitiveNames = Object.keys(infos);
  const scores = extractMetric(pipelines, scoreRequest);

  const hashTable = computePipelinePrimitiveHashTable(pipelines);
  const primitiveImportances = {};
  primitiveNames.forEach(name => {
    primitiveImportances[name] = computePrimitiveImportanceBiserialCorrelation(hashTable, scores, name);
  });
  return primitiveImportances;
}

export function extractMetricNames(pipelines) {
  return pipelines[0]['scores'].map(score => score['metric']['metric']);
}

/*
row['value'] = node.hyperparams[hyperparamName].data;
      while(true){
        if (row['value'] && typeof row['value'] === 'object' && 'value' in row['value']){
          row['value'] = row['value']['value']
        } else {
          break;
        }
      }
 */

function accessHyperparamValue(hyperparam) {
  let data = hyperparam.data;
  while(true){
    if (data && typeof data === 'object' && 'value' in data){
      data = data['value']
    } else {
      break;
    }
  }
  return JSON.stringify(data).replace(/"/g, '')
    .replace(/https:\/\/metadata.datadrivendiscovery.org\/types\//g, "");;
}

function createHyperparamTxtDesc(hyperparam, value){
  return `${hyperparam}: ${value}`;
}

export function computePrimitiveHyperparameterData(pipelines, pythonPath){
  let stepSamples = [];
  let unique_checker = {};
  let allHyperparamsHeader = {};

  pipelines.forEach(pipeline => {
    pipeline.steps.forEach(step => {
      const python_path = step.primitive.python_path;
      const pipeline_digest  = pipeline.pipeline_digest;
      if (python_path === pythonPath){
        if ('hyperparams' in step){
          Object.keys(step.hyperparams).forEach(hyperparamKey => {
            const value  = accessHyperparamValue(step.hyperparams[hyperparamKey]);
            const unique_key = pipeline_digest + hyperparamKey + value;
            const header_key = createHyperparamTxtDesc(hyperparamKey, value);
            allHyperparamsHeader[header_key] = true;
            if (!(unique_key in unique_checker)){
              stepSamples.push({
                pipeline_digest: pipeline_digest,
                hyperparam: hyperparamKey,
                value,
                unique_key,
                header_key,
              });
              unique_checker[unique_key] = true;
            }
          });
        }
      }
    });
  });
  let orderedHeader = Object.keys(allHyperparamsHeader);
  orderedHeader.sort();
  return {orderedHeader, stepSamples};
}

export function createHyperparamTableDataFromNode(node){
  const skipHyperparams = {};
  constants.skipHyperparameters.forEach(h => {
    skipHyperparams[h] = true;
  });
  const tableData = [];
  if ('hyperparams' in node) {
    for (const hyperparamName of Object.keys(node.hyperparams)) {
      if (!(hyperparamName in skipHyperparams)){
        let row = {};
        row['name'] = hyperparamName;
        row['value'] = accessHyperparamValue(node.hyperparams[hyperparamName]);
        tableData.push(row);
      }
    }
  }
  tableData.sort((a,b) => {
    if (a['name'] > b['name']) {
      return 1;
    } else if (a['name'] < b['name']) {
      return -1;
    } else {
      return 0;
    }
  });
  if (tableData.length === 0) {
    return null;
  }
  return tableData;
}

const moduleTypeOrder = [
  "Preprocessing",
  "NLP",
  "Feature Extraction",
  "Operator",
  "Regression",
  "Classification",
  "Time Series",
];

const moduleTypeOrderMap = {};

moduleTypeOrder.forEach((x, idx) => {
  moduleTypeOrderMap[x] = idx;
});

export const constants = {
  moduleTypeOrder,
  moduleTypeOrderMap,
  scoreRequest: {
    TIME: 'TIME',
    D3MSCORE: 'D3MSCORE'
  },
  sortModuleBy: {
    importance: 'MODULE_IMPORTANCE',
    moduleType: 'MODULE_TYPE'
  },
  sortPipelineBy: {
    pipeline_source: 'PIPELINE_SOURCE',
    pipeline_score: 'PIPELINE_SCORE',
  },
  pipelineNameWidth: 100,
  moduleImportanceHeight: 100,
  moduleNameHeight: 180,
  cellWidth: 15,
  cellHeight: 15,
  widthSeparatorPrimitiveHyperparam: 30,
  pipelineScoreWidth: 200,
  moduleTypeHeight: 20,
  margin: {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  },
  skipHyperparameters: ['use_inputs_columns', 'use_outputs_columns', 'exclude_inputs_columns', 'exclude_outputs_columns', 'return_result', 'return_semantic_type', 'use_semantic_types', 'add_index_columns', 'use_columns', 'exclude_columns', 'error_on_no_input', 'n_jobs', 'class_weight']
};