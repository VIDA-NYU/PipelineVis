import {Component} from "react";
import PropTypes from 'prop-types';
import {plotPipelineMatrix} from "./plotPipelineMatrix";

export class PipelineMatrix extends Component {
  display(){
    const {data, onClick} = this.props;
    plotPipelineMatrix(this.ref, data, onClick);
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

PipelineMatrix.defaultProps = {
  onClick: ()=>{}
};

PipelineMatrix.propTypes = {
  data: PropTypes.object.isRequired,
  onClick: PropTypes.func
};