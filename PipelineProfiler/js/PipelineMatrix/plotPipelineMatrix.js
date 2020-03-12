import "d3-selection";
import {select, event, mouse} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent} from "d3-array";
import {constants, extractMetric, getPrimitiveLabel} from "../helpers";
import "d3-transition";
import {axisLeft} from "d3-axis";
import {line, symbols, symbol, symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, symbolWye} from "d3-shape";

const mySymbols = [
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolTriangle,
  symbolWye,
  symbolStar
];

function initialCaptalize(txt) {
  return txt[0].toUpperCase();
}

export function computePipelineMatrixWidthHeight(pipelines, moduleNames, expandedPrimitiveData) {
  let svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
    constants.margin.left + constants.margin.right;

  if (expandedPrimitiveData) {
    svgWidth += expandedPrimitiveData.orderedHeader.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam;
  }

  const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight + constants.moduleImportanceHeight +
    constants.margin.top + constants.margin.bottom;

  return {svgWidth, svgHeight};
}

function computeBracketsHyperparams(orderedHeader) {

  if (orderedHeader.length === 0) {
    return [];
  }

  let currentBegin = orderedHeader[0];
  let brackets = [];
  const getKey = (x) => x.split(":")[0];

  for (let i = 1; i < orderedHeader.length; ++i) {
    if (getKey(currentBegin) !== getKey(orderedHeader[i])) {
      brackets.push({
        begin: currentBegin,
        end: orderedHeader[i - 1]
      });
      currentBegin = orderedHeader[i]
    }
  }
  // Adding last bracket
  brackets.push({
    begin: currentBegin,
    end: orderedHeader[orderedHeader.length - 1]
  });
  return brackets;
}

