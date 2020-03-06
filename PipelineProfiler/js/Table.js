import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class Table extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const {data, columns, onClick, onHover} = this.props;
    return <table>
        <tbody>
        <tr>
          {columns.map(column => {
            return <th key={column.Header}>{column.Header}</th>
          })}
        </tr>
        {data.map((row, idx) => (
          <tr key={idx} onClick={onClick} onMouseEnter={onHover}>
            {
              columns.map((column,idx) => {
                return <td key={idx}>{column.accessor(row)}</td>
              })
            }
          </tr>
        ))}
        </tbody>
      </table>
  }
}

Table.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    Header: PropTypes.string,
    accessor: PropTypes.func.isRequired,
  })).isRequired,
  onClick: PropTypes.func,
  onHover: PropTypes.func,
};

Table.defaultProps = {
  onClick: () => {},
  onHover: () => {}
};

export default Table;
