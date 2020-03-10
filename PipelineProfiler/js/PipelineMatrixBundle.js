import React, {Component} from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";
import "react-table-v6/react-table.css";
import {schemeCategory10} from 'd3-scale-chromatic';
import {scaleOrdinal} from "d3-scale";
import {select} from "d3-selection";
import ReactTable from "react-table-v6";

import {
  computePrimitiveImportances,
  constants,
  extractMetric,
  extractMetricNames,
  createHyperparamTableDataFromNode,
  computePrimitiveHyperparameterData
} from "./helpers";

import MergedGraph from "./MergedGraph";
import Table from "./Table";

export class PipelineMatrixBundle extends Component {
  constructor(props){
    super(props);
    let pipelines = props.data.pipelines;
    let moduleNames = Object.keys(props.data.infos);
    const metricNames = extractMetricNames(props.data.pipelines);
    let metricOptions = metricNames.map(name => ({type: constants.scoreRequest.D3MSCORE, name}));
    metricOptions.push({type: constants.scoreRequest.TIME, name: 'TIME (s)'});
    const metricRequest = metricOptions[0];
    const importances = computePrimitiveImportances(props.data.infos, props.data.pipelines, metricRequest);
    const sortColumnsBy = constants.sortModuleBy.importance,
      sortRowsBy = constants.sortPipelineBy.pipeline_score;

    pipelines = this.computeSortedPipelines(pipelines, sortRowsBy, metricRequest);
    moduleNames = this.computeSortedModuleNames(moduleNames, sortColumnsBy, importances, this.props.data.infos);

    this.requestMergeGraph = () => {console.error(new Error("Cannot find Jupyter namespace from javascript."))};
    if (window.Jupyter !== undefined) {
      const comm = Jupyter.notebook.kernel.comm_manager.new_comm('merge_graphs_comm_api', {'foo': 6});

      this.requestMergeGraph = (pipelines) => {
        comm.send({pipelines});
      };

      // Register a handler
      comm.on_msg(msg => {
        const mergedGraph = msg.content.data.merged;
        this.setState({mergedGraph});
      });
    }

    this.state = {
      pipelines,
      selectedPipelines: [],
      selectedPipelinesColorScale: () => {},
      sortColumnsBy,
      sortRowsBy,
      metricRequest,
      metricOptions,
      importances,
      moduleNames,
      mergedGraph: null,
      hoveredPrimitive: null,
      expandedPrimitive: null,
      expandedPrimitiveData: null,
    }
  }

  computeSortedPipelines(pipelines, sortPipelinesBy, metricRequest){
    const selectedScores = extractMetric(pipelines, metricRequest);
    const selectedScoresDigests = selectedScores.map((score, idx) => ({score, pipeline_digest: pipelines[idx].pipeline_digest}));
    const selectedScoresDigestsMap = {};
    selectedScoresDigests.forEach(x => {
      selectedScoresDigestsMap[x.pipeline_digest] = x.score;
    });

    let newPipelines = [...pipelines];
    if (sortPipelinesBy === constants.sortPipelineBy.pipeline_score){
      newPipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
    } else if (sortPipelinesBy === constants.sortPipelineBy.pipeline_source){
      newPipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
      newPipelines.sort((a, b) => a.pipeline_source.name > b.pipeline_source.name ? 1 : (a.pipeline_source.name < b.pipeline_source.name ? -1 : 0));
    }
    return newPipelines;
  }

  computeSortedModuleNames(moduleNames, sortModulesBy, importances, infos){
    let newModuleNames = [...moduleNames];
    if (sortModulesBy === constants.sortModuleBy.importance) {
      newModuleNames.sort((a, b) => importances[b] - importances[a]);
    } else if (sortModulesBy === constants.sortModuleBy.moduleType) {
      const moduleTypeOrderMap = {};
      constants.moduleTypeOrder.forEach((x, idx) => {
        moduleTypeOrderMap[x] = idx;
      });
      newModuleNames.sort((a, b) => importances[b] - importances[a]);
      newModuleNames.sort((a, b) => moduleTypeOrderMap[infos[a]['module_type']] - moduleTypeOrderMap[infos[b]['module_type']]);
    }
    return newModuleNames;
  }

