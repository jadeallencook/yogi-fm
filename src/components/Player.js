import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import music from '../environments/music.environment.json';
import './Player.scss';
import YouTube from 'react-youtube';

class Player extends Component {

    speakerControls(event) {
        const player = event.target;
        player.playVideo();
        player.setVolume(100);
    }

    musicControls(event) {
        const player = event.target;
        player.playVideo();
        player.setVolume(15);
    }

    render() {
        return (
            <div className="Player animated slideInUp">
                <YouTube className="speaker-video" videoId={this.props.options.lecture} controls={0} onReady={this.speakerControls} onStateChange={this.speakerControls} />
                {/*<div className="controls">
                    <i className="fa fa-backward"></i>
                    <i className="fa fa-play"></i>
                    <i className="fa fa-forward"></i>
                </div>*/}
                {
                    (this.props.options.speaker) 
                    ? <span><b>{speakers[this.props.options.speaker].name}:</b> {speakers[this.props.options.speaker].videos[this.props.options.lecture]}</span>
                    : <span>Click on a speaker to get started...</span>
                }
                <YouTube className="music-video" videoId={this.props.options.music} controls={0} onReady={this.musicControls} onStateChange={this.musicControls} />
            </div>
        )
    }
}

export default Player;
