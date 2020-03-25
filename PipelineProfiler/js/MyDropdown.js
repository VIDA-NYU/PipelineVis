import React, {Component} from "react";
import PropTypes from "prop-types";

import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';


export class MyDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anchorEl: null
    }
  }

  render(){
    const { buttonText, options } = this.props;
    const {anchorEl} = this.state;

    return <div>
      <Button aria-controls="simple-menu" aria-haspopup="true" onClick={(event) => {
        this.setState({anchorEl: event.currentTarget})
      }}>
        {buttonText}
      </Button>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={() => {this.setState({anchorEl: null})}}
      >
        {options.map((option,idx) => <MenuItem key={idx} onClick={()=>{
          this.setState({anchorEl: null});
          option.action();
        }}>
          {option.name}
        </MenuItem>)}
      </Menu>
    </div>
  }
}

MyDropdown.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, action: PropTypes.func})),
  buttonText: PropTypes.string,
};