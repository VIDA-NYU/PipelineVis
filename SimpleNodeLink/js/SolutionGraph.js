import React, { PureComponent } from 'react';
import dagre from 'dagre';
import { startCase } from 'lodash';

function getPrimitiveLabel(name) {
  const nameParts = name.split('.');
  if (name.split('.').length > 2) {
    name = nameParts.pop();
  }
  return startCase(name);
}

class SolutionGraph extends PureComponent {
  render() {
    const { solution } = this.props;
    if (!solution.description || !solution.description.pipeline) {
      console.log("Invalid pipeline/solution data");
      return <div />;
    }

    var g = new dagre.graphlib.Graph();

    g.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 20 });
    g.setDefaultEdgeLabel(function() {
      return {};
    });
    const nodeDimentions = { width: 120, height: 70 };
    solution.description.pipeline.inputs.forEach((input, idx) => {
      g.setNode(`inputs.${idx}`, { label: input.name, ...nodeDimentions });
    });
    solution.description.pipeline.outputs.forEach((output, idx) => {
      g.setNode(`outputs.${idx}`, { label: output.name, ...nodeDimentions });
    });

    solution.description.pipeline.steps.forEach((step, idx) => {
      g.setNode(`steps.${idx}`, { label: getPrimitiveLabel(step.primitive.name), ...nodeDimentions });
    });

    solution.description.pipeline.steps.forEach((step, idx) => {
      Object.keys(step.arguments).forEach(k => {
        let source = step.arguments[k].data;
        source = source.split('.').slice(0, 2).join('.');
        g.setEdge(source, `steps.${idx}`, {});
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
                      borderColor: n.startsWith('inputs')
                      ? '#40c176'
                      : (n.startsWith('outputs') ? '#c14141' : '#c6c6c6'),
                      padding: '5px',
                    }}
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

export default SolutionGraph;
