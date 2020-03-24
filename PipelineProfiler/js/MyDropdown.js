import React, {Component} from "react";
import {Button} from "styled-button-component";
import {Dropdown, DropdownItem, DropdownMenu} from "styled-dropdown-component";
import PropTypes from "prop-types";
import styled from "styled-components";

const Font = styled.div`
  font-size: 12px;
`;


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
        <Font>{buttonText}</Font>
      </Button>
      <DropdownMenu hidden={hidden} toggle={() => this.setState({hidden: !hidden})}>
        {options.map((option,idx) => <DropdownItem key={idx} onClick={()=>{
          this.setState({hidden: true});
          option.action();
        }}>
          <Font>{option.name}</Font>
        </DropdownItem>)}
      </DropdownMenu>
    </Dropdown>
  }
}

MyDropdown.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, action: PropTypes.func})),
  buttonText: PropTypes.string,
};