  cleanMouseOver() {
    this.setState({hoveredPrimitive: null, tooltipPosition: null});
    select(this.ref).select("#highlight_row").style("fill", "#00000000");
    select(this.ref).select("#highlight_col").style("fill", "#00000000");
    select(this.ref).select("#module_names").selectAll("text").style("font-weight", "normal");
    select(this.ref).select("#legendPipelineSourceGroup").selectAll("text").style("font-weight", "normal");
  }

  createHyperparamInfo(){
    const {hoveredPrimitive, tooltipPosition} = this.state;
    let tooltip, primitiveName;
    if (hoveredPrimitive.primitive) {
      primitiveName = hoveredPrimitive.primitive.python_path;
      primitiveName = primitiveName.split(".").slice(3).join(".");
    } else if (hoveredPrimitive.name) {
      primitiveName = hoveredPrimitive.name;
    }
    const tooltipTableData = createHyperparamTableDataFromNode(hoveredPrimitive);
    const columns = [{
      Header: 'Hyperparameter',
      accessor: x => x.name
    }, {
      Header: 'Value',
      accessor: x => JSON.stringify(x.value)
    }];
    const tooltipStyle = {
      padding: 15,
      borderRadius: 12,
      borderStyle: 'solid',
      background: "#FFFFFF",
      position: 'fixed',
      borderWidth: 'thin',
      borderColor: '#aaaaaa',
    };

    const tooltipHeader = <>
      <p><strong>Primitive Name:</strong> {primitiveName}</p>
      <p><strong>Primitive Type:</strong> {this.props.data.infos[hoveredPrimitive.primitive.python_path].module_type}</p>
    </>;

    if (tooltipTableData) {
      tooltip = <div style={{...tooltipStyle, left: tooltipPosition[0] + 30, top: tooltipPosition[1]}}>
        {tooltipHeader}
        <Table columns={columns} data={tooltipTableData}/>
      </div>;
    } else {
      tooltip = <div style={{...tooltipStyle, left: tooltipPosition[0] + 30, top: tooltipPosition[1]}}>
        {tooltipHeader}
        <p>No hyperparameters set.</p>
      </div>;
    }
    return tooltip;
  }

