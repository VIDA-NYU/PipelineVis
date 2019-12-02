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


export const constants = {
  sortModuleBy: {
    importance: 'IMPORTANCE',
    moduleType: 'MODULE_TYPE'
  },
  pipelineNameWidth: 200,
  moduleNameHeight: 150,
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