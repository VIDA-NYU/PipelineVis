import React, { PureComponent } from 'react';
import dagre from 'dagre';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';
import {getPrimitiveLabel} from "./helpers";
import {schemeCategory10} from 'd3-scale-chromatic';
import {scaleOrdinal} from "d3-scale";

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
      node_name: primitives[python_path][0]['node_name'],
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
  render() {
    const { merged } = this.props;
    const sourceGraphColorScale = scaleOrdinal(schemeCategory10);

    var g = new dagre.graphlib.Graph();

    g.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 20 });
    g.setDefaultEdgeLabel(function() {
      return {};
    });
    const nodeDimentions = { width: 100, height: 55 };
    merged.nodes.forEach(node => {
      const preprocessed = preprocessNode(node);
      preprocessed.forEach(subnode => {
        subnode.origins.forEach(origin => {
          sourceGraphColorScale(origin);
        });
      });
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
        <div style={{display: 'flex'}}>
          {
            sourceGraphColorScale.domain().map(sourceGraph => {
              return <div style={{display: 'flex', marginRight: 20}}>
                <div style={{width: 20, height: 20, background: sourceGraphColorScale(sourceGraph)}}/>
                <div style={{marginLeft: 5}}>{sourceGraph}</div>
              </div>;
            })
          }
        </div>
        <svg style={{width, height}}>
          <g transform={`translate(${margin.left},${margin.top})`}>
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

                        return <div
                          key={idx}
                          style={{
                            position: 'relative',
                            textAlign: 'center',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: nodeDimentions.height + "px",
                            border: 'solid 1px black',
                            borderColor: '#c6c6c6',
                            padding: '5px',
                          }}
                        >
                          <div style={{position: 'absolute', left: 0, top: 0, display: 'flex'}}>
                            {
                            node.origins.map(origin => {
                              return <div key={origin}
                                style={{
                                width: sourceBarWidth,
                                height: 10,
                                background: sourceGraphColorScale(origin)
                              }}
                              />
                            })
                            }
                          </div>
                          {getPrimitiveLabel(node.node_name)}
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

MergedGraph.propTypes = {
  solution: PropTypes.object,
  onClick: PropTypes.func
};

MergedGraph.defaultProps = {
  onClick: step => {}, // step of the pipeline that was clicked
};

export default MergedGraph;
