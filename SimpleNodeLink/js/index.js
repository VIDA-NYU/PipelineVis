import React from "react";
import ReactDOM from "react-dom";
import { select } from "d3-selection";
import SolutionGraph from "./SolutionGraph"
import {PipelineMatrix} from "./PipelineMatrix";

export function renderPipelineNodeLink(divName, data){
	const wrapped_data = {
			description: {
				pipeline: data
			}
		};
  ReactDOM.render(
      <SolutionGraph solution={wrapped_data}/>
    , select(divName).node());
}

export function renderPipelineMatrix(divName, data){
	ReactDOM.render(
		<PipelineMatrix data={data} width={500} height={500}/>
		, select(divName).node());
}