import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Table from "./Table";

export const PrimitiveTableLevels = {
  PRIMITIVE: 'PRIMITIVE',
  HYPERPARAM: 'HYPERPARAMS',
  VALUE: 'VALUE'
};

function createPrimitiveTableData(primitiveMetadata) {
  const columns = [
    {
      Header: 'Primitive',
      accessor: x => x.primitiveName
    }, {
      Header: 'Number of Hyperparameters',
      accessor: x => x.numHyperparameters
    }];

  const primitiveKeys = Object.keys(primitiveMetadata);
  const data = primitiveKeys.map(primitiveKey => {
    const row = {
      primitiveName: primitiveKey,
      numHyperparameters: Object.keys(primitiveMetadata[primitiveKey].hyperparams).length
    };
    return row;
  });
  data.sort((a,b) => b.numHyperparameters - a.numHyperparameters)
  return {data, columns};
}

function createHyperparamsTableData(primitiveMetadata, selectedPrimitive) {
  const columns = [
    {
      Header: 'Hyperparam',
      accessor: x => x.hyperparamName
    }, {
      Header: 'Number of unique values',
      accessor: x => x.numValues
    }];


  const hyperparams = primitiveMetadata[selectedPrimitive].hyperparams;
  const data = Object.keys(hyperparams).map(hyperparameterKey => {
    const row = {
      hyperparamName: hyperparameterKey,
      numValues: Object.keys(hyperparams[hyperparameterKey].values).length
    };
    return row;
  });
  data.sort((a,b) => b.numValues - a.numValues);
  return {data, columns};
}

class PrimitiveTable extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      level: PrimitiveTableLevels.PRIMITIVE,
      selectedPrimitive: null,
    }
  }

  render() {
    const {primitiveMetadata} = this.props;
    const {level, selectedPrimitive} = this.state;


    switch (level) {
      case PrimitiveTableLevels.PRIMITIVE:
        const {data: dataPrimitive, columns: columnsPrimitive} = createPrimitiveTableData(primitiveMetadata);
        return <Table
          columns={columnsPrimitive}
          data={dataPrimitive}
          onClick={row => {
            this.setState({level: PrimitiveTableLevels.HYPERPARAM, selectedPrimitive: row.primitiveName})
          }}
        />;
      case PrimitiveTableLevels.HYPERPARAM:
        const {data: dataHyperparam, columns: columnsHyperparam} = createHyperparamsTableData(primitiveMetadata, selectedPrimitive);
        return <div>
          <div onClick={()=>{this.setState({level: PrimitiveTableLevels.PRIMITIVE, selectedPrimitive: null})}}>Back</div>
          <Table
            columns={columnsHyperparam}
            data={dataHyperparam}
            onClick={row => {
            }}
          />
        </div>;
      case PrimitiveTableLevels.VALUE:
        return <div/>;
    }
  }
}

PrimitiveTable.propTypes = {
  primitiveMetadata: PropTypes.object.isRequired,
};

PrimitiveTable.defaultProps = {
};

export default PrimitiveTable;
