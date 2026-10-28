import React, { Component } from 'react';
import Banner from './Banner';
import Featured from './Featured';
import './Browse.scss';

class Browse extends Component {
    render() {
        return (
            <div className="Browse animated fadeIn">
                <Banner options={this.props.options} />
                <Featured open={this.props.open} />
            </div>
        )
    }
}

export default Browse;
