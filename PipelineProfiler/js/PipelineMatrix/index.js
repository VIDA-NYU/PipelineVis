import React, {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";
import "./pipelineMatrix.css";

export class PipelineMatrix extends Component {

  display(props){
    const {data, onClick, sortColumnBy, sortRowBy} = props;
    plotPipelineMatrix(this.ref, data, onClick, sortColumnBy, sortRowBy);
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
  sortRowBy: PropTypes.string
};