import React, { Component } from 'react';
import './Sidebar.scss';
import speakers from '../environments/speakers.environment.json';
import music from '../environments/music.environment.json';

class Sidebar extends Component {
    render() {
        return (
            <div className="Sidebar animated slideInLeft">
                <h2 onClick={this.props.home}>Yogi FM</h2>
                <span className="link" onClick={this.props.home}>Home</span>
                <span className="link" onClick={this.props.random}>Random</span>
                <br />
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
                <br />
                <span className="title">MUSIC</span>
                {
                    Object.keys(music).map(key => {
                        const genre = music[key];
                        return (
                            <span 
                                className="link" 
                                key={key}
                                onClick={() => {
                                    this.props.open(key);
                                }}>
                                {genre.name}
                            </span>
                        )
                    })
                }
                <br />
                <span className="footer"><b>Yogi FM</b> | Copyright 2019</span>
                <span className="footer">Developed By <b><a href="https://github.com/jadeallencook" target="_blank">@jadeallencook</a></b></span>
            </div>
        )
    }
}

export default Sidebar;
