import React, { Component } from 'react';
import './Sidebar.scss';
import speakers from '../environments/speakers.environment.json';
import YouTube from 'react-youtube';

class Sidebar extends Component {
    controls(event) {
        const player = event.target;
        player.playVideo();
        player.setVolume(100);
    }

    render() {
        return (
            <div className="Sidebar">
                <h2 onClick={this.props.home}>Yogi FM</h2>
                <span className="title">SPEAKERS</span>
                {
                    Object.keys(speakers).map(key => {
                        const speaker = speakers[key];
                        return (
                            <span 
                                className="link" 
                                key={key}
                                onClick={() => {
                                    this.props.open(key);
                                }}>
                                {speaker.name}
                            </span>
                        )
                    })
                }
                {
                    (this.props.lecture)
                    ? <YouTube 
                        videoId={this.props.lecture} 
                        onReady={this.controls} 
                        controls={0}
                        onStateChange={this.controls} />
                    : null
                }
            </div>
        )
    }
}

export default Sidebar;
