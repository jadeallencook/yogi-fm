import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import './Player.scss';
import YouTube from 'react-youtube';

class Player extends Component {

    constructor() {
        super();
        this.state = {
            playing: false
        }
    }

    lvol(event) {
        event.target.setVolume(100);
    }

    mvol(event) {
        event.target.setVolume(15);
    }

    render() {
        return (
            <div className="Player animated slideInUp">
                <YouTube id="speaker-video" className="speaker-video" videoId={this.props.options.lecture} controls={0} onReady={this.lvol} />
                <div className="controls">
                    <i className="fa fa-backward" onClick={() => {
                        const videos = speakers[this.props.options.speaker].videos;
                        const keys = Object.keys(videos);
                        let index = keys.indexOf(this.props.options.lecture);
                        index = (index - 1 >= 0) ? index - 1 : keys.length - 1;
                        this.props.play(keys[index], true);
                    }}></i>
                    {
                        (!this.state.playing)
                        ?<i className="fa fa-play" onClick={() => {
                            ['music-video', 'speaker-video'].forEach(key => {
                                const video = document.getElementById(key);
                                video.setAttribute('src', video.getAttribute('src') + '&autoplay=1');
                            });
                            this.setState({
                                playing: true
                            });
                        }}></i>
                        :<i className="fa fa-pause" onClick={() => {
                            ['music-video', 'speaker-video'].forEach(key => {
                                const video = document.getElementById(key);
                                video.setAttribute('src', video.getAttribute('src').replace('&autoplay=1',  ''));
                            });
                            this.setState({
                                playing: false
                            });
                        }}></i>
                    }
                    {
                        <YouTube id="mobile-video" className="mobile-video" videoId={this.props.options.lecture} controls={0} onReady={this.lvol} />
                    }
                    <i className="fa fa-forward" onClick={() => {
                        const videos = speakers[this.props.options.speaker].videos;
                        const keys = Object.keys(videos);
                        let index = keys.indexOf(this.props.options.lecture);
                        index = (index + 1 < keys.length) ? index + 1 : 0;
                        this.props.play(keys[index], true);
                    }}></i>
                </div>
                <div className="marquee">
                    {
                        (this.props.options.speaker) 
                        ? <span><b>{speakers[this.props.options.speaker].name}:</b> {speakers[this.props.options.speaker].videos[this.props.options.lecture]}</span>
                        : <span>Click on a speaker to get started...</span>
                    }
                    <span className="mobile">Be patient on mobile, the video is loading...</span>
                </div>
                <YouTube id="music-video" className="music-video" videoId={this.props.options.music} controls={0} onReady={this.mvol} />
            </div>
        )
    }
}

export default Player;
