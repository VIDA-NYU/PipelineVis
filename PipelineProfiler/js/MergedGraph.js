import React, { PureComponent } from 'react';
import dagre from 'dagre';
import PropTypes from 'prop-types';
import {getPrimitiveLabel} from "./helpers";
import {zoom} from "d3-zoom";
import {select, event} from "d3-selection";
import {scaleOrdinal} from "d3-scale";
import {schemeCategory10} from "d3-scale-chromatic";

const getEvent = () => event;

function preprocessNode(node) {
  let primitives = {}; // map that keep track of primitives and what graph uses them
  for (const data of node.data) {
    let {python_path} = data;
    if (!(python_path in primitives)) {
      primitives[python_path] = [data];
    } else {
      primitives[python_path].push(data);
    }
  }
  let subnodes = [];
  Object.keys(primitives).forEach(python_path => {
    let subnode = {
      id: node.id,
      python_path: python_path,
      node_name: getPrimitiveLabel(python_path),
      origins: [],
      hyperparams: [],
    };
    primitives[python_path].forEach(obj => {
      subnode.origins.push(obj.graph_name);
      subnode.hyperparams.push(obj.hyperparams);
    });
    subnodes.push(subnode);
  });
  return subnodes;
}

class MergedGraph extends PureComponent {

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
    const { merged, selectedPipelinesColorScale } = this.props;

    if (selectedPipelinesColorScale.domain().length === 0){
      // case when rendering graph outside of Pipeline Matrix (standalone node-link graph)
      merged.nodes.forEach(node => {
        node.data.forEach(d => {
          selectedPipelinesColorScale(d.graph_name);
        })
      });
    }

    var g = new dagre.graphlib.Graph();

    g.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 20 });
    g.setDefaultEdgeLabel(function() {
      return {};
    });
    const nodeDimentions = { width: 100, height: 55 };
    merged.nodes.forEach(node => {
      const preprocessed = preprocessNode(node);
      g.setNode(node.id, {data: preprocessed, width: nodeDimentions.width, height: preprocessed.length*nodeDimentions.height})
    });

    merged.links.forEach(link => {
      g.setEdge(link.source, link.target, {});
    });

    dagre.layout(g);
    const margin = {top:50, bottom: 50, left: 30, right: 30};
    const width =
      Math.max(...g.nodes().map(n => g.node(n).x + g.node(n).width)) + margin.left + margin.right;
    const height =
      Math.max(...g.nodes().map(n => g.node(n).y + g.node(n).height)) + margin.top + margin.bottom;

    return (
      <div>

        <svg style={{width, height}} ref={(ref) => {this.setupDragZoom(ref, width, height)}}>
          <defs>
            <marker id="triangle" viewBox="0 0 10 10"
                    refX="8" refY="5"
                    markerUnits="strokeWidth"
                    markerWidth="5" markerHeight="5"
                    orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>
            </marker>
          </defs>
          <g id={"transformGroup"} transform={`translate(${margin.left},${margin.top})`}>
            {g.nodes().map(n => {
              return <g
                key={n}
                transform={`translate(${g.node(n).x -
                g.node(n).width / 2},${g.node(n).y - g.node(n).height / 2})`}
              >
                <foreignObject
                  width={g.node(n).width}
                  height={g.node(n).height}
                  requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"
                >
                  <div>
                    {
                      g.node(n).data.map((node, idx) => {
                        const sourceBarWidth = nodeDimentions.width/node.origins.length;
                        let sourceBars = null;
                        if (node.origins.length < selectedPipelinesColorScale.domain().length){
                          sourceBars = <div style={{display: 'flex', width:nodeDimentions.width, height: 5}}>
                            {
                              node.origins.map(origin => {
                                return <div key={origin}
                                            style={{
                                              width: sourceBarWidth,
                                              height: 5,
                                              background: selectedPipelinesColorScale(origin)
                                            }}
                                />
                              })
                            }
                          </div>;
                        }

                        return <div key={idx}>
                            {sourceBars}
                          <div
                            style={{
                              position: 'relative',
                              textAlign: 'center',
                              fontSize: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: (nodeDimentions.height - 5) + "px",
                              border: 'solid 1px black',
                              borderColor: '#c6c6c6',
                              padding: '5px',
                            }}
                          >
                            {node.node_name}
                          </div>
                        </div>
                      })
                    }
                  </div>
                </foreignObject>
              </g>
            })}
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
      </div>
    );
  }
}

MergedGraph.defaultProps = {
  selectedPipelinesColorScale: scaleOrdinal(schemeCategory10)
};

MergedGraph.propTypes = {
  merged: PropTypes.object.isRequired,
  selectedPipelinesColorScale: PropTypes.func,
};

export default MergedGraph;
