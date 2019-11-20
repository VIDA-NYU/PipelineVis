import {select, selectAll} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent, range} from "d3-array";
import {schemePaired} from "d3-scale-chromatic";

export function plotPipelineMatrix(ref, data){
  const constants = {
    pipelineNameWidth: 200,
    moduleNameHeight: 150,
    cellWidth: 13,
    cellHeight: 13,
    pipelineScoreWidth: 200,
    moduleImportanceHeight: 200,
    margin: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10,
    }
  };


  const {infos, pipelines, module_types: moduleTypes} = data;
  const moduleNames = Object.keys(infos);
  const svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
    constants.margin.left + constants.margin.right;
  const svgHeight = constants.moduleImportanceHeight + pipelines.length * constants.cellHeight + constants.moduleNameHeight +
    constants.margin.top + constants.margin.bottom;

  const div = select(ref);
  const svg = div
    .selectAll("svg")
    .data([1])
    .enter()
    .append("svg")
    .attr("id", "pipeline_matrix_svg")
    .style("width", svgWidth + "px")
    .style("height", svgHeight + "px");

  const colScale = scaleBand()
    .domain(moduleNames)
    .range([0, moduleNames.length * constants.cellWidth ])
    .paddingInner(0)
    .paddingOuter(0);

  const rowScale = scaleBand()
    .domain(range(pipelines.length))
    .range([0, pipelines.length * constants.cellHeight])
    .paddingInner(0)
    .paddingOuter(0);

  const bandOver2  = rowScale.bandwidth()/2;

  const moduleColorScale = scaleOrdinal(schemePaired);


  let pipeline_steps = [];

  pipelines.forEach((pipeline, pipelineID) => {
    pipeline['steps'].forEach( (step) => {
      const pythonPath = step.primitive.python_path;
      pipeline_steps.push({
        pythonPath,
        pipelineID,
      })
    });
  });

  const guideLinesGroup = svg
    .selectAll("#rowGuideLinesGroup")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "rowGuideLinesGroup")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth}, 
      ${constants.margin.top + constants.moduleNameHeight})`);

  guideLinesGroup
    .selectAll(".row")
    .data(pipelines)
    .enter()
    .append("line")
    .attr("class", "row")
    .attr("x1", 0)
    .attr("y1", (_, idx) => rowScale(idx) + bandOver2)
    .attr("x2", constants.cellWidth * moduleNames.length)
    .attr("y2", (_, idx) => rowScale(idx) + bandOver2)
    .style("stroke", "#bababa")
    .style("stroke-width", 1)

  guideLinesGroup
    .selectAll(".col")
    .data(moduleNames)
    .enter()
    .append("line")
    .attr("class", "col")
    .attr("x1", (x)=>colScale(x) + bandOver2)
    .attr("y1", 0)
    .attr("x2", (x)=>colScale(x) + bandOver2)
    .attr("y2", constants.cellHeight * pipelines.length)
    .style("stroke", "#bababa")
    .style("stroke-width", 1);

  const moduleDots = svg.selectAll("#module_dots")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "module_dots")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth}, 
      ${constants.margin.top + constants.moduleNameHeight})`);

  moduleDots
    .selectAll("circle")
    .data(pipeline_steps)
    .enter()
    .append("circle")
    .attr("cx", x=>colScale(x.pythonPath) + bandOver2)
    .attr("cy", x=>rowScale(x.pipelineID) + bandOver2)
    .attr("r", 5)
    .style("fill", x=>moduleColorScale(infos[x.pythonPath].module_type));

  const moduleNameLabels =  svg.selectAll("#module_names")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "module_names")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth}, 
      ${constants.margin.top})`);

  moduleNameLabels
    .selectAll("text")
    .data(moduleNames)
    .enter()
    .append("text")
    .text(x=>infos[x]['module_name'])
    .attr("transform", x => `translate(${colScale(x) + bandOver2}, ${constants.moduleNameHeight - 5}) rotate(-45)`)
    .style("fill", x=>moduleColorScale(infos[x].module_type));


  const scoreScale = scaleLinear()
    .domain(extent(pipelines, x=>x["scores"][0]["value"]))
    .range([0, constants.pipelineScoreWidth]);

  const importanceScale = scaleLinear()
    .domain(extent(moduleNames, x=>infos[x]["module_importance"]))
    .range([0, constants.moduleImportanceHeight]);

  const pipelineScoreBars = svg
    .selectAll("#pipeline_score_bars")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "pipeline_score_bars")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth},
    ${constants.margin.top + constants.moduleNameHeight})`);

  pipelineScoreBars
    .selectAll("rect")
    .data(pipelines)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (x, idx)=>rowScale(idx) + 3)
    .attr("width", (x) => scoreScale(x["scores"][0]["value"]))
    .attr("height", rowScale.bandwidth() - 4)
    .style("fill", "#bababa");

  const moduleImportanceBars = svg
    .selectAll("#module_importance_bars")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "module_importance_bars")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth },
    ${constants.margin.top + constants.moduleNameHeight + pipelines.length * constants.cellHeight})`);

  moduleImportanceBars
    .selectAll("rect")
    .data(moduleNames)
    .enter()
    .append("rect")
    .attr("x", x => colScale(x) + 3)
    .attr("y", 0)
    .attr("width", colScale.bandwidth() - 3)
    .attr("height", x=>importanceScale(infos[x]["module_importance"]))
    .style("fill", "#bababa");

  const legendModuleType = svg
    .selectAll("#legend_module_type")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "legend_module_type")
    .attr("transform", `translate(${constants.margin.left}, ${constants.margin.top})`);

  const lengendRowGroup = legendModuleType
    .selectAll("g")
    .data(moduleTypes)
    .enter()
    .append("g")
    .attr("transform", (x, idx)=>`translate(0, ${idx*14})`)
    .attr("data", x=>x);

  lengendRowGroup
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .style("fill", x=>moduleColorScale(x));

  lengendRowGroup
    .append("text")
    .attr("x", 14)
    .attr("y", 10)
    .text(x=>x);
}