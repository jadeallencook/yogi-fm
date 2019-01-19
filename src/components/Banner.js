
    import React, { Component } from 'react';
    import speakers from '../environments/speakers.environment.json';
    import './Banner.scss';

    class Banner extends Component {
        render() {
            return (this.props.speaker) 
            ? <div className="Banner">
                You're listening to
                <h2>{
                    (this.props.speaker) 
                    ? speakers[this.props.speaker].name
                    : null
                }</h2>
                on Yogi Fm...
            </div>
            : <div className="Banner">
                Welcome to
                <h2>Nameste</h2>
                
            </div>
        }
    }

    export default Banner;
    