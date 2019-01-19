import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import './Player.scss';

class Player extends Component {
    render() {
        return (
            <div className="Player">
                <div className="album" style={{
                    backgroundImage: (this.props.speaker) ? `url(${speakers[this.props.speaker].image})` : null
                }}></div>
                {/*<div className="controls">
                    <i className="fa fa-backward"></i>
                    <i className="fa fa-play"></i>
                    <i className="fa fa-forward"></i>
                </div>*/}
                {
                    (this.props.speaker) 
                    ? <span><b>{speakers[this.props.speaker].name}:</b> {speakers[this.props.speaker].videos[this.props.video]}</span>
                    : <span>Click on a speaker to get started...</span>
                }
            </div>
        )
    }
}

export default Player;
