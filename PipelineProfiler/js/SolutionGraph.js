import React, { PureComponent } from 'react';
import dagre from 'dagre';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';
import {getPrimitiveLabel} from './helpers';
import {select, event} from "d3-selection";
import {zoom} from "d3-zoom";

const getEvent = () => event;


class SolutionGraph extends PureComponent {

  constructor(props) {
    super(props);
    this.zoomed = this.zoomed.bind(this);
  }

  zoomed () {
    this.transformGroup.attr("transform", getEvent().transform);
  }

  setupDragZoom(ref, width, height) {
    let svg = select(ref);
    this.svg = svg;
    this.transformGroup = svg.select("#transformGroup");
    svg.call(zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 3])
      .on("zoom", this.zoomed)
    )
  }

  render() {
    try {
      const {solution} = this.props;
      if (!solution.description || !solution.description.pipeline) {
        console.log("Invalid pipeline/solution data");
        return <div/>;
      }

      var g = new dagre.graphlib.Graph();

      g.setGraph({rankdir: 'LR', nodesep: 20, ranksep: 20});
      g.setDefaultEdgeLabel(function () {
        return {};
      });
      const nodeDimentions = {width: 100, height: 55};
      solution.description.pipeline.inputs.forEach((input, idx) => {
        g.setNode(`inputs.${idx}`, {label: 'Input', ...nodeDimentions});
      });
      solution.description.pipeline.outputs.forEach((output, idx) => {
        g.setNode(`outputs.${idx}`, {label: 'Output', ...nodeDimentions});
      });

      solution.description.pipeline.steps.forEach((step, idx) => {
        g.setNode(`steps.${idx}`, {label: getPrimitiveLabel(step.primitive.python_path), ...nodeDimentions});
      });

      solution.description.pipeline.steps.forEach((step, idx) => {
        Object.keys(step.arguments).forEach(k => {
          let source = step.arguments[k].data;
          if (typeof source == "string") {
            source = [source];
          }
          source.forEach(s => {
            s = s.split('.').slice(0, 2).join('.');
            g.setEdge(s, `steps.${idx}`, {});
          })
        });
      });

      solution.description.pipeline.outputs.forEach((output, idx) => {
        let source = output.data;
        source = source.split('.').slice(0, 2).join('.');
        g.setEdge(source, `outputs.${idx}`, {});
      });

      dagre.layout(g);
      const margin = 30;
      const width =
        Math.max(...g.nodes().map(n => g.node(n).x + g.node(n).width)) + margin;
      const height =
        Math.max(...g.nodes().map(n => g.node(n).y + g.node(n).height)) + margin;

      const onClick = (graph_idx) => {
        let [nodeType, nodeIdx] = graph_idx.split(".");
        nodeIdx = parseInt(nodeIdx);
        const node = solution.description.pipeline[nodeType][nodeIdx];
        this.props.onClick(node);
      };

      return (
        <svg style={{width, height}} ref={ref => {
          this.setupDragZoom(ref, width, height)
        }}>
          <defs>
            <marker id="triangle" viewBox="0 0 10 10"
                    refX="8" refY="5"
                    markerUnits="strokeWidth"
                    markerWidth="5" markerHeight="5"
                    orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>
            </marker>
          </defs>
          <g id={"transformGroup"} transform={`translate(${margin},${margin})`}>
            {g.nodes().map(n => (
              <g
                key={n}
                transform={`translate(${g.node(n).x -
                g.node(n).width / 2},${g.node(n).y - g.node(n).height / 2})`}
              >
                <foreignObject
                  width={g.node(n).width}
                  height={g.node(n).height}
                  requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"
                >
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '10px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      border: 'solid 1px black',
                      borderColor: '#c6c6c6',
                      padding: '5px',
                    }}
                    onClick={() => onClick(n)}
                  >
                    {startCase(g.node(n).label)}
                  </div>
                </foreignObject>
              </g>
            ))}
            {g.edges().map(e => {
              return (
                <g key={e.v + e.w}>
                  <path
                    markerEnd="url(#triangle)"
                    stroke="black"
                    fill="none"
                    d={`${g
                      .edge(e)
                      .points.map(
                        (p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`,
                      )
                      .join(' ')}`}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      );
    } catch (error) {
      return <div>Error displaying pipeline.</div>
    }
  }
}

SolutionGraph.propTypes = {
  solution: PropTypes.object,
  onClick: PropTypes.func
};

SolutionGraph.defaultProps = {
  onClick: step => {}, // step of the pipeline that was clicked
};

export default SolutionGraph;
