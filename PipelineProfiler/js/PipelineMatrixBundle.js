import React, { Component } from "react";
import PropTypes from 'prop-types';
import {PipelineMatrix} from "./PipelineMatrix";
import SolutionGraph from "./SolutionGraph";
import {scaleOrdinal} from "d3-scale";
import {select} from "d3-selection";
import {schemeCategory10} from "d3-scale-chromatic";
import {Snackbar, Button, Checkbox, FormControlLabel, IconButton} from "@material-ui/core";
import CombinatorialImportanceMatrix from "./CombinatorialImportanceMatrix";

import {
  computePrimitiveImportances,
  constants,
  extractMetric,
  extractMetricNames,
  createHyperparamTableDataFromNode,
  computePrimitiveHyperparameterData,
  getPrimitiveLabel,
} from "./helpers";

import MergedGraph from "./MergedGraph";
import Table from "./Table";
import {MyDropdown} from "./MyDropdown";

import CloseIcon from '@material-ui/icons/Close';

const newSchemeCategory10 = schemeCategory10;

export class PipelineMatrixBundle extends Component {
  constructor(props){
    super(props);
    let pipelines = props.data.pipelines;
    let moduleNames = Object.keys(props.data.infos);
    const metricNames = extractMetricNames(props.data.pipelines);
    let metricOptions = metricNames.map(name => ({type: constants.scoreRequest.D3MSCORE, name}));
    metricOptions.push({type: constants.scoreRequest.TIME, name: 'TIME (s)'});
    const metricRequest = metricOptions[0];
    const importances = computePrimitiveImportances(props.data.infos, props.data.pipelines, metricRequest);
    const sortColumnsBy = constants.sortModuleBy.importance,
      sortRowsBy = constants.sortPipelineBy.pipeline_score;

    pipelines = this.computeSortedPipelines(pipelines, sortRowsBy, metricRequest);
    moduleNames = this.computeSortedModuleNames(moduleNames, sortColumnsBy, importances, this.props.data.infos);

    this.requestMergeGraph = () => {console.error(new Error("Cannot find Jupyter namespace from javascript."))};
    this.requestExportPipelines = () => {console.error(new Error("Cannot find Jupyter namespace from javascript"))};
    this.requestPowersetAnalysis = () => {console.error(new Error("Cannot find Jupyter namespace from javascript"))};
    if (window.Jupyter !== undefined) {
      // "Merge pipelines" connection to jupyter

      const commMerge = Jupyter.notebook.kernel.comm_manager.new_comm('merge_graphs_comm_api', {'foo': 6});

      this.requestMergeGraph = (pipelines) => {
        commMerge.send({pipelines});
        this.setState({mergedGraph: null});
      };

      // Register a handler
      commMerge.on_msg(msg => {
        const mergedGraph = msg.content.data.merged;
        this.setState({ mergedGraph });
      });

      // "Export pipelines" connection to jupyter

      const commExport = Jupyter.notebook.kernel.comm_manager.new_comm('export_pipelines_comm_api', {'foo': 6});

      this.requestExportPipelines = (pipelines) => {
        commExport.send({ pipelines });
      };


      // "Powerset analysis" connection to jupyter

      const commPowerset = Jupyter.notebook.kernel.comm_manager.new_comm('powerset_analysis_comm_api', {'foo': 6});
      this.requestPowersetAnalysis = (pipelines, scores) => {
        commPowerset.send({ pipelines, scores })
      };

      commPowerset.on_msg(msg => {
        const powersetAnalysis = msg.content.data.analysis;
        this.setState({ powersetAnalysis })
      })
    }

    this.state = {
      pipelines,
      selectedPipelines: [],
      selectedPipelinesColorScale: () => {},
      sortColumnsBy,
      sortRowsBy,
      metricRequest,
      metricOptions,
      importances,
      moduleNames,
      powersetAnalysis: null,
      mergedGraph: null,
      hoveredPrimitive: null,
      expandedPrimitive: null,
      expandedPrimitiveData: null,
      sortColumnsDropdownHidden: true,
      sortRowsDropdownHidden: true,
      keepSorted: true,
      exportedPipelineMessage: false,
      highlightPowersetColumns: []
    };

  }

  componentDidCatch(error, info) {
    console.log(error);
    this.setState({selectedPipelines: []})
  }

