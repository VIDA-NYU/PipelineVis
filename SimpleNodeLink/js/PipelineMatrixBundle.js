import React, {Component} from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";

export class PipelineMatrixBundle extends Component {
  constructor(props){
    super(props);
    this.state = {
      pipeline: null
    };
  }
  render(){
    const {data} = this.props;
    return <div>
      <PipelineMatrix data={data} onClick={(pipeline)=>{this.setState({pipeline})}}/>
      {this.state.pipeline?
        <SolutionGraph solution={ {description: {
            pipeline: this.state.pipeline
          }} }/>
        : null
      }
    </div>
  }
}

PipelineMatrixBundle.propTypes = {
  data: PropTypes.object.isRequired,
};