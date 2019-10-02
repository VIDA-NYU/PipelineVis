import React from "react";
import ReactDOM from "react-dom";
import { select } from "d3-selection";
import SolutionGraph from "./SolutionGraph"

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