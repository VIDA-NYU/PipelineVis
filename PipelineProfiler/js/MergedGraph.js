import React, { PureComponent } from 'react';
import dagre from 'dagre';
import { startCase } from 'lodash';
import PropTypes from 'prop-types';

function preprocessNode(node) {
  let primitives = {}; // map that keep track of primitives and what graph uses them
  for (const data of node.data) {
    let {python_path} = data;
    /*[{'data': [{'python_path': 'Input',
        'hyperparams': {},
        'graph_name': ''},
        {'python_path': 'Input', 'hyperparams': {}, 'graph_name': ''}],
      'id': 'inputs.0'},*/
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

    var g = new dagre.graphlib.Graph();

    g.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 20 });
    g.setDefaultEdgeLabel(function() {
      return {};
    });
    const nodeDimentions = { width: 120, height: 70 };
    merged.nodes.forEach(node => {
      const preprocessed = preprocessNode(node);
      g.setNode(node.id, {data: preprocessed, width: nodeDimentions.width, height: preprocessed.length*nodeDimentions.height})
    });

    merged.links.forEach(link => {
      g.setEdge(link.source, link.target, {});
    });

    dagre.layout(g);
    const margin = 30;
    const width =
      Math.max(...g.nodes().map(n => g.node(n).x + g.node(n).width)) + margin;
    const height =
      Math.max(...g.nodes().map(n => g.node(n).y + g.node(n).height)) + margin;

    return (
      <svg style={{width, height}}>
        <g transform={`translate(${margin},${margin})`}>
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
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    border: 'solid 1px black',
                    borderColor: '#c6c6c6',
                    padding: '5px',
                  }}
                >
                  {JSON.stringify(g.node(n).data.map(node => node.python_path))}
                </div>
              </foreignObject>
            </g>
          ))}
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
