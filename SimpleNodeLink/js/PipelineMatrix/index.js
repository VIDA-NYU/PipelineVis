import {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";

export class PipelineMatrix extends Component {
  display(){
    const {data} = this.props;
    plotPipelineMatrix(this.ref, data);
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
    return <div ref={ref => this.ref = ref}/>
  }
}

PipelineMatrix.propTypes = {
  data: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};