  computeSortedPipelines(pipelines, sortPipelinesBy, metricRequest){
    const selectedScores = extractMetric(pipelines, metricRequest);
    const selectedScoresDigests = selectedScores.map((score, idx) => ({score, pipeline_digest: pipelines[idx].pipeline_digest}));
    const selectedScoresDigestsMap = {};
    selectedScoresDigests.forEach(x => {
      selectedScoresDigestsMap[x.pipeline_digest] = x.score;
    });

    let newPipelines = [...pipelines];
    if (sortPipelinesBy === constants.sortPipelineBy.pipeline_score){
      newPipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
    } else if (sortPipelinesBy === constants.sortPipelineBy.pipeline_source){
      newPipelines.sort((a, b) => selectedScoresDigestsMap[b.pipeline_digest] - selectedScoresDigestsMap[a.pipeline_digest]);
      newPipelines.sort((a, b) => {
        const aname = a.pipeline_source.name;
        const bname = b.pipeline_source.name;
        const asplit = aname.split("#");
        const bsplit = bname.split("#");
        const asource = asplit[0];
        const bsource = bsplit[0];

        if (asource > bsource){
          return 1;
        } else if (bsource > asource){
          return -1;
        } else{
          return 0
        }
      });
    }
    return newPipelines;
  }

  computeSortedModuleNames(moduleNames, sortModulesBy, importances, infos){
    let newModuleNames = [...moduleNames];
    if (sortModulesBy === constants.sortModuleBy.importance) {
      newModuleNames.sort((a, b) => importances[b] - importances[a]);
    } else if (sortModulesBy === constants.sortModuleBy.moduleType) {
      const {moduleTypeOrder, moduleTypeOrderMap} = constants;
      const maxNumber = moduleTypeOrder.length;
      let newIdx = maxNumber;
      newModuleNames.forEach(name => {
        if (!(infos[name]['module_type'] in moduleTypeOrderMap)){
          moduleTypeOrderMap[infos[name]['module_type']] = newIdx;
          newIdx++;
        }
      });

      newModuleNames.sort((a, b) => importances[b] - importances[a]);
      newModuleNames.sort((a, b) => moduleTypeOrderMap[infos[a]['module_type']] - moduleTypeOrderMap[infos[b]['module_type']]);
    }
    return newModuleNames;
  }

  cleanMouseOver() {
    this.setState({hoveredPrimitive: null, tooltipPosition: null});
    select(this.ref).select("#highlight_row").style("fill", "#00000000");
    select(this.ref).select("#highlight_col").style("fill", "#00000000");
    select(this.ref).select("#module_names").selectAll("text").style("font-weight", "normal");
    select(this.ref).select("#legendPipelineSourceGroup").selectAll("text").style("font-weight", "normal");
  }

  createHyperparamInfo(){
    const {hoveredPrimitive, tooltipPosition} = this.state;
    let tooltip, primitiveName;
    if (hoveredPrimitive.primitive) {
      primitiveName = hoveredPrimitive.primitive.python_path;
      primitiveName = primitiveName.split(".").slice(3).join(".");
    } else if (hoveredPrimitive.name) {
      primitiveName = hoveredPrimitive.name;
    }
    const tooltipTableData = createHyperparamTableDataFromNode(hoveredPrimitive);
    const columns = [{
      Header: 'Hyperparameter',
      accessor: x => x.name
    }, {
      Header: 'Value',
      accessor: x => JSON.stringify(x.value)
    }];
    const tooltipStyle = {
      padding: 15,
      borderRadius: 12,
      borderStyle: 'solid',
      background: "#FFFFFF",
      position: 'fixed',
      borderWidth: 'thin',
      borderColor: '#aaaaaa',
      zIndex: 99999,
    };

    const tooltipHeader = <>
      <p><strong>Path:</strong> {primitiveName}</p>
      <p><strong>Type:</strong> {this.props.data.infos[hoveredPrimitive.primitive.python_path].module_type}</p>
    </>;

    if (tooltipTableData) {
      tooltip = <div style={{...tooltipStyle, left: tooltipPosition[0] + 30, top: tooltipPosition[1]}}>
        {tooltipHeader}
        <Table columns={columns} data={tooltipTableData}/>
      </div>;
    } else {
      tooltip = <div style={{...tooltipStyle, left: tooltipPosition[0] + 30, top: tooltipPosition[1]}}>
        {tooltipHeader}
        <p>No hyperparameters set.</p>
      </div>;
    }
    return tooltip;
  }

