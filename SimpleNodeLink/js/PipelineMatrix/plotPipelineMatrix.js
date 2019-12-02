import "d3-selection";
import {select, event, mouse} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent, range} from "d3-array";
import {schemeCategory10} from "d3-scale-chromatic";
import {constants} from "../helpers";

export function plotPipelineMatrix(ref, data, onClick, sortColumnBy=constants.sortModuleBy.moduleType){
  const {infos, pipelines, module_types: moduleTypes, module_type_order: moduleTypeOrder} = data;
  const moduleNames = Object.keys(infos);

  const moduleTypeOrderMap = {};
  moduleTypeOrder.forEach((x, idx) => {moduleTypeOrderMap[x] = idx;});

  if (sortColumnBy === constants.sortModuleBy.importance) {
    moduleNames.sort((a,b) => infos[b]['module_importance'] - infos[a]['module_importance']);
  } else if (sortColumnBy === constants.sortModuleBy.moduleType) {
    console.log("sorting by moduleType");
    moduleNames.sort((a,b) => infos[b]['module_importance'] - infos[a]['module_importance']);
    moduleNames.sort((a,b) => moduleTypeOrderMap[infos[a]['module_type']] - moduleTypeOrderMap[infos[b]['module_type']]);
  }

  pipelines.sort((a,b) => b["scores"][0]["value"] - a["scores"][0]["value"]);
  const svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
    constants.margin.left + constants.margin.right;
  const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight +
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

  const importanceScale = scaleLinear()
    .domain(extent(moduleNames, x=>infos[x]["module_importance"]))
    .range([0, constants.moduleNameHeight]);


  const bandOver2  = rowScale.bandwidth()/2;

  const moduleColorScale = scaleOrdinal(schemeCategory10);


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
    .style("stroke-width", 1);

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

  const moduleImportanceBars = svg
    .selectAll("#module_importance_bars")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "module_importance_bars")
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth },
    ${constants.margin.top})`);

  moduleImportanceBars
    .selectAll("rect")
    .data(moduleNames)
    .enter()
    .append("rect")
    .attr("x", x => colScale(x) + 3)
    .attr("y", x=>constants.moduleNameHeight - importanceScale(infos[x]["module_importance"]))
    .attr("width", colScale.bandwidth() - 3)
    .attr("height", x=>importanceScale(infos[x]["module_importance"]))
    .style("fill", "#bababa");


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
    .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth()}, ${constants.moduleNameHeight}) rotate(-90)`)
    .style("fill", x=>moduleColorScale(infos[x].module_type));


  const scoreScale = scaleLinear()
    .domain(extent(pipelines, x=>x["scores"][0]["value"]))
    .range([0, constants.pipelineScoreWidth]);


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

  pipelineScoreBars
    .selectAll("text")
    .data(pipelines)
    .enter()
    .append("text")
    .attr("x", constants.pipelineScoreWidth)
    .attr("y", (x, idx)=>rowScale(idx) + rowScale.bandwidth())
    .attr("text-anchor", "end")
    .text(x=>x["scores"][0]["value"].toFixed(2))
    .style("fill", "#6b6b6b");

  const legendModuleType = svg
    .selectAll("#legend_module_type")
    .data([1])
    .enter()
    .append("g")
    .attr("id", "legend_module_type")
    .attr("transform", `translate(${constants.margin.left}, ${constants.margin.top})`);

  const lengendRowGroup = legendModuleType
    .selectAll("g")
    .data(moduleTypeOrder)
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
    .text(x=>x)
    .style("fill", "#9a9a9a");

  const legendPipelinePerformance = svg
    .selectAll("#legend_pipeline_performance")
    .data([1])
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length + constants.pipelineScoreWidth)
    .attr("y", constants.margin.top + constants.moduleNameHeight - 5)
    .text(pipelines[0]["scores"][0]["metric"]["metric"])
    .style("fill", "#9a9a9a");


  const left = constants.margin.left + constants.pipelineNameWidth,
    top = constants.margin.top + constants.moduleNameHeight,
    right = constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth,
    bottom = constants.margin.top + constants.moduleNameHeight + pipelines.length * constants.cellHeight;

  svg
    .append("rect")
    .attr("id", "highlight_row")
    .attr("x", left)
    .attr("width", right-left)
    .attr("height", rowScale.bandwidth())
    .style("fill","#00000000");

  svg
    .append("rect")
    .attr("id", "highlight_col")
    .attr("y", top)
    .attr("height", bottom-top)
    .attr("width", colScale.bandwidth())
    .style("fill","#00000000");

  const highlightColor = "#CCCCCC44"

  svg.on("mousemove", function(){
    const mGlobal = mouse(this);

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top  && mGlobal[1] <= bottom) {
      //const localX = colScale.invert(mGlobal[0]),
      //  localY = rowScale.invert(mGlobal[1]);
      const pipelineIdx = Math.floor((mGlobal[1] - top)/constants.cellHeight);
      const colIdx = Math.floor((mGlobal[0] - left)/constants.cellHeight);
      const moduleName = moduleNames[colIdx];

      svg
        .select("#highlight_row")
        .attr("y", rowScale(pipelineIdx) + top)
        .style("fill",highlightColor);

      svg
        .select("#highlight_col")
        .attr("x", colScale(moduleName) + left)
        .style("fill",highlightColor);
    }else{
      svg
        .select("#highlight_row")
        .style("fill","#00000000");

      svg
        .select("#highlight_col")
        .style("fill","#00000000");

    }
  });

  svg.on("click", function() {
    const mGlobal = mouse(this);

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom) {
      //const localX = colScale.invert(mGlobal[0]),
      //  localY = rowScale.invert(mGlobal[1]);
      const pipelineIdx = Math.floor((mGlobal[1] - top) / constants.cellHeight);
      const colIdx = Math.floor((mGlobal[0] - left) / constants.cellHeight);
      const moduleName = moduleNames[colIdx];
      onClick(pipelines[pipelineIdx]);
    }
  });

}