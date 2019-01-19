
    import React, { Component } from 'react';
    import Banner from './Banner';
    import Featured from './Featured';
    import './Browse.scss';

    class Browse extends Component {
        render() {
            return (
                <div className="Browse">
                    <Banner speaker={this.props.speaker} />
                    <Featured open={this.props.open} />
                </div>
            )
        }
    }

    export default Browse;
    