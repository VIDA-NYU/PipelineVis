import {createGettersSetters} from "../helpers"
import {scalePoint, scaleOrdinal} from "d3-scale";
import { line as d3Line } from 'd3-shape';
import {select} from 'd3-selection';
export function VerticalParCoord(){
  let params = {
    width: 50,
    height: 100,
  };

  function my(selection){
    selection.each(function(obj){
      const pipelines = obj.data;
      if (pipelines.length > 0){        
        const hyperparamNames = Object.keys(pipelines[0]);

        let y = scalePoint()
          .domain(hyperparamNames)
          .range([0, params.height]),
          x = {},
          line = d3Line();

        hyperparamNames.forEach(hyperparam => {
          x[hyperparam] = scaleOrdinal()
            .domain([... new Set(pipelines.map(p=>p[hyperparam]))])
            .range([0, params.width]);
        });

        const g = select(this);

        const dataGroup = g.selectAll("#data")
          .data([pipelines])
          .join(
            enter => enter
            .append("g")
            .attr("id", "data")
          );

        dataGroup.selectAll("path")
          .data(x=>x)
          .join(
            enter => enter
              .append("path")
              .attr("d", function(pipeline){
                return line(hyperparamNames.map(hyperparam=>[x[hyperparam](pipeline[hyperparam]) , y(hyperparam)]))
              })
              .style("fill", "none")
              .style("stroke", "#aaa"),
            update => update
              .attr("d", function(pipeline){
                return line(hyperparamNames.map(hyperparam=>[x[hyperparam](pipeline[hyperparam]) , y(hyperparam)]))
              })
          );

          const axisGroup = g.selectAll("#axis")
          .data([hyperparamNames])
          .join(
            enter => enter
            .append("g")
            .attr("id", "axis")
          );

          axisGroup.selectAll("line")
            .data(x=>x)
            .join(
              enter => enter
                .append("line")
                .attr("x1", 0)
                .attr("x2", params.width)
                .attr("y1", name => y(name))
                .attr("y2", name => y(name))
                .style("stroke", "#ccc")
                .style("stroke-width", "1")
            )
      }
      ///  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));

    });
  }

  createGettersSetters(my, params);

  return my;
}