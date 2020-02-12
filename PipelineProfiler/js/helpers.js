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
          const hValue = JSON.stringify(step['hyperparams'][paramName]['data']);

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



function extractScores (pipelines, scoreRequest) { // scoreRequest: {type: constants.scoreRequest, name: str}
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

function computePrimitiveImportance(pipelinePrimitiveLookup, scores, primitive) {
  let meanScoreUsing = 0;
  let meanScoreNotUsing = 0;
  let nUsing = 0;
  let nNotUsing = 0;
  pipelinePrimitiveLookup.forEach((hash, idx) => {
    if (primitive in hash) {
      meanScoreUsing += scores[idx];
      nUsing += 1;
    } else {
      meanScoreNotUsing += scores[idx];
      nNotUsing += 1
    }
  });
  if (nUsing === scores.length || nNotUsing === scores.length) {
    return 0;
  }
  meanScoreUsing =  meanScoreUsing / nUsing;
  meanScoreNotUsing = meanScoreNotUsing / nNotUsing;
  return meanScoreUsing - meanScoreNotUsing;
}

export function computePrimitiveImportances(infos, pipelines, scoreRequest) {
  const primitiveNames = Object.keys(infos);
  const scores = extractScores(pipelines, scoreRequest);
  const hashTable = computePipelinePrimitiveHashTable(pipelines);
  return primitiveNames.map(primitiveName => computePrimitiveImportance(hashTable, scores, primitiveName));
}

export function extractMetrics(pipelines) {
  return pipelines[0]['scores'].map(score => score['metric']['metric']);
}

export const constants = {
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
  pipelineNameWidth: 200,
  moduleImportanceHeight: 100,
  moduleNameHeight: 150,
  hyperparamsHeight: 100,
  cellWidth: 13,
  cellHeight: 13,
  pipelineScoreWidth: 200,
  margin: {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  }
};