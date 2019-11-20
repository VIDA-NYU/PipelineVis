import {select, selectAll} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent, range} from "d3-array";
import {schemePaired} from "d3-scale-chromatic";

export function plotPipelineMatrix(ref, data){
  const constants = {
    pipelineNameWidth: 100,
    moduleNameHeight: 100,
    cellWidth: 12,
    cellHeight: 12,
    pipelineScoreWidth: 200,
    moduleImportanceHeight: 200,
    margin: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10,
    }
  };


  const {infos, pipelines} = data;
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
    .attr("cx", x=>colScale(x.pythonPath))
    .attr("cy", x=>rowScale(x.pipelineID))
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
    .attr("x", x=>colScale(x))
    .attr("y", 0)
    .style("writing-mode", "tb")
    .style("fill", x=>moduleColorScale(infos[x].module_type));


  const scoreScale = scaleLinear()
    .domain(extent(pipelines, x=>x["scores"][0]["value"]))
    .range([0, constants.pipelineScoreWidth]);

  const pipelineScoreBars = svg.selectAll("#pipeline_score_bars")
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
    .attr("y", (x, idx)=>rowScale(idx))
    .attr("width", (x, idx) => scoreScale(pipelines[idx]["scores"][0]["value"]))
    .attr("height", rowScale.bandwidth());
}