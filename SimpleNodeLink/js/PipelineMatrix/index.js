import React, {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";
import {Radio, RadioGroup, FormControlLabel} from '@material-ui/core';
import {constants} from "../helpers";

export class PipelineMatrix extends Component {

  display(){
    const {data, onClick, sortColumnBy} = this.props;
    plotPipelineMatrix(this.ref, data, onClick, sortColumnBy);
  }

  shouldComponentUpdate(newprops){
    this.display();
    return false;
  }

  componentDidMount(){
    this.display();
  }

  componentDidUpdate(){
    this.display();
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