import React, {Component} from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";
import {FormControlLabel, Radio, RadioGroup} from "@material-ui/core";
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
  render(){
    const {data} = this.props;
    return <div>
      <RadioGroup value={this.state.sortColumnsBy} onChange={x=>{ this.setState({sortColumnsBy: x.target.value})}}>
        <FormControlLabel value={constants.sortModuleBy.moduleType} control={<Radio />} label="Module Type" />
        <FormControlLabel value={constants.sortModuleBy.importance} control={<Radio />} label="Module Importance" />
      </RadioGroup>

      <RadioGroup value={this.state.sortRowsBy} onChange={x=>{ this.setState({sortRowsBy: x.target.value})}}>
        <FormControlLabel value={constants.sortPipelineBy.pipeline_score} control={<Radio />} label="Pipeline Score" />
        <FormControlLabel value={constants.sortPipelineBy.pipeline_source} control={<Radio />} label="Pipeline Source" />
        <FormControlLabel value={constants.sortPipelineBy.tsp_sort} control={<Radio />} label="Similarity" />
      </RadioGroup>

      <PipelineMatrix data={data} onClick={(pipeline)=>{this.setState({pipeline})}} sortColumnBy={this.state.sortColumnsBy} sortRowBy={this.state.sortRowsBy}/>
      {this.state.pipeline?
        <>
          Pipeline Digest: {this.state.pipeline.pipeline_digest}
          <SolutionGraph
            solution={ {description: {
              pipeline: this.state.pipeline
            }} }
            onClick={node => console.log(node)}
          />
        </>
        : null
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