import "d3-selection";
import {select, event, mouse} from "d3-selection";
import {scaleBand, scaleLinear, scaleOrdinal} from "d3-scale";
import {extent, range} from "d3-array";
import {schemeCategory10} from "d3-scale-chromatic";
import {constants, extractHyperparams} from "../helpers";
import "d3-transition";
import {VerticalParCoord} from "./VerticalParCoord";

export function plotPipelineMatrix(ref, data, onClick, sortColumnBy = constants.sortModuleBy.moduleType, sortRowBy = constants.sortPipelineBy.pipeline_source) {
  const {infos, pipelines, module_types: moduleTypes, module_type_order: moduleTypeOrder} = data;
  const moduleNames = Object.keys(infos);

  const moduleTypeOrderMap = {};
  moduleTypeOrder.forEach((x, idx) => {
    moduleTypeOrderMap[x] = idx;
  });

  if (sortColumnBy === constants.sortModuleBy.importance) {
    moduleNames.sort((a, b) => infos[b]['module_importance'] - infos[a]['module_importance']);
  } else if (sortColumnBy === constants.sortModuleBy.moduleType) {
    moduleNames.sort((a, b) => infos[b]['module_importance'] - infos[a]['module_importance']);
    moduleNames.sort((a, b) => moduleTypeOrderMap[infos[a]['module_type']] - moduleTypeOrderMap[infos[b]['module_type']]);
  }

  if (sortRowBy === constants.sortPipelineBy.pipeline_score) {
    pipelines.sort((a, b) => b["scores"][0]["value"] - a["scores"][0]["value"]);
  } else if (sortRowBy === constants.sortPipelineBy.pipeline_source) {
    pipelines.sort((a, b) => b["scores"][0]["value"] - a["scores"][0]["value"]);
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

  const importanceDomain = extent(moduleNames, x => infos[x]["module_importance"]);

  const halfImportanceDomain = Math.max(Math.abs(importanceDomain[0]), Math.abs(importanceDomain[1]));

  const importanceScale = scaleLinear()
    .domain([0, halfImportanceDomain])
    .range([0, constants.moduleNameHeight/2]);


  const bandOver2 = rowScale.bandwidth() / 2;

  const moduleColorScale = scaleOrdinal(schemeCategory10);


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

  /*moduleImportanceBars
    .selectAll("circle")
    .data(x => x, x => x) // loading data with identity function
    .join(
      enter => enter
        .append("circle")
        .attr("cx", x => colScale(x) + 3)
        .attr("cy", x => importanceScale(infos[x]["module_importance"]))
        .attr("r", 5)
    );*/

  const halfImportanceHeight = constants.moduleImportanceHeight / 2;

  moduleImportanceBars
    .selectAll("rect")
    .data(x => x, x => x) // loading data with identity function
    .join(
      enter => enter
        .append("rect")
        .attr("x", x => colScale(x) + 3)
        .attr("y", x => infos[x]["module_importance"] > 0 ?
          halfImportanceHeight - importanceScale(infos[x]["module_importance"])
          : halfImportanceHeight
        )
        .attr("width", colScale.bandwidth() - 3)
        .attr("height", x => infos[x]["module_importance"] > 0 ?
          importanceScale(infos[x]["module_importance"])
          : importanceScale(-infos[x]["module_importance"])
        )
        .style("fill", "#bababa"),
      update => update
        .call(update => {
            return update.transition(t)
              .attr("x", x => colScale(x) + 3)
          }
        )
    );

  const moduleMeanImportanceLine = svg
    .selectAll(".moduleMeanImportanceLine")
    .data([halfImportanceHeight], x => x)
    .join(
      enter => enter
        .append("line")
        .attr("class", "moduleMeanImportanceLine")
        .attr("x1", constants.margin.left + constants.pipelineNameWidth)
        .attr("x2", constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth)
        .attr("y1", x => constants.margin.top + constants.moduleNameHeight + halfImportanceHeight)
        .attr("y2", x => constants.margin.top + constants.moduleNameHeight + halfImportanceHeight)
        .style("stroke", "rgb(107, 107, 107)")
        .style("stroke-width", 1)
    );

  const moduleMeanImportanceText = svg
    .selectAll(".moduleMeanImportanceText")
    .data([0], x=>x)
    .join(
      enter => enter
        .append("text")
        .attr("class", "moduleMeanImportanceText")
        .attr("x", constants.margin.left + constants.pipelineNameWidth + moduleNames.length * constants.cellWidth)
        .attr("y", x => constants.margin.top + constants.moduleNameHeight + halfImportanceHeight)
        .style("fill", "rgb(107, 107, 107)")
        .text(x => x)
    );

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
    .domain(extent(pipelines, x => x["scores"][0]["value"]))
    .range([0, constants.pipelineScoreWidth]);

  console.log(Object.keys(infos).map(x => infos[x].module_importance).sort());

  const pipelineScoreBars = svg
    .selectAll("#pipeline_score_bars")
    .data([pipelines])
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
        .attr("width", (x) => scoreScale(x["scores"][0]["value"]))
        .attr("height", rowScale.bandwidth() - 4)
        .style("fill", "#bababa"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + 3})`)
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
        .text(x => x["scores"][0]["value"].toFixed(2))
        .style("fill", "#6b6b6b"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(${constants.pipelineScoreWidth}, ${rowScale(x.pipeline_digest) + rowScale.bandwidth()})`)
        )
    );


  const legendModuleType = svg
    .selectAll(".legend_module_type")
    .data([moduleTypeOrder])
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

  const legendPipelinePerformanceType = svg
    .selectAll(".legend_pipeline_performance")
    .data([pipelines[0]["scores"][0]["metric"]["metric"]])
    .join(
      enter => enter
        .append("text")
        .attr("class", "legend_pipeline_performance")
        .attr("text-anchor", "end")
        .attr("x", constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length + constants.pipelineScoreWidth)
        .attr("y", constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 5)
        .text(x => x)
        .style("fill", "#9a9a9a")
    );

  const legendPipelineSourceGroup = svg
    .selectAll("#legendPipelineSourceGroup")
    .data([pipelines])
    .join(
      enter => enter
        .append("g")
        .attr("id", "legendPipelineSourceGroup")
        .attr("transform", `translate(${constants.margin.left + constants.pipelineNameWidth}, ${constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight})`)
    );

  legendPipelineSourceGroup
    .selectAll("text")
    .data(x => x, x => x.pipeline_digest)
    .join(
      enter => enter
        .append("text")
        .attr("text-anchor", "end")
        .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + bandOver2})`)
        .text(x => x.pipeline_source.name)
        .style("fill", "#9a9a9a"),
      update => update
        .call(update => update.transition(t)
          .attr("transform", x => `translate(0, ${rowScale(x.pipeline_digest) + bandOver2})`)
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

    if (mGlobal[0] >= left && mGlobal[0] <= right && mGlobal[1] >= top && mGlobal[1] <= bottom) {
      //const localX = colScale.invert(mGlobal[0]),
      //  localY = rowScale.invert(mGlobal[1]);
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
