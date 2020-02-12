import React, {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";
import "./pipelineMatrix.css";
import {constants, extractMetricNames, extractMetric} from "../helpers";

export class PipelineMatrix extends Component {

  constructor(props) {
    super(props);
    const metricNames = extractMetricNames(this.props.data.pipelines);
    let metricOptions = metricNames.map(name => ({type: constants.scoreRequest.D3MSCORE, name}));
    metricOptions.push({type: constants.scoreRequest.TIME, name: 'TIME'});
    const metricRequest = metricOptions[0];
    //const scores = extract
    this.state = {
      metricRequest,
      metricOptions
    }

  }

  display(props){
    const {data, onClick, sortColumnBy, sortRowBy} = props;
    plotPipelineMatrix(this.ref, data, onClick, this.state.metricRequest,sortColumnBy, sortRowBy);
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
    return <>
      <select className={"selectMetric"} onChange={
        event => {
          this.setState({metricRequest: JSON.parse(event.target.value)})
        }
      }>
        {
          this.state.metricOptions.map(metricRequest => {
            return <option key={metricRequest['name']} value={JSON.stringify(metricRequest)}>{metricRequest['name']}</option>
          })
        }
      </select>
      <svg ref={ref => this.ref = ref}/>
      </>;
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