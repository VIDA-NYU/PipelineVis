import React, {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";
import {Radio, RadioGroup, FormControlLabel} from '@material-ui/core';
import {constants} from "../helpers";

export class PipelineMatrix extends Component {

  display(props){
    const {data, onClick, sortColumnBy} = props;
    plotPipelineMatrix(this.ref, data, onClick, sortColumnBy);
  }

  shouldComponentUpdate(newprops){
    this.display(newprops);
    return false;
  }

  componentDidMount(){
    this.display(this.props);
  }

  componentDidUpdate(){
    this.display(this.props);
  }



  render(){
    return <svg ref={ref => this.ref = ref}/>;
  }
}

PipelineMatrix.defaultProps = {
  onClick: ()=>{}
};

PipelineMatrix.propTypes = {
  data: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  sortColumnBy: PropTypes.string,
};