  render(){
    const {data} = this.props;
    const {
      selectedPrimitive,
      hoveredPrimitive,
      tooltipPosition,
      drop,
      keepSorted,
      sortColumnsBy,
      sortRowsBy,
      powersetAnalysis,
      highlightPowersetColumns
    } = this.state;
    const {sortModuleBy, sortPipelineBy} = constants;

    let primitiveName = "";
    let primitiveHyperparamsView = null;
    if (selectedPrimitive) {
      if (selectedPrimitive.primitive) {
        primitiveName = selectedPrimitive.primitive.python_path;
      } else if (selectedPrimitive.name) {
        primitiveName = selectedPrimitive.name;
      }
      const tableData = createHyperparamTableDataFromNode(selectedPrimitive);
      const columns = [{
        Header: 'Hyperparameter',
        accessor: x => x.name
      }, {
        Header: 'Value',
        accessor: x => x.value
      }];
      if (tableData) {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <Table columns={columns} data={tableData}/>
        </>;
      } else {
        primitiveHyperparamsView = <>
          <p><strong>Primitive Name:</strong> {primitiveName}</p>
          <p>No hyperparameters set.</p>
          </>;
      }
    }

    if (!this.state.pipelines) {
      return <div/>;
    }


    let pipelineGraph = null;

    if (this.state.selectedPipelines && this.state.selectedPipelines.length > 0 ){
      if (this.state.selectedPipelines.length === 1) {
        pipelineGraph = <>
          <p><strong>Pipeline Digest: </strong> {this.state.selectedPipelines[0].pipeline_digest}</p>
          <SolutionGraph
            solution={ {description: {
                pipeline: this.state.selectedPipelines[0]
              }} }
            onClick={node => {
              this.setState({selectedPrimitive: node})
            }}
          />
        </>;
      } else { //(this.state.selectedPipelines.length > 1)
        if (this.state.mergedGraph) {
          pipelineGraph = <MergedGraph
            merged={this.state.mergedGraph}
            selectedPipelinesColorScale={this.state.selectedPipelinesColorScale}
          />;
        }
      }
    }


    let tooltip = null;
    if (hoveredPrimitive) {
      tooltip = this.createHyperparamInfo(hoveredPrimitive);
    }

    let powersetTable = null;
    if (powersetAnalysis) {
      powersetTable = <CombinatorialImportanceMatrix
        powersetAnalysis={powersetAnalysis}
        onClick={(d) => {this.setState({highlightPowersetColumns: d.group})}}
      />
    }

    const getUsedPrimitives = (pipelines) => {
      const primitives = {};
      pipelines.forEach(pipeline => {
        pipeline['steps'].forEach(step => {
          primitives[step['primitive']['python_path']] = true;
        });
      });
      return primitives;
    };

    const updateMetric = (pipelines) => {
      const importances = computePrimitiveImportances(this.props.data.infos, pipelines, this.state.metricRequest);

      if (keepSorted) {
        if (sortColumnsBy === sortModuleBy.importance){
          const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.importance, importances, this.props.data.infos);
          this.setState({moduleNames: newModuleNames});
        }else if (sortColumnsBy === sortModuleBy.moduleType) {
          const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.moduleType, importances, this.props.data.infos);
          this.setState({moduleNames: newModuleNames});
        }

        if (sortRowsBy === sortPipelineBy.pipeline_score){
          const newPipelines = this.computeSortedPipelines(pipelines, sortPipelineBy.pipeline_score, this.state.metricRequest);
          this.setState({pipelines: newPipelines});
        } else if (sortRowsBy === sortPipelineBy.pipeline_source){
          const newPipelines = this.computeSortedPipelines(pipelines, sortPipelineBy.pipeline_source, this.state.metricRequest);
          this.setState({pipelines: newPipelines});
        }
      }
      this.setState({importances});
      return importances;
    };

    return <div ref={ref=>{this.ref = ref}}>
      <div style={{display: 'flex'}}>

        <MyDropdown
          buttonText={"Edit"}
          options={[
            {
              name: 'Remove selected',
              action: () => {
                const newPipelines = this.state.pipelines.filter(pipeline => {
                  const found = this.state.selectedPipelines.find(selected => selected.pipeline_digest === pipeline.pipeline_digest);
                  return typeof found === 'undefined';
                });

                const usedPrimitives = getUsedPrimitives(newPipelines);
                let newModuleNames = this.state.moduleNames.filter(name => name in usedPrimitives);

                const importances = updateMetric(newPipelines);
                newModuleNames = this.computeSortedModuleNames(newModuleNames, this.state.sortColumnsBy, importances, this.props.data.infos);
                this.setState({pipelines: newPipelines, selectedPipelines: [], moduleNames: newModuleNames});
              }
            },
            {
              name: 'Remove unselected',
              action: () => {
                const newPipelines = this.state.pipelines.filter(pipeline => {
                  const found = this.state.selectedPipelines.find(selected => selected.pipeline_digest === pipeline.pipeline_digest);
                  return typeof found !== 'undefined';
                });
                const usedPrimitives = getUsedPrimitives(newPipelines);
                let newModuleNames = this.state.moduleNames.filter(name => name in usedPrimitives);

                const importances = updateMetric(newPipelines);
                newModuleNames = this.computeSortedModuleNames(newModuleNames, this.state.sortColumnsBy, importances, this.props.data.infos);
                this.setState({pipelines: newPipelines, selectedPipelines: [], moduleNames: newModuleNames});
              }
            }
          ]}
        />

        <MyDropdown
          buttonText={"Export"}
          options={[
            {
              name: 'Export selected',
              action: () => {
                const newPipelines = this.state.pipelines.filter(pipeline => {
                  const found = this.state.selectedPipelines.find(selected => selected.pipeline_digest === pipeline.pipeline_digest);
                  return typeof found !== 'undefined';
                });
                this.requestExportPipelines(newPipelines);
                this.setState({exportedPipelineMessage: true});
              }
            },
            {
              name: 'Export all',
              action: () => {
                const newPipelines = this.state.pipelines.filter(pipeline => {
                  const found = this.state.selectedPipelines.find(selected => selected.pipeline_digest === pipeline.pipeline_digest);
                  return typeof found === 'undefined';
                });
                this.requestExportPipelines(newPipelines);
                this.setState({exportedPipelineMessage: true});
              }
            }
          ]}
        />

        <MyDropdown
          buttonText={"Sort Primitives"}
          options={[
            {
              name: 'By importance',
              action: () => {
                const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.importance, this.state.importances, this.props.data.infos);
                this.setState({sortColumnsBy: sortModuleBy.importance, moduleNames: newModuleNames});
              }
            },
            {
              name: 'By type',
              action: () => {
                const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.moduleType, this.state.importances, this.props.data.infos);
                this.setState({sortColumnsBy: sortModuleBy.moduleType, moduleNames: newModuleNames});
              }
            }
          ]}
        />
        <div style={{marginLeft: 10}}/>
        <MyDropdown
          buttonText={"Sort Pipelines"}
          options={[
            {
              name: 'By score',
              action: () => {
                const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_score, this.state.metricRequest);
                this.setState({pipelines: newPipelines, sortRowsBy: sortPipelineBy.pipeline_score});
              }
            },
            {
              name: 'By source',
              action: () => {
                const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_source, this.state.metricRequest);
                this.setState({pipelines: newPipelines, sortRowsBy: sortPipelineBy.pipeline_source});
              }
            }
          ]}
        />

        <div style={{marginLeft: 10}}/>
        <MyDropdown
          buttonText={"Combinatorial Analysis"}
          options={[
            {
              name: 'Run',
              action: () => {
                const scores = extractMetric(this.state.pipelines, this.state.metricRequest);
                this.requestPowersetAnalysis(this.state.pipelines, scores);
                this.setState({expandedPrimitive: null, expandedPrimitiveData: null});
              }
            },
            {
              name: 'Clear',
              action: () => {
                this.setState({ powersetAnalysis: null, highlightPowersetColumns: [], expandedPrimitive: null, expandedPrimitiveData: null })
              }
            }
          ]}
        />

        <div style={{marginLeft: 10, marginTop: -4}}>
        <FormControlLabel
          control={
            <Checkbox
              checked={keepSorted}
              inputProps={{ 'aria-label': 'primary checkbox' }}
              onChange={() => {
                if (!keepSorted) {
                  if (sortColumnsBy === sortModuleBy.importance){
                    const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.importance, this.state.importances, this.props.data.infos);
                    this.setState({moduleNames: newModuleNames});
                  }else if (sortColumnsBy === sortModuleBy.moduleType) {
                    const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.moduleType, this.state.importances, this.props.data.infos);
                    this.setState({moduleNames: newModuleNames});
                  }

                  if (sortRowsBy === sortPipelineBy.pipeline_score){
                    const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_score, this.state.metricRequest);
                    this.setState({pipelines: newPipelines});
                  } else if (sortRowsBy === sortPipelineBy.pipeline_source){
                    const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_source, this.state.metricRequest);
                    this.setState({pipelines: newPipelines});
                  }
                }
                this.setState((prevState, props) => ({
                  keepSorted: !prevState.keepSorted
                }));
              }}
            />
          }
          label="KEEP SORTED"
        />
        </div>
      </div>

      {powersetTable}

      <PipelineMatrix
        data={data}
        pipelines={this.state.pipelines}
        selectedPipelines={this.state.selectedPipelines}
        selectedPipelinesColorScale={this.state.selectedPipelinesColorScale}
        onSelectExpandedPrimitive={python_path=>{
          if (this.state.expandedPrimitive === python_path){
            this.setState({expandedPrimitive: null, expandedPrimitiveData: null});
          } else{
            const expandedPrimitiveData = computePrimitiveHyperparameterData(this.state.pipelines, python_path);
            this.setState({expandedPrimitive: python_path, expandedPrimitiveData});
          }
        }}
        expandedPrimitiveData={this.state.expandedPrimitiveData}
        expandedPrimitiveName={this.state.expandedPrimitive}
        onClick={
          (selectedPipeline, shift) => {
            let selectedPipelinesColorScale = scaleOrdinal(newSchemeCategory10);
            let newSelectedPipelines;
            if (!shift) {
              // Just set one item as the selected
              newSelectedPipelines = [selectedPipeline];
            } else {
              // Select multiple pipelines
              const digest = selectedPipeline.pipeline_digest;
              newSelectedPipelines = this.state.selectedPipelines.filter(elem => elem.pipeline_digest !== digest);
              if (newSelectedPipelines.length === this.state.selectedPipelines.length) {
                newSelectedPipelines.push(selectedPipeline);
              }
              this.requestMergeGraph(newSelectedPipelines);
            }
            newSelectedPipelines.forEach(pipeline => {selectedPipelinesColorScale(pipeline.pipeline_digest)});
            this.setState({selectedPipelines: newSelectedPipelines, selectedPrimitive: null, selectedPipelinesColorScale})
          }
        }
        metricRequestChange={metricRequest => {
          const importances = computePrimitiveImportances(this.props.data.infos, this.state.pipelines, metricRequest);

          if (keepSorted) {
            if (sortColumnsBy === sortModuleBy.importance){
              const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.importance, importances, this.props.data.infos);
              this.setState({moduleNames: newModuleNames});
            }else if (sortColumnsBy === sortModuleBy.moduleType) {
              const newModuleNames = this.computeSortedModuleNames(this.state.moduleNames, sortModuleBy.moduleType, importances, this.props.data.infos);
              this.setState({moduleNames: newModuleNames});
            }

            if (sortRowsBy === sortPipelineBy.pipeline_score){
              const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_score, metricRequest);
              this.setState({pipelines: newPipelines});
            } else if (sortRowsBy === sortPipelineBy.pipeline_source){
              const newPipelines = this.computeSortedPipelines(this.state.pipelines, sortPipelineBy.pipeline_source, metricRequest);
              this.setState({pipelines: newPipelines});
            }
          }
          this.setState({metricRequest, importances});
        }}
        sortColumnBy={this.state.sortColumnsBy}
        sortRowBy={this.state.sortRowsBy}
        metricRequest={this.state.metricRequest}
        metricOptions={this.state.metricOptions}
        importances={this.state.importances}
        moduleNames={this.state.moduleNames}
        onHover={(pipeline, moduleName, mouse) => {
          if (pipeline && moduleName){
            const step = pipeline.steps.find(step => step.primitive.python_path === moduleName);
            if (step){
              this.setState({hoveredPrimitive: step, tooltipPosition: mouse})
            } else {
              this.setState({hoveredPrimitive: null})
            }
          } else {
            this.setState({hoveredPrimitive: null});
          }
        }}
        highlightPowersetColumns={highlightPowersetColumns}
        onReversePipelinesClick={() => {
          let newPipelines = [...this.state.pipelines];
          newPipelines.reverse();
          this.setState({pipelines: newPipelines});
        }}
      />
      {tooltip}
      <div onMouseMove={()=>{this.cleanMouseOver()}}>
      {pipelineGraph}
      {primitiveHyperparamsView}
      <div style={{height: 100, width:"100%"}}/>
      </div>
      <Snackbar open={this.state.exportedPipelineMessage} onClose={() => {this.setState({exportedPipelineMessage: false})}}
                message={"Pipelines exported. Access with `PipelineProfiler.get_exported_pipelines()`"}
                autoHideDuration={6000}
                action={<IconButton size="small" aria-label="close" color="inherit" onClick={() => this.setState({exportedPipelineMessage: false})}>
                  <CloseIcon fontSize="small" />
                </IconButton>}
      />
    </div>
  }
}

PipelineMatrixBundle.propTypes = {
  data: PropTypes.object.isRequired,
};
