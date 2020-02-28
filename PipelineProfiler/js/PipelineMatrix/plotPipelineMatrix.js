import "d3-selection";
import {select, event, mouse} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent} from "d3-array";
import {schemeCategory10} from "d3-scale-chromatic";
import {constants, extractHyperparams, extractMetric, computePrimitiveImportances} from "../helpers";
import "d3-transition";
import {axisLeft} from "d3-axis";

export function plotPipelineMatrix(ref, data, onClick, metricRequest, sortColumnBy = constants.sortModuleBy.moduleType, sortRowBy = constants.sortPipelineBy.pipeline_source) {
  const {infos, pipelines, module_types: moduleTypes, module_type_order: moduleTypeOrder} = data;
  const moduleNames = Object.keys(infos);

  const moduleTypeOrderMap = {};
  moduleTypeOrder.forEach((x, idx) => {
    moduleTypeOrderMap[x] = idx;
  });

  const importances = computePrimitiveImportances(infos, pipelines, metricRequest);
  const selectedScores = extractMetric(pipelines, metricRequest);
  const selectedScoresDigests = selectedScores.map((score, idx) => ({score, pipeline_digest: pipelines[idx].pipeline_digest}));
  const selectedScoresDigestsMap = {};
  selectedScoresDigests.forEach(x => {
    selectedScoresDigestsMap[x.pipeline_digest] = x.score;
  });

  if (sortColumnBy === constants.sortModuleBy.importance) {
    moduleNames.sort((a, b) => importances[b] - importances[a]);
  } else if (sortColumnBy === constants.sortModuleBy.moduleType) {
    moduleNames.sort((a, b) => importances[b] - importances[a]);
    moduleNames.sort((a, b) => moduleTypeOrderMap[infos[a]['module_type']] - moduleTypeOrderMap[infos[b]['module_type']]);
  }

  if (sortRowBy === constants.sortPipelineBy.pipeline_score) {
    pipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
  } else if (sortRowBy === constants.sortPipelineBy.pipeline_source) {
    pipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
    pipelines.sort((a, b) => a.pipeline_source.name > b.pipeline_source.name ? 1 : (a.pipeline_source.name < b.pipeline_source.name ? -1 : 1));
  }

  const svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
    constants.margin.left + constants.margin.right;
  const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight + constants.moduleImportanceHeight +
    constants.margin.top + constants.margin.bottom;

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

  const importanceScaleVisible = scaleLinear()
    .domain([-halfImportanceDomain, halfImportanceDomain])
    .range([constants.moduleImportanceHeight, 0]); // order is switched to put positive numbers on top

  const bandOver2 = rowScale.bandwidth() / 2;

  const moduleColorScale = scaleOrdinal(schemeCategory10);

  moduleTypeOrder.forEach((x, idx) => {
    moduleColorScale(x);
  });


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
        .attr("r", 5)
        .style("fill", x => moduleColorScale(infos[x.pythonPath].module_type)),
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
        .text(x => infos[x]['module_name'])
        .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth()}, ${constants.moduleNameHeight}) rotate(-90)`)
        .style("fill", x => moduleColorScale(infos[x].module_type)),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(${colScale(x) + colScale.bandwidth()}, ${constants.moduleNameHeight}) rotate(-90)`)
        )
    );

  const scoreScale = scaleLinear()
    .domain(extent(selectedScores, x => x))
    .range([0, constants.pipelineScoreWidth]);

  const pipelineScoreBars = svg
    .selectAll("#pipeline_score_bars")
    .data([selectedScoresDigests])
    .join(
      enter => enter
        .append("g")
        .attr("id", "pipeline_score_bars")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth},
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

  const legendModuleType = svg
    .selectAll(".legend_module_type")
    .data([moduleTypeOrder], x=>"module_type")
    .join(
      enter => enter
        .append("g")
        .attr("class", "legend_module_type")
        .attr("transform", `translate(${constants.margin.left}, ${constants.margin.top})`)
    );

  const lengendRowGroup = legendModuleType
    .selectAll("g")
    .data(x => x, x => x)
    .join(
      enter => enter
        .append("g")
        .attr("transform", (x, idx) => `translate(0, ${idx * 14})`)
        .attr("data", x => x)
    );

  lengendRowGroup.selectAll("*").remove();

  lengendRowGroup
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .style("fill", x => moduleColorScale(x));

  lengendRowGroup
    .append("text")
    .attr("x", 14)
    .attr("y", 10)
    .text(x => x)
    .style("fill", "#9a9a9a");

  /*
  ====> Removed this text and used a select instead.
  const legendPipelinePerformanceType = svg
    .selectAll(".legend_pipeline_performance")
    .data([metricRequest.name])
    .join(
      enter => enter
        .append("text")
        .attr("class", "legend_pipeline_performance")
        .attr("text-anchor", "end")
        .attr("x", constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length + constants.pipelineScoreWidth)
        .attr("y", constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 5)
        .text(x => x)
        .style("fill", "#9a9a9a"),
      update => update
        .attr("text-anchor", "end")
        .attr("x", constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length + constants.pipelineScoreWidth)
        .attr("y", constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 5)
        .text(x => x)
        .style("fill", "#9a9a9a"),
    );*/

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
        .style("fill", "#9a9a9a"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
        )
    );

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
        .attr("width", right - left)
        .attr("height", rowScale.bandwidth())
        .style("fill", "#00000000")
    );

  svg
    .selectAll("#highlight_col")
    .data([1])
    .join(
      enter => enter
        .append("rect")
        .attr("id", "highlight_col")
        .attr("y", top)
        .attr("height", bottom - top)
        .attr("width", colScale.bandwidth())
        .style("fill", "#00000000")
    );


  const hyperparams = extractHyperparams(infos, pipelines);

  const hyperparamsArray = moduleNames.map(mname => ({key: mname, data: hyperparams[mname]}));

  /*const verticalParCoord = VerticalParCoord()
    .width(colScale.bandwidth())
    .height(constants.hyperparamsHeight);


  svg
    .selectAll(".paramcoords")
    .data(hyperparamsArray, (d, idx) => d.key)
    .join(
      enter => enter
        .append("g")
        .attr("class", "paramcoords")
        .attr("transform", (d, idx) => `translate(${left + colScale(d.key)}, ${top + pipelines.length * constants.cellHeight})`)
        .call(verticalParCoord),
      update => update
        .call(update => update.transition(t)
          .attr("transform", (d, idx) => `translate(${left + colScale(d.key)}, ${top + pipelines.length * constants.cellHeight})`)
        )
    );*/

  const highlightColor = "#CCCCCC44";

  svg.on("mousemove", function () {
    const mGlobal = mouse(this);
    console.log(mGlobal);

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom) {
      const row = Math.floor((mGlobal[1] - top) / constants.cellHeight);
      if (row < pipelines.length) {
        const pipelineIdx = pipelines[Math.floor((mGlobal[1] - top) / constants.cellHeight)].pipeline_digest;
        const colIdx = Math.floor((mGlobal[0] - left) / constants.cellHeight);
        const moduleName = moduleNames[colIdx];

        svg
          .select("#highlight_row")
          .attr("y", rowScale(pipelineIdx) + top)
          .style("fill", highlightColor);

        svg
          .select("#highlight_col")
          .attr("x", colScale(moduleName) + left)
          .style("fill", highlightColor);
      } else {
        svg
          .select("#highlight_row")
          .style("fill", "#00000000");

        svg
          .select("#highlight_col")
          .style("fill", "#00000000");
      }
    } else {
      svg
        .select("#highlight_row")
        .style("fill", "#00000000");

      svg
        .select("#highlight_col")
        .style("fill", "#00000000");

    }
  });

  svg.on("click", function () {
    const mGlobal = mouse(this);

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom) {
      const pipelineIdx = Math.floor((mGlobal[1] - top) / constants.cellHeight);
      const colIdx = Math.floor((mGlobal[0] - left) / constants.cellHeight);
      const moduleName = moduleNames[colIdx];
      onClick(pipelines[pipelineIdx]);
    }
  });

}
