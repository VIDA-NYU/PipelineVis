import React, {Component, PureComponent} from "react";
import PropTypes from "prop-types";
import {getPrimitiveLabel} from "./helpers";
import Table from "./Table";
import { select } from "d3-selection";
import { axisTop } from "d3-axis";
import { scaleLinear } from "d3-scale";

const margin = 10;

class _HorizontalAxis extends Component {
  plotAxis() {
    const svg = select(this.ref);
    const scale = scaleLinear()
      .domain([-1, 1])
      .range([margin, this.props.width - margin]);
    const axis = axisTop(scale)
      .ticks(5);
    svg.selectAll("*").remove();
    svg.append("g")
      .attr("transform", "translate(0, 20)")
      .call(axis);
  }

  componentDidMount() {
    this.plotAxis();
  }

  render() {
    return <svg style={{width: this.props.width, height: 21}} ref={ref => this.ref = ref}/>
  }
}

class CombinatorialImportanceMatrix extends PureComponent{
  render (){
    const {onClick, powersetAnalysis} = this.props;
    const width = 150;
    const powersetColumns = [
      {
        Header: 'Columns',
        accessor: (d) => <div style={{display: "flex"}}>
          {d.group.map(getPrimitiveLabel).map(x=>
            <div
              style={{
              padding: 5,
              borderRadius: 5,
              marginLeft: 10,
              backgroundColor: "#8f8f8f",
              color: "#FFFFFF"
            }}
             key={x}
            >{x}</div>
          )}
        </div>
      },
      {
        Header: <div>
          <div>Contribution</div>
          <div><_HorizontalAxis width={width}/></div>
        </div>,
        accessor: (d) => <div
          style={{
            marginLeft: margin,
            width: width - 2*margin,
            display: 'flex',
            marginRight: 0,
            marginTop:0,
            marginBottom: 0,
            padding: 0
          }}
          title={d.importance}
        >
          <div style={{width: width/2}}>
            {d.importance < 0 ?
              <div style={{display: 'flex'}}>
                <div style={{width: `${(1-d.importance) * 100}%`, margin: 0, padding: 0, overflow: 'hidden'}}>&nbsp;</div>
                <div style={{width: `${-d.importance * 100}%`, backgroundColor: "#9d989e", margin: 0, padding: 0, overflow: 'hidden'}}>&nbsp;</div>
              </div>
              : null}
          </div>
          <div style={{width: width/2}}>
            {d.importance > 0 ? <div style={{width: `${d.importance * 100}%`, backgroundColor: "#9d989e", margin: 0, padding: 0, overflow: 'hidden'}}>&nbsp;</div> : null}
          </div>
        </div>
      }
    ];
    return <Table
      columns={powersetColumns}
      data={powersetAnalysis}
      onClick={onClick}
    />
  }
}

CombinatorialImportanceMatrix.propTypes = {
  powersetAnalysis: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired
};

export default CombinatorialImportanceMatrix;