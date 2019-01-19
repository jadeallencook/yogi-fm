
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
                <h2>Yogi FM</h2>
                click a speaker to get started...
            </div>
        }
    }

    export default Banner;
    