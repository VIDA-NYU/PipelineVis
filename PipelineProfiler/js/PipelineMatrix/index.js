import React, {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";
import "./pipelineMatrix.css";
import {constants} from "../helpers";

export class PipelineMatrix extends Component {

  constructor(props) {
    super(props);
  }

  display(props){
    const {
      data,
      pipelines,
      onClick,
      onHover,
      onSelectExpandedPrimitive,
      moduleNames,
      importances,
      selectedPipelines,
      metricRequest,
      selectedPipelinesColorScale
    } = props;
    
    plotPipelineMatrix(
      this.ref,
      data,
      pipelines,
      moduleNames,
      importances,
      selectedPipelines,
      selectedPipelinesColorScale,
      onClick,
      onHover,
      onSelectExpandedPrimitive,
      metricRequest
    );
  }

  shouldComponentUpdate(newprops, newstate){
    this.display(newprops);
    return newprops.moduleNames.length !== this.props.moduleNames.length || this.props.pipelines.length !== newprops.pipelines.length;
  }

  componentDidMount(){
    this.display(this.props);
  }

  componentDidUpdate(prevProps, prevState){
    this.display(this.props);
  }

  render(){
    const {pipelines, moduleNames} = this.props;

    const svgWidth = constants.pipelineNameWidth + moduleNames.length * constants.cellWidth + constants.pipelineScoreWidth +
      constants.margin.left + constants.margin.right;
    const svgHeight = pipelines.length * constants.cellHeight + constants.moduleNameHeight + constants.moduleImportanceHeight +
      constants.margin.top + constants.margin.bottom;

    return <div style={{position: 'relative', height: svgHeight, width: svgWidth}}>
        <svg style={{position: 'absolute', left: 0, top: 0}} ref={ref => this.ref = ref}/>
        <select style={{
          position: 'absolute',
          width: constants.pipelineScoreWidth,
          left: constants.margin.left + constants.pipelineNameWidth + constants.cellWidth * moduleNames.length,
          top: constants.margin.top + constants.moduleNameHeight + constants.moduleImportanceHeight - 25
        }} className={"selectMetric"} onChange={
          event => {
            this.props.metricRequestChange(JSON.parse(event.target.value));
          }
        }>
          {
            this.props.metricOptions.map(metricRequest => {
              return <option key={metricRequest['name']} value={JSON.stringify(metricRequest)}>{metricRequest['name']}</option>
            })
          }
        </select>
      </div>;
  }
}

PipelineMatrix.defaultProps = {
  onClick: ()=>{},
  onHover: ()=>{},
  selectedPipelinesColorScale: () => {},
  onSelectExpandedPrimitive: ()=>{}
};

PipelineMatrix.propTypes = {
  data: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onHover: PropTypes.func,
  onSelectExpandedPrimitive: PropTypes.func,
  selectedPipelines: PropTypes.array.isRequired,
  selectedPipelinesColorScale: PropTypes.func,
  pipelines: PropTypes.array.isRequired,
  importances: PropTypes.object.isRequired,
  metricRequestChange: PropTypes.func.isRequired,
  sortColumnBy: PropTypes.string,
  metricRequest: PropTypes.object.isRequired,
  metricOptions: PropTypes.array.isRequired,
  sortRowBy: PropTypes.string,
  moduleNames: PropTypes.array.isRequired,
};