  render(){
    /*<PrimitiveTable primitiveMetadata={this.state.primitiveMetadata}/>*/
    const {data} = this.props;
    const {selectedPrimitive, hoveredPrimitive, tooltipPosition} = this.state;
    const {sortModuleBy, sortPipelineBy} = constants;

    let primitiveName = "";
    let primitiveHyperparamsView = null;
    if (selectedPrimitive) {
      if (selectedPrimitive.primitive) {
        primitiveName = selectedPrimitive.primitive.python_path;
      } else if (selectedPrimitive.name) {
        primitiveName = selectedPrimitive.name;
      }
      const tableData = createHyperparamTableDataFromNode(selectedPrimitive);
      const columns = [{
        Header: 'Hyperparameter',
        accessor: x => x.name
      }, {
        Header: 'Value',
        accessor: x => JSON.stringify(x.value)
      }];
      if (tableData) {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <Table columns={columns} data={tableData}/>
        </>;
      } else {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <p>No hyperparameters set.</p>
          </>;
      }
    }

    if (!this.state.pipelines) {
      return <div/>;
    }


    let pipelineGraph = null;

    if (this.state.selectedPipelines && this.state.selectedPipelines.length > 0 ){
      if (this.state.selectedPipelines.length === 1) {
        pipelineGraph = <>
          <p><strong>Pipeline Digest: </strong> {this.state.selectedPipelines[0].pipeline_digest}</p>
          <SolutionGraph
            solution={ {description: {
                pipeline: this.state.selectedPipelines[0]
              }} }
            onClick={node => {
              this.setState({selectedPrimitive: node})
            }}
          />
        </>;
      } else { //(this.state.selectedPipelines.length > 1)
        if (this.state.mergedGraph) {
          pipelineGraph = <MergedGraph
            merged={this.state.mergedGraph}
            selectedPipelinesColorScale={this.state.selectedPipelinesColorScale}
          />;
        }
      }
    }


    let tooltip = null;
    if (hoveredPrimitive) {
      tooltip = this.createHyperparamInfo(hoveredPrimitive);
    }

    return <div ref={ref=>{this.ref = ref}}>
      <div>
        <div><strong>Sort primitives by:</strong></div>
        <div className="radio">
          <label>
            <input type="radio" value={sortModuleBy.importance}
                   checked={this.state.sortColumnsBy === sortModuleBy.importance}
                   onClick={x=>{
                     const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.importance, this.state.importances, this.props.data.infos);
                     this.setState({sortColumnsBy: sortModuleBy.importance, moduleNames: newModuleNames});
                   }}
                   onChange={x=>{}}
            />
            Module Importance
          </label>
        </div>
        <div className="radio">
          <label>
            <input type="radio" value={sortModuleBy.moduleType}
                   checked={this.state.sortColumnsBy === sortModuleBy.moduleType}
                   onClick={x=>{
                     const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.moduleType, this.state.importances, this.props.data.infos);
                     this.setState({sortColumnsBy: sortModuleBy.moduleType, moduleNames: newModuleNames});
                   }}
                   onChange={x=>{}}
            />
            Module Type
          </label>
        </div>
      </div>

      <p><strong>Sort pipelines by:</strong></p>
      <div className="radio">
        <label>
          <input type="radio" value={sortPipelineBy.pipeline_score}
                 checked={this.state.sortRowsBy === sortPipelineBy.pipeline_score}
                 onClick={x=>{
                   const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_score, this.state.metricRequest);
                   this.setState({pipelines: newPipelines, sortRowsBy: sortPipelineBy.pipeline_score});
                 }}
                 onChange={x=>{}}
          />
          Pipeline score
        </label>
      </div>
      <div className="radio">
        <label>
          <input type="radio" value={sortPipelineBy.pipeline_source}
                 checked={this.state.sortRowsBy === sortPipelineBy.pipeline_source}
                 onClick={x=>{
                   const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_source, this.state.metricRequest);
                   this.setState({pipelines: newPipelines, sortRowsBy: sortPipelineBy.pipeline_source});
                 }}
                 onChange={x=>{}}
          />
          Pipeline source
        </label>
      </div>
      <PipelineMatrix
        data={data}
        pipelines={this.state.pipelines}
        selectedPipelines={this.state.selectedPipelines}
        selectedPipelinesColorScale={this.state.selectedPipelinesColorScale}
        onSelectExpandedPrimitive={python_path=>{
          const expandedPrimitiveData = computePrimitiveHyperparameterData(this.state.pipelines, python_path);
          this.setState({expandedPrimitive: python_path, expandedPrimitiveData});
        }}
        expandedPrimitiveData={this.state.expandedPrimitiveData}
        expandedPrimitiveName={this.state.expandedPrimitive}
        onClick={
          (selectedPipeline, shift) => {
            let selectedPipelinesColorScale = scaleOrdinal(schemeCategory10);
            let newSelectedPipelines;
            if (!shift) {
              // Just set one item as the selected
              newSelectedPipelines = [selectedPipeline];
            } else {
              // Select multiple pipelines
              const digest = selectedPipeline.pipeline_digest;
              newSelectedPipelines = this.state.selectedPipelines.filter(elem => elem.pipeline_digest !== digest);
              if (newSelectedPipelines.length === this.state.selectedPipelines.length) {
                newSelectedPipelines.push(selectedPipeline);
              }
              this.requestMergeGraph(newSelectedPipelines);
            }
            newSelectedPipelines.forEach(pipeline => {selectedPipelinesColorScale(pipeline.pipeline_digest)});
            this.setState({selectedPipelines: newSelectedPipelines, selectedPrimitive: null, selectedPipelinesColorScale})
          }
        }
        metricRequestChange={metricRequest => {
          const importances = computePrimitiveImportances(this.props.data.infos, this.state.pipelines, metricRequest);
          this.setState({metricRequest, importances});
        }}
        sortColumnBy={this.state.sortColumnsBy}
        sortRowBy={this.state.sortRowsBy}
        metricRequest={this.state.metricRequest}
        metricOptions={this.state.metricOptions}
        importances={this.state.importances}
        moduleNames={this.state.moduleNames}
        onHover={(pipeline, moduleName, mouse) => {
          if (pipeline && moduleName){
            const step = pipeline.steps.find(step => step.primitive.python_path === moduleName);
            if (step){
              this.setState({hoveredPrimitive: step, tooltipPosition: mouse})
            } else {
              this.setState({hoveredPrimitive: null})
            }
          }
        }}
      />
      {tooltip}
      <div onMouseMove={()=>{this.cleanMouseOver()}}>
      {pipelineGraph}
      {primitiveHyperparamsView}
      </div>
    </div>
  }
}

PipelineMatrixBundle.propTypes = {
  data: PropTypes.object.isRequired,
};