const hoveredColor = "#720400";
const unhoveredColor = "#797979";

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
                                   expandedPrimitiveName,
                                   metricRequest) {

  const {infos, module_types: moduleTypes} = data;
  const {moduleTypeOrder, moduleTypeOrderMap} = constants;
  const selectedScores = extractMetric(pipelines, metricRequest);
  const selectedScoresDigests = selectedScores.map((score, idx) => ({
    score,
    pipeline_digest: pipelines[idx].pipeline_digest
  }));

  const {svgWidth, svgHeight} = computePipelineMatrixWidthHeight(pipelines, moduleNames, expandedPrimitiveData);

  const svg = select(ref)
    .style("width", svgWidth + "px")
    .style("height", svgHeight + "px");

  const colScale = scaleBand()
    .domain(moduleNames)
    .range([0, moduleNames.length * constants.cellWidth])
    .paddingInner(0)
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
    .range([0, constants.moduleImportanceHeight / 2]);

  const importanceScaleVisible = scaleLinear() // Importance scale used in d3.axis
    .domain([-halfImportanceDomain, halfImportanceDomain])
    .range([constants.moduleImportanceHeight, 0]); // order is switched to put positive numbers on top

  const bandOver2 = rowScale.bandwidth() / 2;

  const left = constants.margin.left + constants.pipelineNameWidth,
    top = constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight,
    right = constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth,
    bottom = constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight + pipelines.length * constants.cellHeight;


  let hyperparameterWidth = 0;

  if (expandedPrimitiveData) {
    hyperparameterWidth = expandedPrimitiveData.orderedHeader.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam;
  }

  let pipeline_steps = [];

  let deduplicateChecker = {};

  const _usedModuleTypesObj = {};

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
        const moduleType = infos[pythonPath].module_type;
        _usedModuleTypesObj[moduleType] = true;
      }
    });
  });

  const usedModuleTypes = Object.keys(_usedModuleTypesObj);
  usedModuleTypes.sort((a,b) => moduleTypeOrderMap[a] - moduleTypeOrderMap[b]);

  const shapeScale = scaleOrdinal()
    .range(mySymbols.map(s => symbol()
      .type(s)()
    ))
    .domain(usedModuleTypes);

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
      enter => enter.append("g")
        .attr("class", "dot")
        .attr("transform", x => `translate(${colScale(x.pythonPath) + bandOver2}, ${rowScale(x.pipelineID) + bandOver2})`)
        .append("path")
        .attr("d", x => shapeScale(infos[x.pythonPath].module_type)),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(${colScale(x.pythonPath) + bandOver2}, ${rowScale(x.pipelineID) + bandOver2})`)
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
        .attr("x", x => colScale(x) + 2)
        .attr("y", x => importances[x] > 0 ?
          halfImportanceHeight - importanceScale(importances[x])
          : halfImportanceHeight
        )
        .attr("width", colScale.bandwidth() - 4)
        .attr("height", x => importances[x] > 0 ?
          importanceScale(importances[x])
          : importanceScale(-importances[x])
        )
        .style("fill", "#bababa"),
      update => update
        .call(update => {
            return update.transition(t)
              .attr("x", x => colScale(x) + 2)
              .attr("y", x => importances[x] > 0 ?
                halfImportanceHeight - importanceScale(importances[x])
                : halfImportanceHeight
              )
              .attr("width", colScale.bandwidth() - 4)
              .attr("height", x => importances[x] > 0 ?
                importanceScale(importances[x])
                : importanceScale(-importances[x])
              )
              .style("fill", "#bababa")
          }
        )
    );

  let moduleImportanceAxis = svg.selectAll(".axisImportance")
    .data([1], x => x)
    .join(
      enter => enter
        .append("g")
        .attr("class", "axisImportance")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
      ${constants.margin.top + constants.moduleNameHeight})`)
    );

  let axisObject = axisLeft()
    .ticks(5)
    .scale(importanceScaleVisible);

  moduleImportanceAxis.call(axisObject);

  const zeroLineHeight = constants.margin.top + constants.moduleNameHeight + halfImportanceHeight;

  svg.selectAll(".zeroLine")
    .data([1], x => x)
    .join(
      enter => enter
        .append("line")
        .attr("class", "zeroLine")
        .attr("x1", constants.margin.left + constants.pipelineNameWidth)
        .attr("x2", constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth)
        .attr("y1", zeroLineHeight)
        .attr("y2", zeroLineHeight)
        .style("stroke", "#bababa")
        .style("stroke-width", 1)
    );

  const moduleNameGroups = svg.selectAll(".moduleNameGroup")
    .data(moduleNames, x => x)
    .join(
      enter => {
        enter = enter
          .append("g")
          .attr("class", "moduleNameGroup")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth},
         ${constants.margin.top})`);

        enter
          .append("text")
          .text(x => getPrimitiveLabel(x))
          .style("fill", "#6e6e6e")
          .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth() - 5}, ${constants.moduleNameHeight - constants.moduleTypeHeight}) rotate(-60)`);

        enter
          .append("g")
          .attr("class", "dot")
          .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth() - 7}, ${constants.moduleNameHeight - 10})`)
          .append("path")
          .attr("d", x => shapeScale(infos[x].module_type));


        return enter;
      }
    );

  moduleNameGroups.selectAll("text")
    .transition(t)
    .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth() - 5}, ${constants.moduleNameHeight - constants.moduleTypeHeight}) rotate(-60)`);

  moduleNameGroups.selectAll("g")
    .transition(t)
    .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth() - 7}, ${constants.moduleNameHeight - 10})`);

  const scoreScale = scaleLinear()
    .domain(extent(selectedScores, x => x))
    .range([0, constants.pipelineScoreWidth]);

  const paddingHyperparamColsWidth = expandedPrimitiveData ? expandedPrimitiveData.orderedHeader.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam : 0;

  const legendModuleType = svg
    .selectAll(".legend_module_type")
    .data([usedModuleTypes])
    .join(
      enter => enter
        .append("g")
        .attr("class", "legend_module_type")
    )
    .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + paddingHyperparamColsWidth + 70},
        ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 50 - usedModuleTypes.length * 15})`);

  legendModuleType.selectAll("*").remove();

  legendModuleType.append("text")
    .attr("x", -5)
    .attr("y", -15)
    .text("Primitive Type")
    .style("fill", "#9a9a9a")
    .style("font-weight", "bold");

  const lengendRowGroup = legendModuleType
    .selectAll("g")
    .data(x => x, x => x)
    .join(
      enter => enter
        .append("g")
        .attr("transform", (x, idx) => `translate(0, ${idx * 15})`)
        .attr("data", x => x)
    );


  lengendRowGroup
    .append("g")
    .attr("transform", "translate(0,5)")
    .append("path")
    .classed("dot", true)
    .attr("d", x => shapeScale(x))
    .style("class", "visShape");

  lengendRowGroup
    .append("text")
    .attr("x", 14)
    .attr("y", 10)
    .text(x => x)
    .style("fill", "#9a9a9a");


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

  const selectedPipelinesMap = {};
  selectedPipelines.forEach(pipeline => {
    selectedPipelinesMap[pipeline.pipeline_digest] = true;
  });

  legendPipelineSourceGroup
    .selectAll("text")
    .data(x => x, x => x.pipeline_digest)
    .join(
      enter => enter
        .append("text")
        .attr("text-anchor", "end")
        .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        .text(x => x.pipeline_source.name),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        )
    )
    .style("font-weight", x => x.pipeline_digest in selectedPipelinesMap ? "bold" : "normal");

  /*
  *
  * Plotting Hyperparameters
  *
  * */

  let expandedColScale;


  svg.selectAll(".groupHyperparams").remove();
  let groupHyperparams = svg.append("g").attr("class", "groupHyperparams");

  if (expandedPrimitiveData) {
    const {orderedHeader, stepSamples} = expandedPrimitiveData;
    expandedColScale = scaleBand()
      .domain(orderedHeader)
      .range([0, orderedHeader.length * constants.cellWidth])
      .paddingInner(0)
      .paddingOuter(0);

    const hyperparamDots = groupHyperparams.selectAll("#hyperdots")
      .data([stepSamples])
      .join(
        enter => enter.append("g")
          .attr("id", "hyperdots")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam},
      ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`)
      );


    groupHyperparams.append("text")
      .text(`Hyperparameters for ${expandedPrimitiveName.split(".").slice(3).join(".")}`)
      .attr("transform", `translate(${right + constants.widthSeparatorPrimitiveHyperparam - 5}, ${bottom}) rotate(-90)`)
      .style("fill", "#6e6e6e");

    const hyperparamsGuideLinesGroup = groupHyperparams
      .selectAll("#hyperparamsGuideLinesGroup")
      .data([1])
      .join(
        enter => enter
          .append("g")
          .attr("id", "hyperparamsGuideLinesGroup")
          .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam},
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
      .selectAll(".hyperparamDot")
      .data(x => x, x => x.unique_key)
      .join(
        enter => enter.append("circle")
          .attr("class", "hyperparamDot")
          .attr("cx", x => expandedColScale(x.header_key) + bandOver2)
          .attr("cy", x => rowScale(x.pipeline_digest) + bandOver2)
          .attr("r", 4),
        update => update
          .call(update => update.transition(t)
            .attr("cx", x => expandedColScale(x.header_key) + bandOver2)
            .attr("cy", x => rowScale(x.pipeline_digest) + bandOver2)
          ));

    const hyperparamNameLabelsLeft = constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam;

    const bracketHeight = 20;


    const hyperparamsNameLabels = groupHyperparams.selectAll("#hyperparam_names")
      .data([orderedHeader])
      .join(
        enter => enter
          .append("g")
          .attr("id", "hyperparam_names")
          .attr("transform", `translate(${hyperparamNameLabelsLeft},
         ${constants.margin.top + constants.moduleImportanceHeight - bracketHeight - 5})`)
      );

    hyperparamsNameLabels
      .selectAll("text")
      .data(x => x, x => x)
      .join(
        enter => enter
          .append("text")
          .text(x => x)
          .style("fill", unhoveredColor),
      )
      .attr("transform", x => `translate(${expandedColScale(x) + expandedColScale.bandwidth() - 5}, ${constants.moduleNameHeight}) rotate(-60)`);

    const bracketPadding = 3;

    const lineGenerator = line()
      .x(x => x[0])
      .y(x => x[1]);

    const bracketGenerator = (bracket) => {
      const height = bracketHeight;
      const width = expandedColScale(bracket.end) - expandedColScale(bracket.begin) + expandedColScale.bandwidth() - bracketPadding * 2;
      return lineGenerator([
        [0, 0],
        [0, height],
        [width, height],
        [width, 0]
      ])
    };

    let bracketsData = computeBracketsHyperparams(orderedHeader);

    let bracketGroup = groupHyperparams.selectAll(".bracketGroup")
      .data(bracketsData, x => x.begin + x.end)
      .join(
        enter => enter
          .append("g")
          .attr("transform", x => `translate(${hyperparamNameLabelsLeft + expandedColScale(x.begin) + bracketPadding}, 
           ${constants.moduleNameHeight + constants.margin.top + constants.moduleImportanceHeight - bracketHeight - bracketPadding})`)
      );


    bracketGroup.append("path")
      .attr("d", bracketGenerator)
      .attr("class", "bracket");
  }


  /*
  *
  * Dealing with selections and hovers
  *
  * */

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
    .attr("width", right - left + constants.pipelineScoreWidth + hyperparameterWidth);


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

  svg
    .selectAll("#highlight_col_hyperparam")
    .data([1])
    .join(
      enter => enter
        .append("rect")
        .attr("id", "highlight_col_hyperparam")
        .attr("y", top)
        .attr("height", bottom - top)
        .attr("width", colScale.bandwidth())
        .style("fill", "#00000000")
    );

  const selectedDigests = selectedPipelines.map(pipeline => pipeline['pipeline_digest']);

  const selectedGroup = svg.selectAll(".selectedGroup")
    .data([selectedDigests], x => "selectedGroup")
    .join(
      enter => enter
        .append("g")
        .attr("class", "selectedGroup")
    );

  svg.selectAll(".SelectedExpandedPrimitive")
    .data([expandedPrimitiveName])
    .join(
      enter => enter
        .append("rect")
        .attr("class", "SelectedExpandedPrimitive")
        .attr("width", colScale.bandwidth())
        .attr("y", top - constants.moduleImportanceHeight)
        .attr("height", bottom - top + constants.moduleImportanceHeight)
    )
    .attr("x", x => left + colScale(x))
    .attr("fill", () => expandedPrimitiveData ? "#33333333" : "#00000000");

  selectedGroup.selectAll("rect")
    .data(x => x, x => x)
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
    let inHyperparamterMatrixRect = false;
    let inPrimitiveMatrixRect = false;
    if (expandedPrimitiveData) {
      const {orderedHeader} = expandedPrimitiveData;
      const leftHyperparam = constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.widthSeparatorPrimitiveHyperparam;
      const rightHyperparam = leftHyperparam + orderedHeader.length * constants.cellWidth;
      inHyperparamterMatrixRect = mGlobal[0] >= leftHyperparam && mGlobal[0] <= rightHyperparam && mGlobal[1] >= top && mGlobal[1] <= bottom;
      if (inHyperparamterMatrixRect) {
        const row = Math.floor((mGlobal[1] - top) / constants.cellHeight);
        if (row < pipelines.length) {
          const pipelineRowIndex = Math.floor((mGlobal[1] - top) / constants.cellHeight);
          const pipelineIdx = pipelines[pipelineRowIndex].pipeline_digest;
          const colIdx = Math.floor((mGlobal[0] - leftHyperparam) / constants.cellHeight);
          const hyperparamName = orderedHeader[colIdx];

          svg
            .select("#highlight_row")
            .attr("y", rowScale(pipelineIdx) + top)
            .style("fill", highlightColor);

          svg
            .select("#highlight_col_hyperparam")
            .attr("x", expandedColScale(hyperparamName) + leftHyperparam)
            .style("fill", highlightColor);

          svg
            .select("#legendPipelineSourceGroup")
            .selectAll("text")
            .style("fill", d => d.pipeline_digest === pipelineIdx ? hoveredColor : unhoveredColor);

          svg
            .selectAll("#hyperparam_names")
            .selectAll("text")
            .style("fill", d => {
              return d === hyperparamName ? hoveredColor : unhoveredColor
            });
        }
      }
    }

    inPrimitiveMatrixRect = mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom;

    if (inPrimitiveMatrixRect) {
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
          .style("fill", d => d === moduleName ? hoveredColor : unhoveredColor);

        svg
          .select("#legendPipelineSourceGroup")
          .selectAll("text")
          .style("fill", d => {
            return d.pipeline_digest === pipelineIdx ? hoveredColor : unhoveredColor
          });


      }
    }

    if (!inPrimitiveMatrixRect && !inHyperparamterMatrixRect) {
      svg
        .select("#highlight_row")
        .style("fill", "#00000000");

      svg
        .select("#highlight_col")
        .style("fill", "#00000000");

      svg
        .select("#highlight_col_hyperparam")
        .style("fill", "#00000000");

      svg
        .select("#module_names")
        .selectAll("text")
        .style("fill", unhoveredColor);

      svg
        .select("#legendPipelineSourceGroup")
        .selectAll("text")
        .style("fill", unhoveredColor);

      svg
        .selectAll("#hyperparam_names")
        .selectAll("text")
        .style("fill", unhoveredColor);
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
