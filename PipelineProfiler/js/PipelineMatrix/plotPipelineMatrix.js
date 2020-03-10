import "d3-selection";
import {select, event, mouse} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent} from "d3-array";
import {schemeCategory10} from "d3-scale-chromatic";
import {constants, extractMetric} from "../helpers";
import "d3-transition";
import {axisLeft} from "d3-axis";

function initialCaptalize(txt) {
  return txt[0].toUpperCase();
}

export function computePipelineMatrixWidthHeight(pipelines, moduleNames, expandedPrimitiveData){
  let svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
    constants.margin.left + constants.margin.right;

  if (expandedPrimitiveData){
    svgWidth += expandedPrimitiveData.orderedHeader.length * constants.cellWidth;
  }

  const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight + constants.moduleImportanceHeight +
    constants.margin.top + constants.margin.bottom;

  return {svgWidth, svgHeight};
}

export function plotPipelineMatrix(ref,
                                   data,
                                   pipelines,
                                   moduleNames,
                                   importances,
                                   selectedPipelines,
                                   selectedPipelinesColorScale,
                                   onClick,
                                   onHover,
                                   onSelectExpandedPrimitive,
                                   expandedPrimitiveData,
                                   metricRequest) {

  const {infos, module_types: moduleTypes} = data;
  const {moduleTypeOrder}  = constants;
  const selectedScores = extractMetric(pipelines, metricRequest);
  const selectedScoresDigests = selectedScores.map((score, idx) => ({score, pipeline_digest: pipelines[idx].pipeline_digest}));

  const {svgWidth, svgHeight} = computePipelineMatrixWidthHeight(pipelines, moduleNames, expandedPrimitiveData);

  const svg = select(ref)
    .style("width", svgWidth + "px")
    .style("height", svgHeight + "px");

  const colScale = scaleBand()
    .domain(moduleNames)
    .range([0, moduleNames.length * constants.cellWidth])
    .paddingInner(0.0001)
    .paddingOuter(0);

  const rowScale = scaleBand()
    .domain(pipelines.map(x => x.pipeline_digest))
    .range([0, pipelines.length * constants.cellHeight])
    .paddingInner(0)
    .paddingOuter(0);

  const importanceDomain = extent(moduleNames, x => importances[x]);

  const halfImportanceDomain = Math.max(Math.abs(importanceDomain[0]), Math.abs(importanceDomain[1]));

  const importanceScale = scaleLinear()
    .domain([0, halfImportanceDomain])
    .range([0, constants.moduleImportanceHeight/2]);

  const importanceScaleVisible = scaleLinear() // Importance scale used in d3.axis
    .domain([-halfImportanceDomain, halfImportanceDomain])
    .range([constants.moduleImportanceHeight, 0]); // order is switched to put positive numbers on top

  const bandOver2 = rowScale.bandwidth() / 2;

  //const moduleColorScale = scaleOrdinal(schemeCategory10);

  let hyperparameterWidth = 0;

  if (expandedPrimitiveData) {
    hyperparameterWidth = expandedPrimitiveData.orderedHeader.length * constants.cellWidth;
  }

  /*moduleTypeOrder.forEach((x, idx) => {
    moduleColorScale(x);
  });*/


  let pipeline_steps = [];

  let deduplicateChecker = {};

  pipelines.forEach((pipeline) => {
    pipeline['steps'].forEach((step) => {
      const pythonPath = step.primitive.python_path;
      const pipelineID = pipeline.pipeline_digest;
      const key = pythonPath + pipelineID;
      if (!(key in deduplicateChecker)) {
        deduplicateChecker[key] = true;
        pipeline_steps.push({
          pythonPath,
          pipelineID,
          key
        });
      }
    });
  });

  const guideLinesGroup = svg
    .selectAll("#guideLinesGroup")
    .data([1])
    .join(
      enter => enter
        .append("g")
        .attr("id", "guideLinesGroup")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
      ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`),
      update => update
    );

  guideLinesGroup
    .selectAll(".row")
    .data(pipelines)
    .join(
      enter => enter
        .append("line")
        .attr("class", "row")
        .attr("x1", 0)
        .attr("y1", (x) => rowScale(x.pipeline_digest) + bandOver2)
        .attr("x2", constants.cellWidth * moduleNames.length)
        .attr("y2", (x) => rowScale(x.pipeline_digest) + bandOver2)
        .style("stroke", "#bababa")
        .style("stroke-width", 1)
    );

  guideLinesGroup
    .selectAll(".col")
    .data(moduleNames)
    .join(
      enter => enter
        .append("line")
        .attr("class", "col")
        .attr("x1", (x) => colScale(x) + bandOver2)
        .attr("y1", 0)
        .attr("x2", (x) => colScale(x) + bandOver2)
        .attr("y2", constants.cellHeight * pipelines.length)
        .style("stroke", "#bababa")
        .style("stroke-width", 1)
    );

  const t = svg.transition()
    .duration(750);

  const moduleDots = svg.selectAll("#gdots")
    .data([pipeline_steps])
    .join(
      enter => enter.append("g")
        .attr("id", "gdots")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
      ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`)
    );

  moduleDots
    .selectAll(".dot")
    .data(x => x, x => x.key)
    .join(
      enter => enter.append("circle")
        .attr("class", "dot")
        .attr("cx", x => colScale(x.pythonPath) + bandOver2)
        .attr("cy", x => rowScale(x.pipelineID) + bandOver2)
        .attr("r", 4)
        //.style("fill", x => moduleColorScale(infos[x.pythonPath].module_type)),
        .style("fill", "#0072ff33")
        .style("stroke", "#4a5670"),
      update => update
        .call(update => update.transition(t)
          .attr("cx", x => colScale(x.pythonPath) + bandOver2)
          .attr("cy", x => rowScale(x.pipelineID) + bandOver2)
        ));

  const moduleImportanceBars = svg
    .selectAll("#module_importance_bars")
    .data([moduleNames])
    .join(
      enter => enter
        .append("g")
        .attr("id", "module_importance_bars")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
      ${constants.margin.top + constants.moduleNameHeight})`)
    );

  const halfImportanceHeight = constants.moduleImportanceHeight / 2;

  moduleImportanceBars
    .selectAll("rect")
    .data(x => x, x => x) // loading data with identity function
    .join(
      enter => enter
        .append("rect")
        .attr("x", x => colScale(x) + 3)
        .attr("y", x => importances[x] > 0 ?
          halfImportanceHeight - importanceScale(importances[x])
          : halfImportanceHeight
        )
        .attr("width", colScale.bandwidth() - 3)
        .attr("height", x => importances[x] > 0 ?
          importanceScale(importances[x])
          : importanceScale(-importances[x])
        )
        .style("fill", "#bababa"),
      update => update
        .call(update => {
            return update.transition(t)
              .attr("x", x => colScale(x) + 3)
              .attr("y", x => importances[x] > 0 ?
                halfImportanceHeight - importanceScale(importances[x])
                : halfImportanceHeight
              )
              .attr("width", colScale.bandwidth() - 3)
              .attr("height", x => importances[x] > 0 ?
                importanceScale(importances[x])
                : importanceScale(-importances[x])
              )
              .style("fill", "#bababa")
          }
        )
    );

  let moduleImportanceAxis = svg.selectAll(".axisImportance")
    .data([1], x=>x)
    .join(
      enter => enter
        .append("g")
        .attr("class", "axisImportance")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
      ${constants.margin.top + constants.moduleNameHeight})`)
    );

  let axisObject = axisLeft()
    .scale(importanceScaleVisible);

  moduleImportanceAxis.call(axisObject);

  const moduleNameLabels = svg.selectAll("#module_names")
    .data([moduleNames])
    .join(
      enter => enter
        .append("g")
        .attr("id", "module_names")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
         ${constants.margin.top})`)
    );

  moduleNameLabels
    .selectAll("text")
    .data(x => x, x => x)
    .join(
      enter => enter
        .append("text")
        .text(x => `(${initialCaptalize(infos[x].module_type)}) ${infos[x]['module_name']}`)
        .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth()-5}, ${constants.moduleNameHeight}) rotate(-60)`)
        .style("fill", "#6e6e6e"),
        //.style("fill", x => moduleColorScale(infos[x].module_type)),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth()-5}, ${constants.moduleNameHeight}) rotate(-60)`)
        )
    ).on("click", (x)=>{
      onSelectExpandedPrimitive(x);
    });

  const scoreScale = scaleLinear()
    .domain(extent(selectedScores, x => x))
    .range([0, constants.pipelineScoreWidth]);

  const paddingHyperparamColsWidth = expandedPrimitiveData ? expandedPrimitiveData.orderedHeader.length * constants.cellWidth : 0;

  const pipelineScoreBars = svg
    .selectAll(".pipeline_score_bars")
    .data([selectedScoresDigests])
    .join(
      enter => enter
        .append("g")
        .attr("class", "pipeline_score_bars")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + paddingHyperparamColsWidth},
        ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`),
      update => update
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + paddingHyperparamColsWidth},
        ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`)
    );

  pipelineScoreBars
    .selectAll("rect")
    .data(x => x, x => x.pipeline_digest)
    .join(
      enter => enter
        .append("rect")
        .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        .attr("width", (x) => scoreScale(x.score))
        .attr("height", rowScale.bandwidth() - 4)
        .style("fill", "#bababa"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
          .attr("width", (x) => scoreScale(x.score))
          .attr("height", rowScale.bandwidth() - 4)
          .style("fill", "#bababa"),
        )
    );

  pipelineScoreBars
    .selectAll("text")
    .data(x => x, pipeline => pipeline.pipeline_digest)
    .join(
      enter => enter
        .append("text")
        .attr("transform", x => `translate(${constants.pipelineScoreWidth}, ${rowScale(x.pipeline_digest) + rowScale.bandwidth()})`)
        .attr("text-anchor", "end")
        .text(x => x.score.toFixed(2))
        .style("fill", "#6b6b6b"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(${constants.pipelineScoreWidth}, ${rowScale(x.pipeline_digest) + rowScale.bandwidth()})`)
          .attr("text-anchor", "end")
          .text(x => x.score.toFixed(2))
          .style("fill", "#6b6b6b"),
        )
    );

  const legendPipelineSourceGroup = svg
    .selectAll("#legendPipelineSourceGroup")
    .data([pipelines])
    .join(
      enter => enter
        .append("g")
        .attr("id", "legendPipelineSourceGroup")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth}, ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight + bandOver2})`)
    );

  legendPipelineSourceGroup
    .selectAll("text")
    .data(x => x, x => x.pipeline_digest)
    .join(
      enter => enter
        .append("text")
        .attr("text-anchor", "end")
        .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        .text(x => x.pipeline_source.name)
        .style("fill", "#6e6e6e"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        )
    );

  /*
  *
  * <PlottingHyperparameters>
  *
  * */

  if (expandedPrimitiveData) {
    const {orderedHeader, stepSamples} = expandedPrimitiveData;
    const expandedColScale = scaleBand()
      .domain(orderedHeader)
      .range([0, orderedHeader.length * constants.cellWidth])
      .paddingInner(0.0001)
      .paddingOuter(0);

    const hyperparamDots = svg.selectAll("#hyperdots")
      .data([stepSamples])
      .join(
        enter => enter.append("g")
          .attr("id", "hyperdots")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth},
      ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`)
      );


    const hyperparamsGuideLinesGroup = svg
      .selectAll("#hyperparamsGuideLinesGroup")
      .data([1])
      .join(
        enter => enter
          .append("g")
          .attr("id", "hyperparamsGuideLinesGroup")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth},
      ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`),
        update => update
      );

    hyperparamsGuideLinesGroup
      .selectAll(".row")
      .data(pipelines)
      .join(
        enter => enter
          .append("line")
          .attr("class", "row")
          .style("stroke", "#bababa")
          .style("stroke-width", 1)
      )
      .attr("x1", 0)
      .attr("y1", (x) => rowScale(x.pipeline_digest) + bandOver2)
      .attr("x2", constants.cellWidth * orderedHeader.length)
      .attr("y2", (x) => rowScale(x.pipeline_digest) + bandOver2);

    hyperparamsGuideLinesGroup
      .selectAll(".col")
      .data(orderedHeader)
      .join(
        enter => enter
          .append("line")
          .attr("class", "col")
          .style("stroke", "#bababa")
          .style("stroke-width", 1)
      )
      .attr("x1", (x) => expandedColScale(x) + bandOver2)
      .attr("y1", 0)
      .attr("x2", (x) => expandedColScale(x) + bandOver2)
      .attr("y2", constants.cellHeight * pipelines.length);


    hyperparamDots
      .selectAll(".dot")
      .data(x => x, x => x.unique_key)
      .join(
        enter => enter.append("circle")
          .attr("class", "dot")
          .attr("cx", x => expandedColScale(x.header_key) + bandOver2)
          .attr("cy", x => rowScale(x.pipeline_digest) + bandOver2)
          .attr("r", 4)
          .style("fill", "#0072ff33")
          .style("stroke", "#4a5670"),
        update => update
          .call(update => update.transition(t)
          .attr("cx", x => expandedColScale(x.header_key) + bandOver2)
          .attr("cy", x => rowScale(x.pipeline_digest) + bandOver2)
          ));

    const hyperparamsNameLabels = svg.selectAll("#hyperparam_names")
      .data([orderedHeader])
      .join(
        enter => enter
          .append("g")
          .attr("id", "hyperparam_names")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth},
         ${constants.margin.top})`)
      );

    hyperparamsNameLabels
      .selectAll("text")
      .data(x => x, x => x)
      .join(
        enter => enter
          .append("text")
          .text(x => x)
          .attr("transform", x => `translate(${expandedColScale(x) + expandedColScale.bandwidth()-5}, ${constants.moduleNameHeight}) rotate(-60)`)
          .style("fill", "#6e6e6e"),
      );

  }

  /*
  *
  * </PlottingHyperparameters>
  *
  * */


  const left = constants.margin.left + constants.pipelineNameWidth,
    top = constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight,
    right = constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth,
    bottom = constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight + pipelines.length * constants.cellHeight + constants.hyperparamsHeight;

  svg
    .selectAll("#highlight_row")
    .data([1])
    .join(
      enter => enter
        .append("rect")
        .attr("id", "highlight_row")
        .attr("x", left)
        .attr("height", rowScale.bandwidth())
        .style("fill", "#00000000")
    )
    .attr("width", right - left + constants.pipelineScoreWidth +hyperparameterWidth);


  svg
    .selectAll("#highlight_col")
    .data([1])
    .join(
      enter => enter
        .append("rect")
        .attr("id", "highlight_col")
        .attr("y", top - constants.moduleImportanceHeight)
        .attr("height", bottom - top + constants.moduleImportanceHeight)
        .attr("width", colScale.bandwidth())
        .style("fill", "#00000000")
    );

  const selectedDigests = selectedPipelines.map(pipeline => pipeline['pipeline_digest']);

  const selectedGroup = svg.selectAll(".selectedGroup")
    .data([selectedDigests], x=>"selectedGroup")
    .join(
      enter => enter
        .append("g")
        .attr("class", "selectedGroup")
    );

  selectedGroup.selectAll("rect")
    .data(x=>x, x=>x)
    .join(
      enter => enter
        .append("rect")
        .attr("x", left)
        .attr("y", digest => rowScale(digest) + top)
        .attr("width", right - left + hyperparameterWidth)
        .attr("height", rowScale.bandwidth())
        .style("fill", digest => selectedPipelinesColorScale(digest))
        .style("opacity", 0.3),
      update => update
        .attr("x", left)
        .attr("y", digest => rowScale(digest) + top)
        .attr("width", right - left + hyperparameterWidth)
        .attr("height", rowScale.bandwidth())
        .style("fill", digest => selectedPipelinesColorScale(digest))
        .style("opacity", 0.3),
    );

  const getEvent = () => event;

  const highlightColor = "#CCCCCC44";

  svg.on("mousemove", function () {
    const mGlobal = mouse(this);

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom) {
      const row = Math.floor((mGlobal[1] - top) / constants.cellHeight);
      if (row < pipelines.length) {
        const pipelineRowIndex = Math.floor((mGlobal[1] - top) / constants.cellHeight);
        const pipelineIdx = pipelines[pipelineRowIndex].pipeline_digest;
        const colIdx = Math.floor((mGlobal[0] - left) / constants.cellHeight);
        const moduleName = moduleNames[colIdx];

        onHover(pipelines[pipelineRowIndex], moduleName, [getEvent().pageX, getEvent().pageY]);

        svg
          .select("#highlight_row")
          .attr("y", rowScale(pipelineIdx) + top)
          .style("fill", highlightColor);

        svg
          .select("#highlight_col")
          .attr("x", colScale(moduleName) + left)
          .style("fill", highlightColor);

        svg
          .select("#module_names")
          .selectAll("text")
          .style("font-weight", d => d === moduleName ? "bold" : "normal");

        svg
          .select("#legendPipelineSourceGroup")
          .selectAll("text")
          .style("font-weight", d => {return d.pipeline_digest === pipelineIdx ? "bold" : "normal"});

      } else {
        svg
          .select("#highlight_row")
          .style("fill", "#00000000");

        svg
          .select("#highlight_col")
          .style("fill", "#00000000");

        svg
          .select("#module_names")
          .selectAll("text")
          .style("font-weight", "normal");

        svg
          .select("#legendPipelineSourceGroup")
          .selectAll("text")
          .style("font-weight", "normal");
      }
    } else {
      svg
        .select("#highlight_row")
        .style("fill", "#00000000");

      svg
        .select("#highlight_col")
        .style("fill", "#00000000");

      svg
        .select("#module_names")
        .selectAll("text")
        .style("font-weight", "normal");

      svg
        .select("#legendPipelineSourceGroup")
        .selectAll("text")
        .style("font-weight", "normal");
      onHover(null, null, null);
    }
  });

  svg.on("click", function () {
    const mGlobal = mouse(this);

    if (mGlobal[1] >= top && mGlobal[1] <= bottom) {
      const pipelineIdx = Math.floor((mGlobal[1] - top) / constants.cellHeight);
      onClick(pipelines[pipelineIdx], getEvent().shiftKey);
    }
  });

}
