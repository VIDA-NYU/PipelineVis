import React, {Component} from "react";
import {Button} from "styled-button-component";
import {Dropdown, DropdownItem, DropdownMenu} from "styled-dropdown-component";
import PropTypes from "prop-types";

export class MyDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hidden: true
    }
  }

  render(){
    const {hidden} = this.state;
    const { buttonText, options } = this.props;
    return <Dropdown>
      <Button dropdownToggle onClick={() => this.setState({hidden: !hidden})}>
        {buttonText}
      </Button>
      <DropdownMenu hidden={hidden} toggle={() => this.setState({hidden: !hidden})}>
        {options.map((option,idx) => <DropdownItem key={idx} onClick={()=>{
          this.setState({hidden: true});
          option.action();
        }}>
          {option.name}
        </DropdownItem>)}
      </DropdownMenu>
    </Dropdown>
  }
}

MyDropdown.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, action: PropTypes.func})),
  buttonText: PropTypes.string,
};