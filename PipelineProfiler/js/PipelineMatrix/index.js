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
    metricOptions.push({type: constants.scoreRequest.TIME, name: 'TIME (s)'});
    const metricRequest = metricOptions[0];
    //const scores = extract
    this.state = {
      metricRequest,
      metricOptions
    }

  }

  display(props, state){
    const {data, onClick, sortColumnBy, sortRowBy} = props;
    plotPipelineMatrix(this.ref, data, onClick, state.metricRequest, sortColumnBy, sortRowBy);
  }

  shouldComponentUpdate(newprops, newstate){
    this.display(newprops, newstate);
    return false;
  }

  componentDidMount(){
    this.display(this.props, this.state);
  }

  componentDidUpdate(){
    this.display(this.props, this.state);
  }



  render(){
    const {infos, pipelines, module_types: moduleTypes, module_type_order: moduleTypeOrder} = this.props.data;

    const moduleNames = Object.keys(infos);

    const svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
      constants.margin.left + constants.margin.right;
    const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight + constants.moduleImportanceHeight +
      constants.margin.top + constants.margin.bottom;

    return <div style={{position: 'relative', height: svgHeight, width: svgWidth}}>
        <svg style={{position: 'absolute'}} ref={ref => this.ref = ref}/>
        <select style={{
          position: 'absolute',
          width: constants.pipelineScoreWidth,
          left: constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length,
          top: constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 25
        }} className={"selectMetric"} onChange={
          event => {
            console.log("set state");
            console.log(event.target.value);
            this.setState({metricRequest: JSON.parse(event.target.value)})
          }
        }>
          {
            this.state.metricOptions.map(metricRequest => {
              return <option key={metricRequest['name']} value={JSON.stringify(metricRequest)}>{metricRequest['name']}</option>
            })
          }
        </select>
      </div>;
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