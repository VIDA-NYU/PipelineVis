import React from "react";
import ReactDOM from "react-dom";
import { select } from "d3-selection";
import SolutionGraph from "./SolutionGraph"
import {PipelineMatrix} from "./PipelineMatrix";
import {PipelineMatrixBundle} from "./PipelineMatrixBundle";

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
		<PipelineMatrix data={data}/>
		, select(divName).node());
}

export function renderPipelineMatrixBundle(divName, data){
	ReactDOM.render(
		<PipelineMatrixBundle data={data}/>
	, select(divName).node());
}