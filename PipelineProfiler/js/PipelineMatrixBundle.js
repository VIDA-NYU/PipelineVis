import React, {Component} from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";
import {constants} from "./helpers";

export class PipelineMatrixBundle extends Component {
  constructor(props){
    super(props);
    this.state = {
      pipeline: null,
      sortColumnsBy: constants.sortModuleBy.importance,
      sortRowsBy: constants.sortPipelineBy.pipeline_score,
    };
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
      if (tableData) {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <table>
            <tbody>
              <tr>
                <th>Parameter Name</th>
                <th>Parameter Value</th>
              </tr>
              {tableData.map(row => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{JSON.stringify(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>;
      } else {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <p>No hyperparameters set.</p>
          </>;
      }

    }

    return <div>
      <div>
        <div><strong>Sort primitives by:</strong></div>
        <div className="radio">
          <label>
            <input type="radio" value={sortModuleBy.importance}
                   checked={this.state.sortColumnsBy === sortModuleBy.importance}
                   onClick={x=>{ this.setState({sortColumnsBy: sortModuleBy.importance})}}
                   onChange={x=>{}}
            />
            Module Importance
          </label>
        </div>
        <div className="radio">
          <label>
            <input type="radio" value={sortModuleBy.moduleType}
                   checked={this.state.sortColumnsBy === sortModuleBy.moduleType}
                   onClick={x=>{ this.setState({sortColumnsBy: sortModuleBy.moduleType})}}
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
                 onClick={x=>{ this.setState({sortRowsBy: sortPipelineBy.pipeline_score})}}
                 onChange={x=>{}}
          />
          Pipeline score
        </label>
      </div>
      <div className="radio">
        <label>
          <input type="radio" value={sortPipelineBy.pipeline_source}
                 checked={this.state.sortRowsBy === sortPipelineBy.pipeline_source}
                 onClick={x=>{ this.setState({sortRowsBy: sortPipelineBy.pipeline_source})}}
                 onChange={x=>{}}
          />
          Pipeline source
        </label>
      </div>
      <PipelineMatrix
        data={data}
        onClick={
          (pipeline) => {
            this.setState({pipeline})
            this.setState({selectedPrimitive: null})
          }
        }
        sortColumnBy={this.state.sortColumnsBy}
        sortRowBy={this.state.sortRowsBy}
      />
      {this.state.pipeline?
        <>
          <p><strong>Pipeline Digest: </strong> {this.state.pipeline.pipeline_digest}</p>
          <SolutionGraph
            solution={ {description: {
              pipeline: this.state.pipeline
            }} }
            onClick={node => {
              this.setState({selectedPrimitive: node})
            }}
          />
        </>
        : null
      }
      {
        primitiveHyperparamsView
      }
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