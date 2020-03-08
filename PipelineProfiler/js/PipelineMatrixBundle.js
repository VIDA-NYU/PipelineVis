import React, {Component} from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";
import ReactTable from "react-table-v6";
import "react-table-v6/react-table.css";


import {
  computePrimitiveImportances,
  computePrimitiveMetadata,
  computePrimitiveMetadata2,
  constants,
  extractMetric,
  extractMetricNames
} from "./helpers";
import MergedGraph from "./MergedGraph";
import Table from "./Table";
import PrimitiveTable from "./PrimitiveTable";

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

    const primitiveMetadata = computePrimitiveMetadata(pipelines);
    console.log(primitiveMetadata);

    const primitiveMetadata2 = computePrimitiveMetadata2(pipelines);
    console.log(primitiveMetadata2);

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
      sortColumnsBy,
      sortRowsBy,
      metricRequest,
      metricOptions,
      importances,
      moduleNames,
      primitiveMetadata,
      primitiveMetadata2,
      mergedGraph: null,
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

  createHyperparamTableDataFromNode(node){
    const tableData = [];
    if ('hyperparams' in node) {
      for (const hyperparamName of Object.keys(node.hyperparams)) {
        let row = {};
        row['name'] = hyperparamName;
        row['value'] = node.hyperparams[hyperparamName].data;
        tableData.push(row);
      }
    }
    if (tableData.length === 0) {
      return null;
    }
    return tableData;
  }

  render(){
    /*<PrimitiveTable primitiveMetadata={this.state.primitiveMetadata}/>*/
    const {data} = this.props;
    const {selectedPrimitive} = this.state;
    const {sortModuleBy, sortPipelineBy} = constants;

    let primitiveName = "";
    let primitiveHyperparamsView = null;
    if (selectedPrimitive) {
      if (selectedPrimitive.primitive) {
        primitiveName = selectedPrimitive.primitive.python_path;
      } else if (selectedPrimitive.name) {
        primitiveName = selectedPrimitive.name;
      }
      const tableData = this.createHyperparamTableDataFromNode(selectedPrimitive);
      const columns = [{
        Header: 'Parameter Name',
        accessor: x => x.name
      }, {
        Header: 'Parameter Value',
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
          />;
        }
      }
    }

    return <div>
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
        onClick={
          (selectedPipeline, shift) => {
            if (!shift) {
              // Just set one item as the selected
              this.setState({selectedPipelines: [selectedPipeline], selectedPrimitive: null})
            } else {
              // Select multiple pipelines
              const digest = selectedPipeline.pipeline_digest;
              let newSelectedPipelines = this.state.selectedPipelines.filter(elem => elem.pipeline_digest !== digest);
              if (newSelectedPipelines.length === this.state.selectedPipelines.length) {
                newSelectedPipelines.push(selectedPipeline);
              }
              this.requestMergeGraph(newSelectedPipelines);
              this.setState({selectedPipelines: newSelectedPipelines, selectedPrimitive: null})
            }
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
      />
      {pipelineGraph}
      {primitiveHyperparamsView}
      <ReactTable
        data={this.state.primitiveMetadata2}
        columns={[
          {
            Header: "Primitive ID",
            accessor: "python_path"
          },
          {
            Header: "Hyperparameter",
            accessor: "hyperparam"
          },
          {
            Header: "Value",
            accessor: "value"
          },
          {
            Header: "Pipeline ID",
            accessor: "pipeline"
          },
        ]}
        pivotBy={["python_path", "hyperparam", "value"]}
      />
    </div>
  }
}

PipelineMatrixBundle.propTypes = {
  data: PropTypes.object.isRequired,
};

/*
* IDEAS:
* - Adjusting the importance computation based on x (bigger is better), or MAX() - x (smaller is better)
* - Expand the pipeline into a pipeline block (facilitate visualization, smaller frame)
* - Module usage (how often it is used, and what is the score distribution for it) (maybe display it together with importance?)
* - Cluster pipelines
* - Module correlation / pair count (how modules are used together)
* - Reorder modules based on type
* - link pipeline graph with matrix
* - How to show hyperparameters - parallel coordinates
* */